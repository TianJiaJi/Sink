<script setup lang="ts">
import type { LinkUpdateType } from '@/types'
import type { DashboardLink, DashboardLinkListResponse } from '@/types/dashboard-links'
import { AlertCircle, CheckSquare, Inbox, Loader2, LoaderCircle, Square, Tags, Trash2 } from '@lucide/vue'
import { useInfiniteScroll } from '@vueuse/core'
import { toast } from 'vue-sonner'

const linksStore = useDashboardLinksStore()
const { t } = useI18n()

const links = ref<DashboardLink[]>([])
const selected = ref<Set<string>>(new Set())
const batchLoading = shallowRef(false)
const batchDeleteDialogOpen = shallowRef(false)
const batchAddTagsDialogOpen = shallowRef(false)
const batchAddTagsInput = ref('')
const batchAddTagsValue = ref<string[]>([])

const allSelected = computed(() =>
  links.value.length > 0 && links.value.every(link => selected.value.has(link.slug)),
)

function toggleSelected(slug: string) {
  const next = new Set(selected.value)
  if (next.has(slug))
    next.delete(slug)
  else
    next.add(slug)
  selected.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selected.value = new Set()
  }
  else {
    selected.value = new Set(links.value.map(link => link.slug))
  }
}

function openBatchDeleteDialog() {
  batchDeleteDialogOpen.value = true
}

async function batchDelete() {
  await batchAction('delete')
  batchDeleteDialogOpen.value = false
}

async function batchAction(action: 'delete' | 'disable' | 'enable' | 'addTags') {
  const slugs = [...selected.value]
  if (!slugs.length)
    return

  const body: Record<string, unknown> = { action, slugs }
  if (action === 'addTags') {
    const tags = batchAddTagsValue.value.map(tag => tag.trim()).filter(Boolean)
    if (!tags.length)
      return
    body.tags = tags
  }

  batchLoading.value = true
  try {
    const response = await useAPI<{ results: Array<{ slug: string, ok: boolean, error?: string }> }>('/api/link/batch', {
      method: 'POST',
      body,
    })

    const failed = response.results.filter(r => !r.ok)
    const succeeded = response.results.filter(r => r.ok)

    if (succeeded.length)
      toast.success(t('links.batch_success', { count: succeeded.length, action: t(`links.batch_${action}`) }))

    if (failed.length) {
      for (const item of failed.slice(0, 3))
        toast.error(t('links.batch_item_failed', { slug: item.slug, error: item.error ?? '' }))
      if (failed.length > 3)
        toast.error(t('links.batch_more_failed', { count: failed.length - 3 }))
    }

    selected.value = new Set()
    batchAddTagsValue.value = []
    batchAddTagsInput.value = ''
    resetAndLoad()
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.batch_request_failed'))
  }
  finally {
    batchLoading.value = false
  }
}

function addBatchTag() {
  const tag = batchAddTagsInput.value.trim().toLowerCase()
  if (!tag || tag.length > 32 || batchAddTagsValue.value.length >= 10)
    return
  if (batchAddTagsValue.value.includes(tag))
    return
  batchAddTagsValue.value = [...batchAddTagsValue.value, tag]
  batchAddTagsInput.value = ''
}

function removeBatchTag(tag: string) {
  batchAddTagsValue.value = batchAddTagsValue.value.filter(t => t !== tag)
}
const listComplete = ref(false)
const listError = ref(false)
const listLoading = ref(false)
const limit = 24
let cursor = ''
let requestGeneration = 0

const { countersMap, counterErrorIds, fetchCounters, resetCounters } = useLinkCounters()
provide(LINKS_COUNTERS_MAP_KEY, countersMap)
provide(LINKS_COUNTER_ERROR_IDS_KEY, counterErrorIds)
provide(RETRY_LINK_COUNTERS_KEY, (id: string) => void fetchCounters([id]))

const scrollContainer = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  scrollContainer.value = document.getElementById('dashboard-main')
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

    const ids = newLinks.map(l => l.id).filter(id => !countersMap.value[id])
    void fetchCounters(ids)
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
  resetCounters()
  cursor = ''
  listComplete.value = false
  listError.value = false
  listLoading.value = false
  void getLinks()
}

useInfiniteScroll(
  scrollContainer,
  getLinks,
  {
    distance: 0,
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
  <!-- Batch toolbar -->
  <div
    v-if="selected.size"
    class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
  >
    <Card size="sm">
      <CardContent class="flex items-center gap-2 py-3">
        <span class="px-1 text-sm font-medium">{{ selected.size }}</span>
        <Button variant="destructive" size="sm" :disabled="batchLoading" @click="openBatchDeleteDialog">
          <Trash2 aria-hidden="true" class="mr-1 size-3.5" />
          {{ $t('links.batch_delete') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="batchLoading" @click="batchAction('disable')">
          {{ $t('links.batch_disable') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="batchLoading" @click="batchAction('enable')">
          {{ $t('links.batch_enable') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="batchLoading" @click="batchAddTagsDialogOpen = true">
          <Tags aria-hidden="true" class="mr-1 size-3.5" />
          {{ $t('links.batch_add_tags') }}
        </Button>
        <Button variant="ghost" size="sm" @click="selected = new Set()">
          {{ $t('links.cancel_selection') }}
        </Button>
      </CardContent>
    </Card>
  </div>

  <!-- Select All bar -->
  <div
    v-if="links.length"
    class="mb-2 flex items-center justify-between"
  >
    <Button variant="ghost" size="sm" @click="toggleSelectAll">
      <CheckSquare v-if="allSelected" aria-hidden="true" class="mr-1 size-4" />
      <Square v-else aria-hidden="true" class="mr-1 size-4" />
      {{ allSelected ? $t('links.deselect_all') : $t('links.select_all') }}
    </Button>
    <span v-if="selected.size" class="text-sm text-muted-foreground">
      {{ $t('links.selected_count', { count: selected.size }) }}
    </span>
  </div>

  <!-- Batch delete confirmation dialog -->
  <AlertDialog :open="batchDeleteDialogOpen" @update:open="batchDeleteDialogOpen = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('links.dialogs.batch_delete.title', { count: selected.size }) }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('links.dialogs.batch_delete.description', { count: selected.size }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="batchLoading">
          {{ $t('common.cancel') }}
        </AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="batchLoading"
          :aria-busy="batchLoading"
          @click.prevent="batchDelete"
        >
          <Loader2 v-if="batchLoading" class="motion-safe:animate-spin" aria-hidden="true" />
          {{ $t('links.dialogs.batch_delete.action') }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Batch add tags dialog -->
  <Dialog :open="batchAddTagsDialogOpen" @update:open="batchAddTagsDialogOpen = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('links.dialogs.batch_add_tags.title') }}</DialogTitle>
        <DialogDescription>
          {{ $t('links.dialogs.batch_add_tags.description', { count: selected.size }) }}
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="tag in batchAddTagsValue"
            :key="tag"
            variant="secondary"
            class="gap-1"
          >
            {{ tag }}
            <button
              type="button"
              class="
                ml-0.5 rounded-full outline-none
                focus-visible:ring-2 focus-visible:ring-ring
              "
              :aria-label="$t('links.form.tag_remove', { tag })"
              @click="removeBatchTag(tag)"
            >
              ×
            </button>
          </Badge>
        </div>
        <Input
          v-model="batchAddTagsInput"
          :placeholder="$t('links.form.tags_placeholder')"
          maxlength="32"
          @keydown.enter.prevent="addBatchTag"
        />
        <p class="text-xs text-muted-foreground">
          {{ $t('links.form.tags_description') }}
        </p>
      </div>
      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline" :disabled="batchLoading">
            {{ $t('common.cancel') }}
          </Button>
        </DialogClose>
        <Button
          :disabled="batchLoading || batchAddTagsValue.length === 0"
          :aria-busy="batchLoading"
          @click="batchAction('addTags'); batchAddTagsDialogOpen = false"
        >
          <Loader2 v-if="batchLoading" class="motion-safe:animate-spin" aria-hidden="true" />
          {{ $t('links.dialogs.batch_add_tags.action') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Link grid -->
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
      :selected="selected.has(link.slug)"
      @toggle="toggleSelected"
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
    <DashboardLinksLinkSkeleton v-for="index in 6" :key="index" />
    <span class="sr-only">{{ $t('dashboard.loading') }}</span>
  </section>
  <div
    v-if="links.length"
    class="flex min-h-14 items-center justify-center py-4"
    role="status"
    aria-live="polite"
  >
    <template v-if="listLoading">
      <LoaderCircle class="motion-safe:animate-spin" aria-hidden="true" />
      <span class="sr-only">{{ $t('dashboard.loading') }}</span>
    </template>
    <span v-else-if="listComplete" class="text-sm">
      {{ $t('links.no_more') }}
    </span>
  </div>
  <Card v-if="!listLoading && listComplete && links.length === 0">
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
      <Button variant="link" size="sm" class="text-destructive" @click="getLinks">
        {{ $t('common.try_again') }}
      </Button>
    </AlertDescription>
  </Alert>
</template>
