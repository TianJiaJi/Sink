<script setup lang="ts">
import type { Link } from '@/types'

withDefaults(defineProps<{
  link?: Link | null
}>(), {
  link: null,
})

const analysisStore = useDashboardAnalysisStore()
</script>

<template>
  <h3 v-if="link" class="text-xl/10 font-bold">
    {{ $t('dashboard.stats', { slug: link.slug }) }}
  </h3>
  <DashboardAnalysisCounters />
  <Tabs v-model="analysisStore.viewMode" default-value="trend">
    <div class="mb-4 flex items-center justify-between">
      <TabsList>
        <TabsTrigger value="trend">
          {{ $t('dashboard.trend') }}
        </TabsTrigger>
        <TabsTrigger value="heatmap">
          {{ $t('dashboard.weekly_trend') }}
        </TabsTrigger>
      </TabsList>

      <Select v-if="analysisStore.viewMode === 'heatmap'" v-model="analysisStore.heatmapMetric">
        <SelectTrigger class="h-8 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="visits">
            {{ $t('dashboard.visits') }}
          </SelectItem>
          <SelectItem value="visitors">
            {{ $t('dashboard.visitors') }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <TabsContent value="trend" class="mt-0">
      <DashboardAnalysisViews v-if="analysisStore.viewMode === 'trend'" />
    </TabsContent>
    <TabsContent value="heatmap" class="mt-0">
      <DashboardAnalysisHeatmap v-if="analysisStore.viewMode === 'heatmap'" :metric="analysisStore.heatmapMetric" />
    </TabsContent>
  </Tabs>
  <DashboardAnalysisMetrics />
</template>
