<script setup lang="ts">
import type { CounterData } from '@/types'
import NumberFlow from '@number-flow/vue'
import { Flame, MousePointerClick, Users } from 'lucide-vue-next'

const defaultData: CounterData = Object.freeze({
  visits: 0,
  visitors: 0,
  referers: 0,
})

const counters = ref<CounterData>(defaultData)

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

watch([() => analysisStore.dateRange, () => analysisStore.filters], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  counters.value = defaultData
  try {
    const result = await useAPI<{ data: CounterData[] }>('/api/stats/counters', {
      signal: controller.signal,
      query: {
        ...analysisStore.filters,
        id: id.value,
        startAt: analysisStore.dateRange.startAt,
        endAt: analysisStore.dateRange.endAt,
      },
    })
    if (!controller.signal.aborted)
      counters.value = result.data?.[0] ?? defaultData
  }
  catch (error) {
    if (!controller.signal.aborted)
      console.error(error)
  }
}, { deep: true, immediate: true })
</script>

<template>
  <div
    class="
      grid gap-4
      sm:grid-cols-3 sm:gap-3
      lg:gap-4
    "
  >
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.visits') }}
        </CardTitle>
        <MousePointerClick
          aria-hidden="true" class="size-4 text-muted-foreground"
        />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.visits }" :value="counters.visits" />
      </CardContent>
    </Card>
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.visitors') }}
        </CardTitle>
        <Users aria-hidden="true" class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.visitors }" :value="counters.visitors" />
      </CardContent>
    </Card>
    <Card class="gap-0">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">
          {{ $t('dashboard.referers') }}
        </CardTitle>
        <Flame aria-hidden="true" class="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <NumberFlow class="text-2xl font-bold tabular-nums" :class="{ 'opacity-60 blur-md': !counters.referers }" :value="counters.referers" />
      </CardContent>
    </Card>
  </div>
</template>
