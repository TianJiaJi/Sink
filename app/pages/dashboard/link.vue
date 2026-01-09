<script setup lang="ts">
import type { Link, LinkUpdateType } from '@/types'
import { LINK_ID_KEY } from '@/composables/injection-keys'

definePageMeta({
  layout: 'dashboard',
})

const slug = useRoute().query.slug

const link = ref<Link | null>(null)
const id = computed(() => link.value?.id)

provide(LINK_ID_KEY, id)

async function getLink() {
  const data = await useAPI<Link>('/api/link/query', {
    query: {
      slug,
    },
  })
  link.value = data
}

function updateLink(_link: Link, type: LinkUpdateType) {
  if (type === 'delete') {
    navigateTo('/dashboard/links', {
      replace: true,
    })
  }
}

onMounted(() => {
  getLink()
})
</script>

<template>
  <main class="space-y-6">
    <DashboardLinksLink
      v-if="link?.id"
      :link="link"
      @update:link="updateLink"
    />
    <DashboardAnalysis
      v-if="link?.id"
      :link="link"
    />
  </main>
</template>
