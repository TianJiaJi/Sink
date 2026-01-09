<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

provide('id', ref())
</script>

<template>
  <main class="space-y-6">
    <DashboardAnalysis />
  </main>
</template>
