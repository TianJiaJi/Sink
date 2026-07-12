<script setup lang="ts">
import type { Link } from '@/types'
import type { DashboardSlugFilters } from '@/utils/dashboard-query'
import { createReusableTemplate, useMediaQuery, watchDebounced } from '@vueuse/core'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import { VList } from 'virtua/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  filters?: DashboardSlugFilters
  debounce?: number
}>(), {
  debounce: 500,
})

const emit = defineEmits<{
  change: [key: string, value: string]
}>()

const [TriggerTemplate, TriggerComponent] = createReusableTemplate()
const [FilterTemplate, FilterComponent] = createReusableTemplate()

const isDesktop = useMediaQuery('(min-width: 640px)')

const links = ref<Link[]>([])
const isOpen = ref(false)
const isLoading = shallowRef(false)
const hasError = shallowRef(false)
const selectedLinks = ref<string[]>(props.filters?.slug?.split(',').filter(Boolean) ?? [])
const searchTerm = shallowRef('')
let requestController: AbortController | null = null

const filteredLinks = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase()
  if (!query)
    return links.value
  return links.value.filter(link => link.slug.toLocaleLowerCase().includes(query))
})

// Sync selectedLinks when props.filters changes (e.g., store restore/clear)
watch(() => props.filters?.slug, (newSlug) => {
  const newValue = newSlug?.split(',').filter(Boolean) ?? []
  if (JSON.stringify(newValue) !== JSON.stringify(selectedLinks.value)) {
    selectedLinks.value = newValue
  }
})

async function getLinks() {
  requestController?.abort()
  const controller = new AbortController()
  requestController = controller
  isLoading.value = true
  hasError.value = false

  try {
    links.value = await useAPI<Link[]>('/api/link/search', { signal: controller.signal })
  }
  catch {
    if (!controller.signal.aborted) {
      links.value = []
      hasError.value = true
    }
  }
  finally {
    if (requestController === controller) {
      requestController = null
      isLoading.value = false
    }
  }
}

onMounted(() => {
  void getLinks()
})

onBeforeUnmount(() => requestController?.abort())

function emitSelectedLinks(value: string[]) {
  emit('change', 'slug', value.join(','))
}

if (props.debounce === 0) {
  watch(selectedLinks, emitSelectedLinks)
}
else {
  watchDebounced(selectedLinks, emitSelectedLinks, {
    debounce: props.debounce,
    maxWait: props.debounce * 2,
  })
}
</script>

<template>
  <TriggerTemplate>
    <Button
      variant="outline"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-label="$t('dashboard.realtime.filter_label')"
      class="
        flex w-full justify-between px-3
        sm:w-48
      "
    >
      <div
        class="flex-1 truncate text-left" :class="selectedLinks.length ? `
          text-foreground
        ` : `text-muted-foreground`"
      >
        {{ selectedLinks.length ? selectedLinks.join(', ') : $t('dashboard.filter_placeholder') }}
      </div>
      <ChevronsUpDown aria-hidden="true" class="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  </TriggerTemplate>
  <FilterTemplate>
    <Command v-model="selectedLinks" :aria-busy="isLoading" multiple>
      <div class="flex h-9 items-center gap-2 border-b px-3">
        <Search aria-hidden="true" class="size-4 shrink-0 opacity-50" />
        <Input
          v-model="searchTerm"
          :aria-label="$t('dashboard.realtime.filter_search_label')"
          :placeholder="selectedLinks.length ? selectedLinks.join(', ') : $t('dashboard.filter_placeholder')"
          autocomplete="off"
          class="
            h-10 border-0 bg-transparent px-0 shadow-none
            focus-visible:ring-0
          "
        />
      </div>
      <div
        v-if="isLoading"
        aria-live="polite"
        class="
          flex min-h-24 items-center justify-center p-4 text-sm
          text-muted-foreground
        "
      >
        {{ $t('dashboard.loading') }}
      </div>
      <div
        v-else-if="hasError"
        role="alert"
        class="
          flex min-h-24 flex-col items-center justify-center gap-3 p-4
          text-center
        "
      >
        <p class="text-sm text-destructive">
          {{ $t('dashboard.realtime.links_error') }}
        </p>
        <Button type="button" variant="outline" size="sm" @click="getLinks">
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <div
        v-else-if="links.length === 0"
        class="
          flex min-h-24 items-center justify-center p-4 text-center text-sm
          text-muted-foreground
        "
      >
        {{ $t('links.no_results') }}
      </div>
      <CommandList v-else-if="filteredLinks.length" :class="{ 'max-h-none': !isDesktop }">
        <CommandGroup>
          <VList
            v-slot="{ item: link }"
            :data="filteredLinks"
            :style="{ height: isDesktop ? '292px' : '420px' }"
          >
            <CommandItem
              :value="link.slug"
              class="py-2"
            >
              <Check
                aria-hidden="true"
                :class="cn(
                  'size-4',
                  selectedLinks.includes(link.slug) ? 'opacity-100' : `
                    opacity-0
                  `,
                )"
              />
              {{ link.slug }}
            </CommandItem>
          </VList>
        </CommandGroup>
      </CommandList>
      <div
        v-else
        class="
          flex min-h-24 items-center justify-center p-4 text-center text-sm
          text-muted-foreground
        "
      >
        {{ $t('links.no_results') }}
      </div>
    </Command>
  </FilterTemplate>
  <Popover v-if="isDesktop" v-model:open="isOpen">
    <PopoverTrigger as-child>
      <TriggerComponent />
    </PopoverTrigger>
    <PopoverContent
      class="
        w-full p-0
        sm:w-48
      "
    >
      <FilterComponent />
    </PopoverContent>
  </Popover>

  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <TriggerComponent />
    </DrawerTrigger>
    <DrawerContent
      class="
        h-[500px] max-h-dvh overscroll-contain pb-[env(safe-area-inset-bottom)]
      "
    >
      <DrawerHeader class="sr-only">
        <DrawerTitle>{{ $t('dashboard.realtime.filter_label') }}</DrawerTitle>
      </DrawerHeader>
      <FilterComponent />
    </DrawerContent>
  </Drawer>
</template>
