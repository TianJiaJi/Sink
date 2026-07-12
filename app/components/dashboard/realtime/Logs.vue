<script setup lang="ts">
import type { LogEvent } from '@/types'

const trafficEventBus = useTrafficEventBus()

const realtimeStore = useDashboardRealtimeStore()
const logs = shallowRef<LogEvent[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const retryKey = shallowRef(0)
let hasSnapshot = false
let knownIds = new Set<string>()

watch([
  () => realtimeStore.timeName,
  () => JSON.stringify(realtimeStore.filters),
], () => {
  hasSnapshot = false
  knownIds.clear()
})

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
    const data = await useAPI<LogEvent[]>('/api/logs/events', {
      signal: controller.signal,
      query: {
        limit: 100,
        startAt: realtimeStore.timeRange.startAt,
        endAt: realtimeStore.timeRange.endAt,
        ...realtimeStore.filters,
      },
    })
    if (controller.signal.aborted)
      return

    const nextLogs = data ?? []
    if (hasSnapshot) {
      nextLogs
        .filter(item => !knownIds.has(item.id))
        .reverse()
        .forEach(item => trafficEventBus.emit(item))
    }
    knownIds = new Set(nextLogs.map(item => item.id))
    hasSnapshot = true
    logs.value = nextLogs
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
  <section class="lg:w-72" :aria-label="$t('nav.realtime')">
    <div
      v-if="error"
      class="flex h-full items-center justify-center text-sm text-destructive"
      role="alert"
    >
      {{ $t('dashboard.realtime.events_error') }}
      <Button variant="link" @click="retryKey++">
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <div
      v-else-if="loading && !logs.length"
      class="
        flex h-full items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.loading') }}
    </div>
    <div
      v-else-if="!logs.length"
      class="
        flex h-full items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </div>
    <SparkUiAnimatedList v-else class="h-full">
      <SparkUiNotification
        v-for="item in logs"
        :key="item.id"
        :name="item.slug"
        :description="[item.os, item.browser].filter(Boolean).join(' ')"
        :icon="getFlag(item.country || '')"
        :time="item.timestamp"
        class="w-full"
      />
    </SparkUiAnimatedList>
  </section>
</template>
