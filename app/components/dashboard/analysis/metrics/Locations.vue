<script setup lang="ts">
import type { AreaData } from '@/types'
import { VisSingleContainer, VisTopoJSONMap, VisTopoJSONMapSelectors } from '@unovis/vue'
import { useMounted } from '@vueuse/core'
import { ChartTooltip } from '@/components/ui/chart'
import { LINK_ID_KEY } from '@/composables/injection-keys'

const isMounted = useMounted()
const id = inject(LINK_ID_KEY, computed(() => undefined))
const analysisStore = useDashboardAnalysisStore()

const worldMapTopoJSON = ref<Record<string, unknown>>({})
const areaData = ref<AreaData[]>([])

async function getWorldMapJSON() {
  const data = await $fetch('/world.json')
  worldMapTopoJSON.value = data as Record<string, unknown>
}

async function getMapData() {
  areaData.value = []
  const result = await useAPI<{ data: Array<{ name: string, count: number }> }>('/api/stats/metrics', {
    query: {
      type: 'country',
      id: id.value,
      startAt: analysisStore.dateRange.startAt,
      endAt: analysisStore.dateRange.endAt,
      ...analysisStore.filters,
    },
  })
  if (Array.isArray(result.data)) {
    areaData.value = result.data.map(country => ({
      ...country,
      id: country.name,
    }))
  }
}

watch([() => analysisStore.dateRange, () => analysisStore.filters], getMapData, {
  deep: true,
})

onMounted(() => {
  getWorldMapJSON()
  getMapData()
})

const valueFormatter = (v: unknown): string => String(v)
const Tooltip = {
  props: ['title', 'data'],
  setup(props: { title: string, data: Array<{ value: { name?: string, count?: number } }> }) {
    const title = props.data[1]?.value?.name
    const data = [{
      name: props.title,
      value: props.data[3]?.value?.count,
      color: 'black',
    }]
    return () => h(ChartTooltip, { title, data })
  },
}
</script>

<template>
  <Card
    class="
      flex flex-col
      md:h-[500px]
    "
  >
    <CardHeader>
      <CardTitle>{{ $t('dashboard.locations') }}</CardTitle>
    </CardHeader>
    <CardContent class="relative flex-1">
      <VisSingleContainer
        v-if="worldMapTopoJSON.type"
        :data="{ areas: areaData }"
        :style="{ height: isMounted ? '100%' : 'auto', width: '100%' }"
        class="absolute inset-0"
      >
        <VisTopoJSONMap
          :topojson="worldMapTopoJSON"
          map-feature-name="countries"
        />
        <ChartSingleTooltip
          index="id"
          :selector="VisTopoJSONMapSelectors.feature"
          :items="areaData"
          :value-formatter="valueFormatter"
          :custom-tooltip="Tooltip"
        />
      </VisSingleContainer>
    </CardContent>
  </Card>
</template>
