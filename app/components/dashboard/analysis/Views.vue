<script setup lang="ts">
import type { ViewDataPoint } from '@/types'
import { AreaChart } from '@/components/ui/chart-area'
import { BarChart } from '@/components/ui/chart-bar'
import { LINK_ID_KEY } from '@/composables/injection-keys'

const props = withDefaults(defineProps<{
  mode?: 'full' | 'simple'
  chartType?: 'area' | 'bar'
  startAt?: number
  endAt?: number
  filters?: Record<string, string>
}>(), {
  mode: 'full',
  chartType: 'area',
})

const views = ref<ViewDataPoint[]>([])
const chart = computed(() => (props.chartType === 'area' && views.value.length > 1) ? AreaChart : BarChart)

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const effectiveTimeRange = computed(() => ({
  startAt: props.startAt ?? analysisStore.dateRange.startAt,
  endAt: props.endAt ?? analysisStore.dateRange.endAt,
}))

const effectiveFilters = computed(() =>
  props.filters ?? analysisStore.filters,
)

const OneHour = 60 * 60
const OneDay = 24 * 60 * 60
function getUnit(startAt: number, endAt: number): 'minute' | 'hour' | 'day' {
  if (startAt && endAt && endAt - startAt <= OneHour)
    return 'minute'

  if (startAt && endAt && endAt - startAt <= OneDay)
    return 'hour'

  return 'day'
}

async function getLinkViews() {
  views.value = []
  const { startAt, endAt } = effectiveTimeRange.value
  const result = await useAPI<{ data: ViewDataPoint[] }>('/api/stats/views', {
    query: {
      id: id.value,
      unit: getUnit(startAt, endAt),
      clientTimezone: getTimeZone(),
      startAt,
      endAt,
      ...effectiveFilters.value,
    },
  })
  views.value = (result.data || []).map((item) => {
    item.visitors = +item.visitors
    item.visits = +item.visits
    return item
  })
}

watch(
  [effectiveTimeRange, effectiveFilters],
  getLinkViews,
  { deep: true },
)

onMounted(async () => {
  getLinkViews()
})

function formatTime(tick: number): string {
  if (Number.isInteger(tick) && views.value[tick]) {
    const { startAt, endAt } = effectiveTimeRange.value
    if (getUnit(startAt, endAt) === 'hour')
      return views.value[tick].time.split(' ')[1] || ''

    return views.value[tick].time
  }
  return ''
}
</script>

<template>
  <Card
    class="
      px-0 py-6
      md:px-6
    "
  >
    <CardTitle
      v-if="mode === 'full'"
      class="
        px-6
        md:px-0
      "
    >
      {{ $t('dashboard.views') }}
    </CardTitle>
    <component
      :is="chart"
      class="h-full w-full"
      index="time"
      :data="views"
      :categories="mode === 'full' ? ['visits', 'visitors'] : ['visits']"
      :x-formatter="formatTime"
      :y-formatter="formatNumber"
      :show-grid-line="mode === 'full'"
      :show-legend="mode === 'full'"
    />
  </Card>
</template>
