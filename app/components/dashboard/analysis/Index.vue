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
  <h2 v-if="link" class="text-xl/10 font-bold">
    {{ $t('dashboard.stats', { slug: link.slug }) }}
  </h2>
  <DashboardAnalysisCounters />
  <Tabs v-model="analysisStore.viewMode" default-value="trend">
    <div class="mb-4 flex items-center justify-between">
      <TabsList
        class="
          min-h-11
          lg:min-h-8
        "
      >
        <TabsTrigger
          value="trend" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('dashboard.trend') }}
        </TabsTrigger>
        <TabsTrigger
          value="heatmap" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('dashboard.weekly_trend') }}
        </TabsTrigger>
      </TabsList>

      <Select v-if="analysisStore.viewMode === 'heatmap'" v-model="analysisStore.heatmapMetric">
        <SelectTrigger
          class="
            h-11 min-h-11 w-[120px]
            lg:h-8 lg:min-h-8
          "
          :aria-label="`${$t('dashboard.weekly_trend')}: ${$t('dashboard.visits')} / ${$t('dashboard.visitors')}`"
        >
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
