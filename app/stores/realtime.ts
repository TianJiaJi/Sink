import { useUrlSearchParams } from '@vueuse/core'
import { safeDestr } from 'destr'

export const useDashboardRealtimeStore = defineStore('dashboard-realtime', () => {
  const searchParams = useUrlSearchParams('history')

  const timeRange = ref({
    startAt: 0,
    endAt: 0,
  })
  const filters = ref<Record<string, string>>({})
  const timeName = ref('')

  function updateTimeRange(range: [number, number], name?: string) {
    timeRange.value.startAt = range[0]
    timeRange.value.endAt = range[1]
    if (name) {
      timeName.value = name
      searchParams.time = name
    }
  }

  function updateFilter(type: string, value: string) {
    filters.value[type] = value
    searchParams.filters = JSON.stringify(filters.value)
  }

  function clearFilters() {
    filters.value = {}
    searchParams.filters = ''
  }

  function restoreFromUrl() {
    try {
      if (searchParams.filters) {
        const restored = safeDestr<Record<string, string>>(searchParams.filters)
        if (restored) {
          Object.entries(restored).forEach(([key, value]) => {
            filters.value[key] = String(value)
          })
        }
      }
    }
    catch (error) {
      console.error('Failed to restore realtime searchParams', error)
    }
  }

  return {
    timeRange,
    timeName,
    filters,
    updateTimeRange,
    updateFilter,
    clearFilters,
    restoreFromUrl,
  }
})
