<script setup lang="ts">
import type { MetricItem } from '@/types'
import { Maximize } from 'lucide-vue-next'

const props = defineProps<{
  type: string
  name: string
}>()

const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const total = ref(0)
const metrics = ref<MetricItem[]>([])
const top10 = ref<MetricItem[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const hasLoaded = shallowRef(false)
const retryKey = shallowRef(0)

interface RawMetricData {
  name: string
  count: number
}

watch([() => analysisStore.dateRange, () => analysisStore.filters, retryKey], async (_values, _oldValues, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false
  try {
    const result = await useAPI<{ data: RawMetricData[] }>('/api/stats/metrics', {
      signal: controller.signal,
      query: {
        ...analysisStore.filters,
        type: props.type,
        id: id.value,
        startAt: analysisStore.dateRange.startAt,
        endAt: analysisStore.dateRange.endAt,
      },
    })
    if (!controller.signal.aborted && Array.isArray(result.data)) {
      total.value = result.data.reduce((acc, cur) => acc + Number(cur.count), 0)
      metrics.value = result.data.map(item => ({
        ...item,
        percent: Math.floor(item.count / total.value * 100) || (item.count ? 1 : 0),
      }))
      top10.value = metrics.value.slice(0, 10)
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
  <Card
    class="
      flex flex-col gap-0 p-0 transition-opacity
      motion-reduce:transition-none
    "
    :class="loading && hasLoaded ? 'opacity-60' : 'opacity-100'"
    :aria-busy="loading"
  >
    <template v-if="error">
      <CardContent
        class="
          flex min-h-40 flex-col items-center justify-center gap-2 text-sm
          text-destructive
        " role="alert"
      >
        <span>{{ $t('dashboard.realtime.stats_error') }}</span>
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
      </CardContent>
    </template>
    <template v-else-if="loading && !hasLoaded">
      <div class="flex h-12 items-center justify-between px-4">
        <Skeleton
          class="h-4 w-32 rounded-full"
        />
        <Skeleton
          class="h-4 w-20 rounded-full"
        />
      </div>
      <div
        v-for="i in 5"
        :key="i"
        class="p-4"
      >
        <Skeleton
          class="h-4 w-full rounded-full"
        />
      </div>
    </template>
    <template v-else-if="metrics.length">
      <CardContent class="p-0">
        <DashboardAnalysisMetricsList
          class="flex-1"
          :metrics="top10"
          :type="type"
        />
      </CardContent>
      <CardFooter class="py-2">
        <ResponsiveModal :title="name" content-class="md:max-w-(--breakpoint-md)">
          <template #trigger>
            <Button variant="link" class="w-full">
              <Maximize aria-hidden="true" class="mr-2 size-4" />
              {{ $t('dashboard.details') }}
            </Button>
          </template>

          <DashboardAnalysisMetricsList
            class="overflow-y-auto"
            :metrics="metrics"
            :type="type"
          />
        </ResponsiveModal>
      </CardFooter>
    </template>
    <CardContent
      v-else-if="loading"
      class="
        flex min-h-40 items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.loading') }}
    </CardContent>
    <CardContent
      v-else
      class="
        flex min-h-40 items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </CardContent>
  </Card>
</template>
