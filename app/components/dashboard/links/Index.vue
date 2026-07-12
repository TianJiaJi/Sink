<script setup lang="ts">
import type { CounterData, LinkUpdateType } from '@/types'
import type { DashboardLink, DashboardLinkListResponse } from '@/types/dashboard-links'
import { useInfiniteScroll } from '@vueuse/core'
import { AlertCircle, Inbox, Loader } from 'lucide-vue-next'

const linksStore = useDashboardLinksStore()

const links = ref<DashboardLink[]>([])
const listComplete = ref(false)
const listError = ref(false)
const listLoading = ref(false)
const limit = 24
let cursor = ''
let requestGeneration = 0

const countersMap = ref<Record<string, CounterData>>({})
provide('linksCountersMap', countersMap)

const pendingIds = new Set<string>()
const defaultCounters: CounterData = Object.freeze({ visits: 0, visitors: 0, referers: 0 })

async function fetchCounters(ids: string[]) {
  if (!ids.length)
    return
  ids.forEach(id => pendingIds.add(id))
  try {
    const result = await useAPI<{ data: (CounterData & { id: string })[] }>('/api/stats/counters', {
      query: { id: ids.join(',') },
    })
    for (const item of result.data ?? []) {
      countersMap.value[item.id] = {
        visits: item.visits,
        visitors: item.visitors,
        referers: item.referers,
      }
    }
  }
  catch (error) {
    console.error('Failed to fetch counters:', error)
  }
  finally {
    for (const id of ids) {
      if (!countersMap.value[id])
        countersMap.value[id] = { ...defaultCounters }
      pendingIds.delete(id)
    }
  }
}

const scrollContainer = ref<HTMLElement | Window | null>(null)

onMounted(() => {
  scrollContainer.value = document.querySelector('.overflow-y-auto') as HTMLElement | null
  void getLinks()
})

async function getLinks() {
  if (listLoading.value || listComplete.value)
    return

  const generation = requestGeneration
  const requestCursor = cursor
  listLoading.value = true
  try {
    const data = await useAPI<DashboardLinkListResponse>('/api/link/list', {
      query: {
        limit,
        cursor: requestCursor,
        sort: linksStore.sortBy,
        status: linksStore.status,
        tag: linksStore.tag,
      },
    })

    if (generation !== requestGeneration)
      return

    const newLinks = data.links.filter(Boolean)
    const existingSlugs = new Set(links.value.map(link => link.slug))
    links.value = links.value.concat(newLinks.filter(link => !existingSlugs.has(link.slug)))
    cursor = data.cursor
    listComplete.value = data.list_complete
    listError.value = false

    const ids = newLinks.map(l => l.id).filter(id => !countersMap.value[id] && !pendingIds.has(id))
    fetchCounters(ids)
  }
  catch (error) {
    if (generation !== requestGeneration)
      return
    console.error(error)
    listError.value = true
  }
  finally {
    if (generation === requestGeneration)
      listLoading.value = false
  }
}

function resetAndLoad() {
  requestGeneration++
  links.value = []
  cursor = ''
  listComplete.value = false
  listError.value = false
  listLoading.value = false
  void getLinks()
}

useInfiniteScroll(
  scrollContainer as unknown as Ref<HTMLElement | null>,
  getLinks,
  {
    distance: 150,
    interval: 1000,
    canLoadMore: () => {
      return !listError.value && !listComplete.value
    },
  },
)

watch(
  [() => linksStore.sortBy, () => linksStore.status, () => linksStore.tag],
  resetAndLoad,
)

function matchesCurrentFilters(link: DashboardLink) {
  const isExpired = Boolean(link.expiration && link.expiration <= Math.floor(Date.now() / 1000))
  return (linksStore.status === 'expired') === isExpired
    && (!linksStore.tag || link.tags?.includes(linksStore.tag))
}

function updateLinkList(link: DashboardLink, type: LinkUpdateType) {
  if (type === 'edit') {
    const index = links.value.findIndex(l => l.slug === link.slug)
    if (index >= 0 && matchesCurrentFilters(link))
      links.value[index] = link
    else if (index >= 0)
      links.value.splice(index, 1)
  }
  else if (type === 'delete') {
    const index = links.value.findIndex(l => l.slug === link.slug)
    if (index >= 0)
      links.value.splice(index, 1)
  }
  else {
    if (!matchesCurrentFilters(link))
      return

    if (linksStore.sortBy !== 'newest') {
      linksStore.sortBy = 'newest'
      return
    }

    links.value = [link, ...links.value.filter(item => item.slug !== link.slug)]
  }
}

linksStore.onLinkUpdate(({ link, type }) => {
  updateLinkList(link, type)
})
</script>

<template>
  <section
    v-if="links.length"
    class="
      grid grid-cols-1 gap-4
      md:grid-cols-2
      lg:grid-cols-3
    "
  >
    <DashboardLinksLink
      v-for="link in links"
      :key="link.slug"
      :link="link"
    />
  </section>
  <section
    v-else-if="listLoading"
    class="
      grid grid-cols-1 gap-4
      md:grid-cols-2
      lg:grid-cols-3
    "
    role="status"
    aria-live="polite"
  >
    <Card v-for="index in 6" :key="index" class="h-48">
      <CardContent class="flex h-full flex-col gap-4">
        <div class="flex items-center gap-3">
          <Skeleton class="size-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton class="mt-auto h-5 w-full" />
        <Skeleton class="h-5 w-1/2" />
      </CardContent>
    </Card>
    <span class="sr-only">{{ $t('dashboard.loading') }}</span>
  </section>
  <div
    v-if="listLoading && links.length"
    class="flex items-center justify-center py-4"
    role="status"
    aria-live="polite"
  >
    <Loader class="motion-safe:animate-spin" aria-hidden="true" />
    <span class="sr-only">{{ $t('dashboard.loading') }}</span>
  </div>
  <div
    v-if="!listLoading && listComplete && links.length > 0"
    class="flex items-center justify-center text-sm"
  >
    {{ $t('links.no_more') }}
  </div>
  <Card
    v-if="!listLoading && listComplete && links.length === 0"
    class="border-dashed"
  >
    <CardContent
      class="
        flex min-h-48 flex-col items-center justify-center gap-3 text-center
        text-muted-foreground
      "
    >
      <Inbox class="size-8" aria-hidden="true" />
      <p class="text-sm">
        {{ $t('links.no_filtered_results') }}
      </p>
    </CardContent>
  </Card>
  <Alert
    v-if="listError"
    variant="destructive"
    class="mx-auto max-w-xl"
  >
    <AlertCircle aria-hidden="true" />
    <AlertTitle>{{ $t('links.load_failed') }}</AlertTitle>
    <AlertDescription>
      <Button variant="link" class="h-11 px-0 text-destructive" @click="getLinks">
        {{ $t('common.try_again') }}
      </Button>
    </AlertDescription>
  </Alert>
</template>
