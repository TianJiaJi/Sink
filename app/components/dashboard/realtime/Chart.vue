<script setup lang="ts">
import type { CounterData } from '@/types'
import NumberFlow from '@number-flow/vue'
import { MousePointerClick } from 'lucide-vue-next'

provide(LINK_ID_KEY, computed(() => undefined))

const realtimeStore = useDashboardRealtimeStore()
const stats = ref<CounterData>({ visits: 0, visitors: 0, referers: 0 })
const loading = shallowRef(false)
const error = shallowRef(false)
const hasData = shallowRef(false)
const retryKey = shallowRef(0)

watch([
  () => realtimeStore.timeRange.startAt,
  () => realtimeStore.timeRange.endAt,
  () => realtimeStore.filters,
  retryKey,
], async (_values, _oldValues, onCleanup) => {
  if (realtimeStore.timeRange.startAt === 0) {
    return
  }

  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false

  try {
    const result = await useAPI<{ data: CounterData[] }>('/api/stats/counters', {
      signal: controller.signal,
      query: {
        ...realtimeStore.filters,
        startAt: realtimeStore.timeRange.startAt,
        endAt: realtimeStore.timeRange.endAt,
      },
    })
    if (controller.signal.aborted)
      return
    hasData.value = Boolean(result.data?.length)
    stats.value = result.data?.[0] || { visits: 0, visitors: 0, referers: 0 }
  }
  catch {
    if (!controller.signal.aborted)
      error.value = true
  }
  finally {
    if (!controller.signal.aborted)
      loading.value = false
  }
}, { deep: true, immediate: true })
</script>

<template>
  <Card
    class="
      flex h-72 flex-col gap-0 p-4
      lg:m-2 lg:w-80
    "
  >
    <div class="h-24">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 px-0 py-2"
      >
        <h2 class="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden="true"
            class="
              inline-flex size-1.5 rounded-full bg-chart-1
              motion-safe:animate-pulse
            "
          />
          {{ $t('dashboard.visits') }}
        </h2>
        <MousePointerClick
          aria-hidden="true"
          class="size-4 text-muted-foreground"
        />
      </CardHeader>
      <CardContent class="px-0 pb-4">
        <div v-if="loading && !hasData" class="text-sm text-muted-foreground" role="status">
          {{ $t('dashboard.loading') }}
        </div>
        <div
          v-else-if="error" class="
            flex items-center gap-1 text-sm text-destructive
          "
          role="alert"
        >
          {{ $t('dashboard.realtime.stats_error') }}
          <Button
            type="button" variant="link" class="h-auto p-0 text-destructive" @click="retryKey++"
          >
            {{ $t('common.try_again') }}
          </Button>
        </div>
        <div v-else-if="!hasData" class="text-sm text-muted-foreground" role="status">
          {{ $t('dashboard.no_data') }}
        </div>
        <NumberFlow v-else class="text-2xl font-bold tabular-nums" :value="stats.visits" aria-live="polite" />
      </CardContent>
    </div>
    <DashboardAnalysisViews
      class="h-40 w-full border-none p-0! shadow-none"
      mode="simple"
      chart-type="bar"
      :start-at="realtimeStore.timeRange.startAt"
      :end-at="realtimeStore.timeRange.endAt"
      :filters="realtimeStore.filters"
    />
  </Card>
</template>
