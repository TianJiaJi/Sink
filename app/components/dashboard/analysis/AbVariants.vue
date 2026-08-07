<script setup lang="ts">
import type { Link } from '@/types'
import { LoaderCircle } from '@lucide/vue'

const props = defineProps<{ link: Link }>()
const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const loading = shallowRef(false)
const error = shallowRef(false)
const countsByUrl = ref<Record<string, number>>({})
const retryKey = shallowRef(0)

watch([() => analysisStore.dateRange, () => analysisStore.filters, retryKey], async (_v, _o, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = false
  try {
    const result = await useAPI<{ data: { name: string, count: number }[] }>('/api/stats/metrics', {
      signal: controller.signal,
      query: {
        ...analysisStore.filters,
        type: 'url',
        id: id.value,
        startAt: analysisStore.dateRange.startAt,
        endAt: analysisStore.dateRange.endAt,
      },
    })
    if (!controller.signal.aborted && Array.isArray(result.data))
      countsByUrl.value = Object.fromEntries(result.data.map(r => [r.name, Number(r.count)]))
  }
  catch {
    if (!controller.signal.aborted)
      error.value = true
  }
  finally {
    if (!controller.signal.aborted)
      loading.value = false
  }
}, { immediate: true })

const totalClicks = computed(() => props.link.ab?.reduce((acc, v) => acc + (countsByUrl.value[v.url] ?? 0), 0) ?? 0)
const totalWeight = computed(() => props.link.ab?.reduce((acc, v) => acc + v.weight, 0) ?? 0)

const rows = computed(() => (props.link.ab ?? []).map((v, i) => ({
  url: v.url,
  clicks: countsByUrl.value[v.url] ?? 0,
  configuredPct: totalWeight.value ? Math.round(v.weight / totalWeight.value * 100) : 0,
  actualPct: totalClicks.value ? Math.round((countsByUrl.value[v.url] ?? 0) / totalClicks.value * 100) : 0,
  color: `var(--chart-${(i % 5) + 1})`,
})))
</script>

<template>
  <Card size="sm">
    <CardContent class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">
          {{ $t('links.ab_variants') }}
        </h3>
        <span class="text-xs text-muted-foreground">{{ $t('dashboard.visits') }}: {{ totalClicks }}</span>
      </div>
      <template v-if="error">
        <div
          class="
            flex items-center justify-center gap-2 py-6 text-sm text-destructive
          "
        >
          <span>{{ $t('dashboard.realtime.stats_error') }}</span>
          <Button variant="link" size="sm" class="text-destructive" @click="retryKey++">
            {{ $t('common.try_again') }}
          </Button>
        </div>
      </template>
      <template v-else-if="loading">
        <div
          class="
            flex items-center justify-center py-6 text-sm text-muted-foreground
          "
        >
          <LoaderCircle
            class="
              size-5
              motion-safe:animate-spin
            " aria-hidden="true"
          />
        </div>
      </template>
      <template v-else>
        <div v-for="row in rows" :key="row.url" class="space-y-1.5">
          <div class="flex items-center justify-between gap-2 text-xs">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="
                truncate text-primary
                hover:underline
              "
            >{{ row.url }}</a>
            <span class="shrink-0 text-muted-foreground tabular-nums">{{ row.clicks }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full" :style="{ width: `${row.actualPct}%`, background: row.color }" />
            </div>
            <span
              class="
                w-24 shrink-0 text-right text-xs text-muted-foreground
                tabular-nums
              "
            >
              {{ row.actualPct }}% / {{ row.configuredPct }}%
            </span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ $t('links.actual_weight_hint') }}
        </p>
      </template>
    </CardContent>
  </Card>
</template>
