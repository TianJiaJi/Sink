<script setup lang="ts">
import { getLocalTimeZone, now } from '@internationalized/date'

const realtimeStore = useDashboardRealtimeStore()

const showGlobe = ref(false)
const tz = getLocalTimeZone()

function initTimeRange() {
  if (realtimeStore.timeRange.startAt === 0) {
    realtimeStore.updateTimeRange([
      date2unix(now(tz).subtract({ hours: 1 })),
      date2unix(now(tz)),
    ])
  }
}

onBeforeMount(() => {
  realtimeStore.restoreFromUrl()
  initTimeRange()
})

onMounted(() => {
  nextTick(() => {
    showGlobe.value = true
  })
})
</script>

<template>
  <div
    class="
      relative flex w-full flex-col gap-4
      md:block md:h-full
    "
  >
    <DashboardRealtimeChart
      class="
        z-10
        md:absolute md:top-0 md:left-0
      "
    />
    <LazyDashboardRealtimeGlobe
      v-if="showGlobe"
      class="
        aspect-square
        md:absolute md:inset-0 md:aspect-auto
      "
    />
    <DashboardRealtimeLogs
      class="
        z-10 h-[400px]
        md:absolute md:top-0 md:right-0 md:h-full
      "
    />
  </div>
</template>
