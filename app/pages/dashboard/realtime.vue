<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const realtimeStore = useDashboardRealtimeStore()
useDashboardRealtimeRouteState()

function handleFilterChange(type: string, value: string) {
  realtimeStore.updateFilter(type, value)
}
</script>

<template>
  <div
    class="
      w-full
      lg:h-full lg:overflow-hidden
    "
  >
    <h1 class="sr-only">
      {{ $t('nav.realtime') }}
    </h1>

    <Teleport to="#dashboard-header-actions" defer>
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardTimePicker />
      <DashboardFilters :filters="realtimeStore.filters" @change="handleFilterChange" />
    </Teleport>

    <DashboardRealtime />
  </div>
</template>
