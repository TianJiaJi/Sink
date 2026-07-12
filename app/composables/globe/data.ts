import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { AreaData, ColoData, CurrentLocation, GeoJSONData, LocationData } from '@/types'
import { watchDeep } from '@vueuse/core'
import { computed, ref, shallowRef } from 'vue'
import { useAPI } from '@/utils/api'
import { useDashboardRealtimeStore } from '../realtime'

interface RawLocationData {
  latitude: number
  longitude: number
  count: string | number
}

export interface GlobeDataState {
  countries: ShallowRef<GeoJSONData>
  locations: ShallowRef<LocationData[]>
  colos: ShallowRef<Record<string, ColoData>>
  currentLocation: Ref<CurrentLocation>
  countryStats: ShallowRef<Map<string, number>>
  highest: ComputedRef<number>
  maxCountryVisits: ComputedRef<number>
  error: ShallowRef<boolean>
  dispose: () => void
}

export function useGlobeData() {
  const realtimeStore = useDashboardRealtimeStore()

  const countries = shallowRef<GeoJSONData>({ features: [] })
  const locations = shallowRef<LocationData[]>([])
  const colos = shallowRef<Record<string, ColoData>>({})
  const currentLocation = ref<CurrentLocation>({})
  const countryStats = shallowRef<Map<string, number>>(new Map())
  const error = shallowRef(false)

  let requestVersion = 0
  let initController: AbortController | null = null
  let refreshController: AbortController | null = null
  let disposed = false

  const getBaseQuery = () => ({
    ...realtimeStore.filters,
    startAt: realtimeStore.timeRange.startAt,
    endAt: realtimeStore.timeRange.endAt,
  })

  const highest = computed(() => Math.max(...locations.value.map(l => l.count), 1))
  const maxCountryVisits = computed(() => Math.max(...countryStats.value.values(), 1))

  function createController(signal?: AbortSignal) {
    const controller = new AbortController()
    if (signal) {
      if (signal.aborted)
        controller.abort(signal.reason)
      else
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
    }
    return controller
  }

  const isStale = (version: number, signal: AbortSignal) => disposed || signal.aborted || version !== requestVersion

  async function getGlobeJSON(signal: AbortSignal) {
    return await $fetch<GeoJSONData>('/countries.geojson', { signal })
  }

  async function getColosJSON(signal: AbortSignal) {
    return await $fetch<Record<string, ColoData>>('/colos.json', { signal })
  }

  async function getCurrentLocation(signal: AbortSignal) {
    return await useAPI<CurrentLocation>('/api/location', { signal })
  }

  async function getCountryStats(signal: AbortSignal) {
    const result = await useAPI<{ data: AreaData[] }>('/api/stats/metrics', {
      signal,
      query: {
        ...getBaseQuery(),
        type: 'country',
      },
    })

    const statsMap = new Map<string, number>()
    if (Array.isArray(result.data)) {
      result.data.forEach((item) => {
        statsMap.set(item.name, item.count)
      })
    }
    return statsMap
  }

  async function getLiveLocations(signal: AbortSignal) {
    const result = await useAPI<{ data: RawLocationData[] }>('/api/logs/locations', {
      signal,
      query: {
        ...getBaseQuery(),
      },
    })

    return result.data?.map(e => ({
      lat: e.latitude,
      lng: e.longitude,
      count: +e.count,
    })) || []
  }

  async function getRealtimeSnapshot(signal: AbortSignal): Promise<[LocationData[], Map<string, number>]> {
    const [locationsResult, statsResult] = await Promise.allSettled([
      getLiveLocations(signal),
      getCountryStats(signal),
    ])

    if (signal.aborted)
      throw signal.reason
    if (locationsResult.status === 'rejected' && statsResult.status === 'rejected')
      throw locationsResult.reason

    return [
      locationsResult.status === 'fulfilled' ? locationsResult.value : locations.value,
      statsResult.status === 'fulfilled' ? statsResult.value : countryStats.value,
    ]
  }

  async function init(signal?: AbortSignal) {
    disposed = false
    initController?.abort()
    refreshController?.abort()
    const controller = createController(signal)
    initController = controller
    const version = ++requestVersion
    const requestSignal = controller.signal
    error.value = false

    const optionalLocation = getCurrentLocation(requestSignal).catch(() => currentLocation.value)
    const [nextCountries, nextColos, nextLocation, [nextLocations, nextStats]] = await Promise.all([
      getGlobeJSON(requestSignal),
      getColosJSON(requestSignal),
      optionalLocation,
      getRealtimeSnapshot(requestSignal),
    ])

    if (isStale(version, requestSignal))
      return

    countries.value = nextCountries
    colos.value = nextColos
    currentLocation.value = nextLocation
    locations.value = nextLocations
    countryStats.value = nextStats
  }

  async function refresh() {
    refreshController?.abort()
    const controller = createController()
    refreshController = controller
    const version = ++requestVersion
    const signal = controller.signal
    try {
      const [nextLocations, nextStats] = await getRealtimeSnapshot(signal)

      if (isStale(version, signal))
        return

      locations.value = nextLocations
      countryStats.value = nextStats
      error.value = false
    }
    catch {
      if (!isStale(version, signal))
        error.value = true
    }
  }

  const stopDataWatch = watchDeep([() => realtimeStore.timeRange, () => realtimeStore.filters], () => {
    void refresh()
  })

  function dispose() {
    disposed = true
    requestVersion++
    initController?.abort()
    refreshController?.abort()
    initController = null
    refreshController = null
    stopDataWatch()
  }

  return {
    countries,
    locations,
    colos,
    currentLocation,
    countryStats,
    error,
    highest,
    maxCountryVisits,
    init,
    refresh,
    dispose,
  }
}
