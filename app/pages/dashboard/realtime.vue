<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'

definePageMeta({
  layout: 'dashboard',
})

const realtimeStore = useDashboardRealtimeStore()
const isPaused = shallowRef(false)
provide(REALTIME_PAUSED_KEY, isPaused)
useDashboardRealtimeRouteState()

function handleFilterChange(type: string, value: string) {
  realtimeStore.updateFilter(type, value)
}
</script>

<template>
  <main
    class="
      w-full
      lg:h-full lg:overflow-hidden
    "
  >
    <h1 class="sr-only">
      {{ $t('nav.realtime') }}
    </h1>

    <Teleport to="#dashboard-header-actions" defer>
      <Button
        type="button"
        variant="outline"
        class="
          min-h-11
          lg:min-h-9
        "
        :aria-label="$t(isPaused ? 'ux.realtime.resume' : 'ux.realtime.pause')"
        :aria-pressed="isPaused"
        @click="isPaused = !isPaused"
      >
        <Play v-if="isPaused" aria-hidden="true" />
        <Pause v-else aria-hidden="true" />
        {{ $t(isPaused ? 'ux.realtime.resume' : 'ux.realtime.pause') }}
      </Button>
      <DashboardTimePicker />
      <DashboardFilters :filters="realtimeStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardRealtime />
  </main>
</template>
