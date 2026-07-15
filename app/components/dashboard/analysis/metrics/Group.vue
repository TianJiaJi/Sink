<script setup lang="ts">
defineProps<{
  tabs: readonly string[]
  rawTabs: readonly string[]
}>()
</script>

<template>
  <Tabs
    :default-value="rawTabs[0]"
    class="flex flex-col"
  >
    <div class="max-w-full overflow-x-auto p-1">
      <TabsList class="min-w-max">
        <TabsTrigger
          v-for="(tab, index) in tabs"
          :key="tab"
          :value="rawTabs[index]!"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent
      v-for="(tab, index) in tabs"
      :key="tab"
      :value="rawTabs[index]!"
      class="flex-1"
    >
      <DashboardAnalysisMetricsMetric
        :type="rawTabs[index]!"
        :name="tab"
        class="h-full"
      />
    </TabsContent>
  </Tabs>
</template>
