<script setup lang="ts">
import type { LogEvent } from '@/types'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { appendPendingEvents, selectReplayEvents } from '@/utils/realtime-log-queue'

const INITIAL_REPLAY_LIMIT = 20
const MAX_VISIBLE_LOGS = 100
const MAX_PENDING_LOGS = 100
const MAX_KNOWN_LOGS = 1000
const REPLAY_INTERVAL = 1000

const trafficEventBus = useTrafficEventBus()

const realtimeStore = useDashboardRealtimeStore()
const visibility = useDocumentVisibility()
const logs = shallowRef<LogEvent[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const retryKey = shallowRef(0)
const hasSnapshot = shallowRef(false)
const knownIds = new Set<string>()
let knownIdQueue: string[] = []
let pendingLogs: LogEvent[] = []
let fetchController: AbortController | null = null
let fetchRunning = false
let fetchQueued = false
let fetchVersion = 0
let disposed = false

const { pause, resume } = useIntervalFn(() => playNext(), REPLAY_INTERVAL, { immediate: false })

function playNext() {
  if (visibility.value !== 'visible') {
    pause()
    return
  }

  const event = pendingLogs.shift()
  if (!event) {
    pause()
    return
  }

  logs.value = [event, ...logs.value.filter(log => log.id !== event.id)].slice(0, MAX_VISIBLE_LOGS)
  trafficEventBus.emit(event)

  if (!pendingLogs.length)
    pause()
}

function enqueueEvents(events: LogEvent[]) {
  pendingLogs = appendPendingEvents(pendingLogs, events, MAX_PENDING_LOGS)
  if (!pendingLogs.length || visibility.value !== 'visible')
    return

  if (!logs.value.length)
    playNext()
  if (pendingLogs.length)
    resume()
}

function rememberEvents(events: LogEvent[]) {
  for (const event of events) {
    if (knownIds.has(event.id))
      continue
    knownIds.add(event.id)
    knownIdQueue.push(event.id)
  }

  while (knownIdQueue.length > MAX_KNOWN_LOGS) {
    const id = knownIdQueue.shift()
    if (id)
      knownIds.delete(id)
  }
}

function resetReplay() {
  pause()
  logs.value = []
  pendingLogs = []
  hasSnapshot.value = false
  knownIds.clear()
  knownIdQueue = []
  fetchVersion++
  fetchController?.abort()
}

watch([
  () => realtimeStore.timeName,
  () => JSON.stringify(realtimeStore.filters),
], () => {
  resetReplay()
})

watch(visibility, (state) => {
  if (state === 'hidden') {
    pause()
    return
  }
  if (pendingLogs.length) {
    pendingLogs = pendingLogs.slice(-INITIAL_REPLAY_LIMIT)
    resume()
  }
})

async function fetchLogs() {
  if (fetchRunning) {
    fetchQueued = true
    return
  }

  if (realtimeStore.timeRange.startAt === 0) {
    return
  }

  fetchRunning = true
  try {
    for (;;) {
      if (disposed)
        break
      fetchQueued = false
      const version = fetchVersion
      const controller = new AbortController()
      fetchController = controller
      loading.value = true
      error.value = false

      try {
        const data = await useAPI<LogEvent[]>('/api/logs/events', {
          signal: controller.signal,
          query: {
            ...realtimeStore.filters,
            limit: 100,
            startAt: realtimeStore.timeRange.startAt,
            endAt: realtimeStore.timeRange.endAt,
          },
        })
        if (!controller.signal.aborted && version === fetchVersion) {
          const { startAt, endAt } = realtimeStore.timeRange
          const nextLogs = (data ?? []).filter(event => event.timestamp >= startAt && event.timestamp <= endAt)
          const replayEvents = selectReplayEvents(
            nextLogs,
            hasSnapshot.value ? knownIds : undefined,
            INITIAL_REPLAY_LIMIT,
          )
          rememberEvents(nextLogs)
          hasSnapshot.value = true
          enqueueEvents(replayEvents)
        }
      }
      catch {
        if (!controller.signal.aborted && version === fetchVersion)
          error.value = true
      }
      finally {
        if (fetchController === controller)
          fetchController = null
        if (version === fetchVersion)
          loading.value = false
      }
      if (!fetchQueued)
        break
    }
  }
  finally {
    fetchRunning = false
  }
}

watch([
  () => realtimeStore.timeRange.startAt,
  () => realtimeStore.timeRange.endAt,
  () => realtimeStore.filters,
  retryKey,
], () => void fetchLogs(), { deep: true, immediate: true })

onBeforeUnmount(() => {
  disposed = true
  fetchVersion++
  fetchController?.abort()
  pause()
})
</script>

<template>
  <section class="lg:w-72" :aria-label="$t('nav.realtime')">
    <div
      v-if="error && !logs.length"
      class="flex h-full items-center justify-center text-sm text-destructive"
      role="alert"
    >
      {{ $t('dashboard.realtime.events_error') }}
      <Button variant="link" @click="retryKey++">
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <div
      v-else-if="loading && !hasSnapshot"
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
    <SparkUiAnimatedList
      v-else
      class="h-full"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
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
