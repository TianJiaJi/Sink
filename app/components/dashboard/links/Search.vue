<script setup lang="ts">
import type { DashboardLinkSearchItem } from '@/types/dashboard-links'
import { createReusableTemplate, useDebounceFn, useMagicKeys, useMediaQuery } from '@vueuse/core'
import { storeToRefs } from 'pinia'

defineOptions({
  inheritAttrs: false,
})
const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [SearchTemplate, SearchComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')

const router = useRouter()
const linksStore = useDashboardLinksStore()
const linksSearchStore = useDashboardLinksSearchStore()
const { error, links, loading } = storeToRefs(linksSearchStore)

const isOpen = ref(false)
const searchTerm = ref('')

const search = useDebounceFn((query: string) => {
  if (searchTerm.value.trim() === query.trim())
    void linksSearchStore.searchLinks(query)
}, 300)

const { Meta_K, Ctrl_K } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey))
      e.preventDefault()
  },
})

function sanitizeSlotAttrs(attrs?: Record<string, unknown>) {
  if (!attrs)
    return {}

  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => !key.startsWith('$')),
  ) as Record<string, unknown>
}

watch([Meta_K, Ctrl_K], (v) => {
  if (v[0] || v[1])
    isOpen.value = true
})

function selectLink(link: DashboardLinkSearchItem | undefined) {
  if (!link)
    return
  isOpen.value = false
  router.push(getDashboardLinkDetailLocation(link.slug))
}

function visibleTags(link: DashboardLinkSearchItem) {
  const normalizedQuery = searchTerm.value.trim().toLowerCase()
  return [...(link.tags ?? [])]
    .sort((a, b) => Number(b.includes(normalizedQuery)) - Number(a.includes(normalizedQuery)))
    .slice(0, 3)
}

function hiddenTagCount(link: DashboardLinkSearchItem) {
  return Math.max(0, (link.tags?.length ?? 0) - 3)
}

watch([searchTerm, () => linksStore.status, () => linksStore.tag], ([query]) => {
  linksSearchStore.invalidateSearch(query)
  if (!query.trim())
    return

  void search(query)
})
</script>

<template>
  <TriggerTemplate v-slot="attrs">
    <Button
      v-bind="sanitizeSlotAttrs(attrs)"
      data-link-search-trigger
      variant="outline"
      size="sm"
      class="
        relative min-h-11 min-w-0 flex-1 justify-start bg-background
        text-muted-foreground
        sm:w-32 sm:flex-none
        md:w-48
        lg:min-h-9
      "
    >
      <span
        class="
          hidden
          md:inline-flex
        "
      >{{ $t('links.search_placeholder') }}</span>
      <span
        class="
          inline-flex
          md:hidden
        "
      >{{ $t('common.search') }}</span>
      <kbd
        class="
          pointer-events-none absolute top-1/2 right-[0.3rem] hidden h-5
          -translate-y-1/2 items-center gap-1 rounded-sm border bg-muted px-1.5
          font-mono text-[10px] font-medium opacity-100 select-none
          sm:flex
        "
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </Button>
  </TriggerTemplate>
  <SearchTemplate>
    <Command :should-filter="false" class="h-auto flex-1">
      <CommandInput v-model="searchTerm" :placeholder="$t('links.search_placeholder')" autocomplete="off" />
      <CommandList
        class="
          max-h-none
          sm:max-h-[300px]
        "
      >
        <div
          v-if="loading"
          role="status"
          aria-live="polite"
          class="
            flex items-center justify-center p-6 text-sm text-muted-foreground
          "
        >
          {{ $t('links.search_loading') }}
        </div>
        <div
          v-else-if="error"
          role="alert"
          class="p-6 text-center text-sm text-destructive"
        >
          <p class="font-medium">
            {{ $t('links.search_failed') }}
          </p>
          <p class="mt-1 text-xs wrap-break-word">
            {{ error }}
          </p>
        </div>
        <CommandEmpty v-else>
          {{ $t('links.no_results') }}
        </CommandEmpty>
        <CommandGroup v-if="!loading && links.length" :heading="$t('links.group_title')">
          <CommandItem
            v-for="link in links" :key="link.slug" class="cursor-pointer"
            :value="link" @select="selectLink(link)"
          >
            <div class="w-full min-w-0 space-y-1">
              <div class="flex min-w-0 items-center gap-1">
                <div class="text-sm font-medium">
                  {{ link.slug }}
                </div>
                <div class="flex-1 truncate text-xs text-muted-foreground">
                  ({{ link.url }})
                </div>
                <Badge v-if="link.comment" variant="secondary">
                  <span class="max-w-24 truncate">{{ link.comment }}</span>
                </Badge>
              </div>
              <div v-if="link.tags?.length" class="flex min-w-0 flex-wrap gap-1">
                <Badge
                  v-for="tag in visibleTags(link)"
                  :key="tag"
                  variant="outline"
                  class="max-w-32 truncate"
                >
                  {{ tag }}
                </Badge>
                <Badge
                  v-if="hiddenTagCount(link)"
                  variant="outline"
                  class="shrink-0 text-muted-foreground"
                >
                  +{{ hiddenTagCount(link) }}
                </Badge>
              </div>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </SearchTemplate>
  <Dialog v-if="isDesktop" v-model:open="isOpen">
    <DialogTrigger as-child>
      <TriggerComponent />
    </DialogTrigger>
    <DialogContent class="gap-0 overflow-hidden p-0 shadow-lg" :show-close-button="false">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ $t('links.search_placeholder') }}</DialogTitle>
      </DialogHeader>
      <SearchComponent />
    </DialogContent>
  </Dialog>
  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <TriggerComponent />
    </DrawerTrigger>
    <DrawerContent class="h-[500px] gap-0">
      <DrawerHeader class="sr-only">
        <DrawerTitle>{{ $t('links.search_placeholder') }}</DrawerTitle>
      </DrawerHeader>
      <SearchComponent />
    </DrawerContent>
  </Drawer>
</template>
