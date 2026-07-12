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
const loading = shallowRef(false)
const error = shallowRef(false)
const hasLoaded = shallowRef(false)
const retryKey = shallowRef(0)

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

watch([() => analysisStore.dateRange, () => analysisStore.filters, retryKey], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false
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
    if (!controller.signal.aborted) {
      counters.value = result.data?.[0] ?? defaultData
      hasLoaded.value = true
    }
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
  <Alert v-if="error" variant="destructive">
    <AlertTitle>{{ $t('dashboard.realtime.stats_error') }}</AlertTitle>
    <AlertDescription>
      <Button
        type="button"
        variant="link"
        class="
          h-11 px-3 text-destructive
          lg:h-auto lg:min-h-0 lg:p-0
        "
        @click="retryKey++"
      >
        {{ $t('common.try_again') }}
      </Button>
    </AlertDescription>
  </Alert>
  <div
    v-else
    :aria-busy="loading"
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
        <Skeleton v-if="loading && !hasLoaded" class="h-8 w-20" />
        <NumberFlow v-else class="text-2xl font-bold tabular-nums" :value="counters.visits" />
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
        <Skeleton v-if="loading && !hasLoaded" class="h-8 w-20" />
        <NumberFlow v-else class="text-2xl font-bold tabular-nums" :value="counters.visitors" />
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
        <Skeleton v-if="loading && !hasLoaded" class="h-8 w-20" />
        <NumberFlow v-else class="text-2xl font-bold tabular-nums" :value="counters.referers" />
      </CardContent>
    </Card>
  </div>
</template>
