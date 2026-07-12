<script setup lang="ts">
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import { useGlobeColors, useGlobeData, useWebGLGlobe } from '@/composables/globe'

const { t } = useI18n()
const trafficEventBus = useTrafficEventBus()

const containerRef = useTemplateRef('containerRef')
const canvasRef = useTemplateRef('canvasRef')
const { width, height } = useElementSize(containerRef)
const preferredMotion = usePreferredReducedMotion()
const reducedMotion = computed(() => preferredMotion.value === 'reduce')
const instructionsId = useId()
const isLoading = shallowRef(true)
const hasError = shallowRef(false)
let disposed = false
let initializationController: AbortController | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let trafficListening = false

const globeData = useGlobeData()
const { arcColor, colors, countryColorTiers, heatmapColorTiers } = useGlobeColors()

const globe = useWebGLGlobe({
  canvasRef,
  width,
  height,
  countries: globeData.countries,
  locations: globeData.locations,
  countryStats: globeData.countryStats,
  maxCountryVisits: globeData.maxCountryVisits,
  highest: globeData.highest,
  colors,
  countryColorTiers,
  heatmapColorTiers,
  reducedMotion,
})

const trafficEvent = useTrafficEvent({
  colos: globeData.colos,
  arcColor,
  globe: {
    isReady: () => globe.isReady.value,
    drawArc: globe.drawArc,
    drawRipple: globe.drawRipple,
  },
})

function handleTextureError(error: unknown) {
  if (disposed)
    return
  console.error('Failed to update globe texture', error)
  isLoading.value = false
  hasError.value = true
}

const stopTextureWatch = watch([globeData.countryStats, countryColorTiers, heatmapColorTiers, colors, globeData.countries, globeData.locations], () => {
  void globe.updateCountryTexture().catch(handleTextureError)
})

const stopDataErrorWatch = watch(globeData.error, (value) => {
  if (!disposed) {
    hasError.value = value
    if (value)
      isLoading.value = false
  }
})

const stopResizeWatch = watch([width, height], () => {
  if (resizeTimer)
    clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (!disposed)
      globe.updateCanvasSize()
  }, 100)
})

async function initialize() {
  initializationController?.abort()
  globe.destroy()
  if (trafficListening) {
    trafficEventBus.off(trafficEvent.handleTrafficEvent)
    trafficListening = false
  }

  const controller = new AbortController()
  initializationController = controller
  isLoading.value = true
  hasError.value = false

  try {
    await globeData.init(controller.signal)
    if (disposed || controller.signal.aborted)
      return

    const glInitialized = await globe.init(controller.signal)
    if (disposed || controller.signal.aborted)
      return
    if (!glInitialized)
      throw new Error('Failed to initialize WebGL')

    globe.updateCanvasSize()
    await globe.updateCountryTexture()
    if (disposed || controller.signal.aborted)
      return

    const { latitude, longitude } = globeData.currentLocation.value
    const parsedLat = Number(latitude)
    const parsedLng = Number(longitude)
    const targetLat = Number.isFinite(parsedLat) ? parsedLat : 0
    const targetLng = Number.isFinite(parsedLng) ? parsedLng : 0
    globe.setPointOfView(targetLat, targetLng, true)

    if (disposed || controller.signal.aborted)
      return
    globe.startRenderLoop()
    trafficEventBus.on(trafficEvent.handleTrafficEvent)
    trafficListening = true
  }
  catch (error) {
    if (!disposed && !controller.signal.aborted) {
      globe.destroy()
      console.error('Failed to initialize globe', error)
      hasError.value = true
    }
  }
  finally {
    if (!disposed && initializationController === controller)
      isLoading.value = false
  }
}

onMounted(() => {
  void initialize()
})

onBeforeUnmount(() => {
  disposed = true
  initializationController?.abort()
  initializationController = null
  if (resizeTimer)
    clearTimeout(resizeTimer)
  resizeTimer = null
  stopTextureWatch()
  stopDataErrorWatch()
  stopResizeWatch()
  globeData.dispose()
  globe.destroy()
  if (trafficListening)
    trafficEventBus.off(trafficEvent.handleTrafficEvent)
  trafficEvent.cleanup()
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative size-full"
  >
    <p :id="instructionsId" class="sr-only">
      {{ t('dashboard.realtime.globe_instructions') }}
    </p>
    <canvas
      ref="canvasRef"
      class="
        absolute inset-0 touch-pan-y outline-none
        focus-visible:ring-2 focus-visible:ring-ring
      "
      :tabindex="isLoading || hasError ? -1 : 0"
      :aria-hidden="isLoading || hasError"
      :aria-label="t('dashboard.realtime.globe_label')"
      :aria-describedby="instructionsId"
    />
    <div
      v-if="isLoading"
      class="
        absolute inset-0 flex items-center justify-center text-sm
        text-muted-foreground
      "
      role="status"
    >
      {{ t('dashboard.loading') }}
    </div>
    <div
      v-else-if="hasError"
      class="
        absolute inset-0 flex flex-col items-center justify-center gap-2
        text-center text-sm text-muted-foreground
      "
      role="alert"
    >
      <span>{{ t('dashboard.realtime.globe_error') }}</span>
      <Button variant="outline" size="sm" @click="initialize">
        {{ t('common.try_again') }}
      </Button>
    </div>
  </div>
</template>
