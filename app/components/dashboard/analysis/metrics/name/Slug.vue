<script setup lang="ts">
const props = defineProps<{
  name?: string
}>()

const route = useRoute()
const detailLocation = computed(() => props.name
  ? getDashboardLinkDetailLocation(props.name, route.query)
  : { path: route.path, query: route.query })
</script>

<template>
  <NuxtLink
    :to="detailLocation"
    class="inline-flex w-full items-center justify-start"
  >
    <span class="w-full truncate">{{ name }}</span>
  </NuxtLink>
</template>
