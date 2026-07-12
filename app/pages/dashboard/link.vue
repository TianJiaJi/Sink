<script setup lang="ts">
import type { Link } from '@/types'

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const router = useRouter()
const slug = computed(() => parseDashboardSlug(route.query.slug))
const linksStore = useDashboardLinksStore()
useDashboardAnalysisRouteState({ detail: true })

const link = ref<Link | null>(null)
const id = computed(() => link.value?.id)

provide(LINK_ID_KEY, id)

watch(slug, async (currentSlug, _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  link.value = null
  if (!currentSlug) {
    await navigateTo('/dashboard/links', { replace: true })
    return
  }

  try {
    const data = await useAPI<Link>('/api/link/query', {
      signal: controller.signal,
      query: { slug: currentSlug },
    })
    if (!controller.signal.aborted)
      link.value = data
  }
  catch (error) {
    if (controller.signal.aborted)
      return
    console.error(error)
    await navigateTo('/dashboard/links', { replace: true })
  }
}, { immediate: true })

linksStore.onLinkUpdate(({ link: updatedLink, type }) => {
  if (updatedLink.id !== link.value?.id)
    return

  if (type === 'delete') {
    navigateTo('/dashboard/links', { replace: true })
  }
  else if (type === 'edit') {
    link.value = updatedLink
    if (updatedLink.slug !== slug.value)
      void router.replace(getDashboardLinkDetailLocation(updatedLink.slug, route.query))
  }
})
</script>

<template>
  <main class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardDatePicker />
    </Teleport>

    <DashboardLinksLink
      v-if="link?.id"
      :link="link"
    />
    <DashboardAnalysis
      v-if="link?.id"
      :link="link"
    />
  </main>
</template>
