import type { DashboardSlugFilters, RealtimeQueryState } from '@/utils/dashboard-query'
import { getLocalTimeZone, now } from '@internationalized/date'
import { ref } from 'vue'
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

function computeTimeRange(name: RealtimeQueryState['window']): [number, number] {
  const tz = getLocalTimeZone()
  const currentTime = now(tz)
  const preset = TIME_PRESETS[name]

  if (preset === 'today') {
    return [date2unix(currentTime, 'start'), date2unix(currentTime)]
  }

  return [date2unix(currentTime.subtract(preset)), date2unix(currentTime)]
}

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const timeRange = ref({ startAt: 0, endAt: 0 })
  const timeName = ref<RealtimeQueryState['window']>('last-1h')
  const filters = ref<DashboardSlugFilters>({})

  function selectPreset(name: RealtimeQueryState['window']) {
    timeName.value = name
    const [start, end] = computeTimeRange(name)
    timeRange.value = { startAt: start, endAt: end }
  }

  function updateFilter(type: string, value: string) {
    if (type !== 'slug')
      return

    const slugs = [...new Set(value.split(',').map(slug => slug.trim()).filter(Boolean))]
    filters.value = slugs.length ? { slug: slugs.join(',') } : {}
  }

  function clearFilters() {
    filters.value = {}
  }

  function applyRouteState(state: RealtimeQueryState) {
    selectPreset(state.window)
    filters.value = state.slugs.length ? { slug: state.slugs.join(',') } : {}
  }

  return {
    timeRange,
    timeName,
    filters,
    selectPreset,
    updateFilter,
    clearFilters,
    applyRouteState,
  }
})
