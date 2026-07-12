import { getLocalTimeZone, now } from '@internationalized/date'
import { safeDestr } from 'destr'
import { ref, watch } from 'vue'
import { defineStore } from '#imports'
import { date2unix } from '@/utils/time'

const TIME_PRESETS = {
  'today': 'today',
  'last-5m': { minutes: 5 },
  'last-10m': { minutes: 10 },
  'last-30m': { minutes: 30 },
  'last-1h': { hours: 1 },
  'last-6h': { hours: 6 },
  'last-12h': { hours: 12 },
  'last-24h': { hours: 24 },
} as const

type TimePreset = keyof typeof TIME_PRESETS

function computeTimeRange(name: TimePreset): [number, number] {
  const tz = getLocalTimeZone()
  const currentTime = now(tz)
  const preset = TIME_PRESETS[name]

  if (preset === 'today') {
    return [date2unix(currentTime, 'start'), date2unix(currentTime)]
  }

  return [date2unix(currentTime.subtract(preset)), date2unix(currentTime)]
}

function normalizePreset(value: unknown): TimePreset {
  return typeof value === 'string' && Object.hasOwn(TIME_PRESETS, value) ? value as TimePreset : 'last-1h'
}

function parseFilters(value: unknown): Record<string, string> {
  if (typeof value !== 'string' || !value)
    return {}

  const restored = safeDestr<unknown>(value)
  if (!restored || typeof restored !== 'object' || Array.isArray(restored))
    return {}

  return Object.fromEntries(
    Object.entries(restored).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const route = useRoute()
  const router = useRouter()
  let syncingFromRoute = false

  const timeRange = ref({ startAt: 0, endAt: 0 })
  const timeName = ref<TimePreset>('last-1h')
  const filters = ref<Record<string, string>>({})

  function selectPreset(name: string) {
    const preset = normalizePreset(name)
    timeName.value = preset
    const [start, end] = computeTimeRange(preset)
    timeRange.value.startAt = start
    timeRange.value.endAt = end
  }

  function updateFilter(type: string, value: string) {
    if (value)
      filters.value[type] = value
    else
      delete filters.value[type]
  }

  function clearFilters() {
    filters.value = {}
  }

  function init() {
    if (route.path !== '/dashboard/realtime')
      return

    syncingFromRoute = true
    selectPreset(normalizePreset(route.query.time))
    filters.value = parseFilters(route.query.filters)
    syncingFromRoute = false
  }

  watch(timeName, (val) => {
    if (syncingFromRoute || route.path !== '/dashboard/realtime' || route.query.time === val)
      return
    void router.replace({ query: { ...route.query, time: val } })
  })

  watch(filters, (val) => {
    if (syncingFromRoute || route.path !== '/dashboard/realtime')
      return
    const serialized = Object.keys(val).length ? JSON.stringify(val) : undefined
    if (route.query.filters !== serialized)
      void router.replace({ query: { ...route.query, filters: serialized } })
  }, { deep: true })

  watch(
    () => [route.path, route.query.time, route.query.filters],
    init,
  )

  return {
    timeRange,
    timeName,
    filters,
    selectPreset,
    updateFilter,
    clearFilters,
    init,
  }
})
