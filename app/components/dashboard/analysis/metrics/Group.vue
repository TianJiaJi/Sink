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
    <TabsList
      class="
        min-h-11 w-fit
        lg:min-h-8
      "
    >
      <TabsTrigger
        v-for="(tab, index) in tabs"
        :key="tab"
        :value="rawTabs[index]!"
        class="
          min-h-11
          lg:min-h-0
        "
      >
        {{ tab }}
      </TabsTrigger>
    </TabsList>
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
