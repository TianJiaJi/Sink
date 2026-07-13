<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { CounterData } from '@/types'
import type { DashboardLink } from '@/types/dashboard-links'
import { CalendarPlus2, Copy, CopyCheck, Eraser, Flame, Hourglass, Link as LinkIcon, MousePointerClick, QrCode, ShieldAlert, SquareChevronDown, SquarePen, Users } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { parseURL } from 'ufo'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: DashboardLink
}>()

const { t, locale } = useI18n()
const editPopoverOpen = shallowRef(false)
const editDialogOpen = shallowRef(false)
const deleteDialogOpen = shallowRef(false)
const actionsTriggerRef = useTemplateRef<ComponentPublicInstance>('actionsTrigger')

function openEditDialog() {
  editDialogOpen.value = true
  editPopoverOpen.value = false
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
  editPopoverOpen.value = false
}

function handlePopoverCloseAutoFocus(event: Event) {
  if (editDialogOpen.value || deleteDialogOpen.value)
    event.preventDefault()
}

function handleDialogCloseAutoFocus(event: Event) {
  event.preventDefault()
  nextTick(() => {
    const element = actionsTriggerRef.value?.$el
    if (element instanceof HTMLElement && element.isConnected) {
      element.focus({ preventScroll: true })
      return
    }

    const fallback = document.querySelector('[data-link-actions-trigger]')
    if (fallback instanceof HTMLElement && fallback.isConnected) {
      fallback.focus({ preventScroll: true })
      return
    }

    const searchTrigger = document.querySelector('[data-link-search-trigger]')
    if (searchTrigger instanceof HTMLElement && searchTrigger.isConnected)
      searchTrigger.focus({ preventScroll: true })
  })
}

const countersMap = inject<Ref<Record<string, CounterData>> | undefined>('linksCountersMap', undefined)
const counters = computed(() => countersMap?.value?.[props.link.id])
const counterErrorIds = inject<Ref<Set<string>> | undefined>('linksCounterErrorIds', undefined)
const retryCounters = inject<((id: string) => void) | undefined>('retryLinkCounters', undefined)
const countersError = computed(() => counterErrorIds?.value.has(props.link.id) ?? false)

const requestUrl = useRequestURL()
const host = requestUrl.host
const origin = requestUrl.origin

function getLinkHost(url: string): string | undefined {
  const { host } = parseURL(url)
  return host
}

const shortLink = computed(() => `${origin}/${props.link.slug}`)
const linkIcon = computed(() => `https://unavatar.webp.se/${getLinkHost(props.link.url)}?fallback=https://sink.cool/icon.png`)
const isExpired = computed(() => Boolean(props.link.expiration && props.link.expiration <= Math.floor(Date.now() / 1000)))
const noteText = computed(() => props.link.comment?.trim() ?? '')
const summaryText = computed(() => props.link.title?.trim() || props.link.description?.trim() || '')
const tags = computed(() => props.link.tags ?? [])
const visibleTags = computed(() => tags.value.slice(0, 2))
const hiddenTagCount = computed(() => Math.max(0, tags.value.length - visibleTags.value.length))

const { copy, copied } = useClipboard({ source: shortLink.value, copiedDuring: 400 })

function copyLink() {
  copy(shortLink.value)
  toast(t('links.copy_success'))
}
</script>

<template>
  <Card class="relative isolate h-full min-w-0">
    <CardContent
      class="flex h-full min-w-0 flex-1 flex-col gap-3"
    >
      <div
        class="
          flex min-w-0 flex-col gap-2
          sm:flex-row sm:items-start
        "
      >
        <TooltipProvider v-if="noteText">
          <Tooltip>
            <TooltipTrigger as-child>
              <NuxtLink
                class="
                  group flex w-full min-w-0 flex-1 cursor-pointer items-center
                  gap-3 rounded-md outline-none
                  after:absolute after:inset-0 after:z-10 after:rounded-2xl
                  focus-visible:after:ring-3 focus-visible:after:ring-ring/50
                "
                :to="getDashboardLinkDetailLocation(link.slug)"
              >
                <Avatar>
                  <AvatarImage
                    :src="linkIcon"
                    :alt="link.slug"
                    loading="lazy"
                  />
                  <AvatarFallback>
                    <img
                      src="/icon.png"
                      :alt="link.slug"
                      loading="lazy"
                    >
                  </AvatarFallback>
                </Avatar>

                <div class="min-w-0 flex-1 overflow-hidden">
                  <div class="flex min-w-0 items-center">
                    <div
                      class="
                        min-w-0 truncate leading-5 font-bold
                        group-hover:underline group-hover:underline-offset-4
                      "
                    >
                      {{ host }}/{{ link.slug }}
                    </div>
                    <Badge
                      v-if="link.unsafe" variant="destructive" class="
                        ml-1 shrink-0
                      "
                    >
                      <ShieldAlert aria-hidden="true" class="size-3" />
                      <span>{{ $t('ux.links.unsafe') }}</span>
                    </Badge>
                    <Badge
                      v-if="isExpired"
                      variant="destructive"
                      class="ml-1 shrink-0"
                    >
                      {{ $t('links.expired') }}
                    </Badge>
                  </div>

                  <p v-if="summaryText" class="truncate text-sm">
                    {{ summaryText }}
                  </p>
                </div>
              </NuxtLink>
            </TooltipTrigger>
            <TooltipContent class="max-w-[90svw] break-all">
              <p>{{ noteText }}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <NuxtLink
          v-else
          class="
            group flex w-full min-w-0 flex-1 cursor-pointer items-center gap-3
            rounded-md outline-none
            after:absolute after:inset-0 after:z-10 after:rounded-2xl
            focus-visible:after:ring-3 focus-visible:after:ring-ring/50
          "
          :to="getDashboardLinkDetailLocation(link.slug)"
        >
          <Avatar>
            <AvatarImage
              :src="linkIcon"
              :alt="link.slug"
              loading="lazy"
            />
            <AvatarFallback>
              <img
                src="/icon.png"
                :alt="link.slug"
                loading="lazy"
              >
            </AvatarFallback>
          </Avatar>

          <div class="min-w-0 flex-1 overflow-hidden">
            <div class="flex min-w-0 items-center">
              <div
                class="
                  min-w-0 truncate leading-5 font-bold
                  group-hover:underline group-hover:underline-offset-4
                "
              >
                {{ host }}/{{ link.slug }}
              </div>
              <Badge
                v-if="link.unsafe" variant="destructive" class="ml-1 shrink-0"
              >
                <ShieldAlert aria-hidden="true" class="size-3" />
                <span>{{ $t('ux.links.unsafe') }}</span>
              </Badge>
              <Badge
                v-if="isExpired"
                variant="destructive"
                class="ml-1 shrink-0"
              >
                {{ $t('links.expired') }}
              </Badge>
            </div>

            <p v-if="summaryText" class="truncate text-sm">
              {{ summaryText }}
            </p>
          </div>
        </NuxtLink>

        <div
          class="
            relative z-20 flex w-full shrink-0 items-center justify-end
            sm:w-auto
          "
        >
          <Button
            variant="ghost"
            size="icon"
            class="
              size-11
              sm:size-9
            "
            :aria-label="copied ? $t('links.copy_success') : shortLink"
            @click="copyLink"
          >
            <CopyCheck v-if="copied" aria-hidden="true" class="size-4" />
            <Copy v-else aria-hidden="true" class="size-4" />
          </Button>

          <Button
            as-child variant="ghost" size="icon" class="
              size-11
              sm:size-9
            "
          >
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="link.url"
            >
              <LinkIcon aria-hidden="true" class="size-5" />
            </a>
          </Button>

          <Popover>
            <PopoverTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="
                  size-11
                  sm:size-9
                "
                :aria-label="$t('links.download_qr_code')"
              >
                <QrCode aria-hidden="true" class="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DashboardLinksQRCode
                :data="shortLink"
                :image="linkIcon"
              />
            </PopoverContent>
          </Popover>

          <Popover v-model:open="editPopoverOpen">
            <PopoverTrigger as-child>
              <Button
                ref="actionsTrigger"
                data-link-actions-trigger
                variant="ghost"
                size="icon"
                class="
                  size-11
                  sm:size-9
                "
                :aria-label="`${$t('common.edit')} / ${$t('common.delete')}`"
              >
                <SquareChevronDown aria-hidden="true" class="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              class="w-44 gap-0 p-1"
              :hide-when-detached="false"
              @close-auto-focus="handlePopoverCloseAutoFocus"
            >
              <Button
                type="button"
                variant="ghost"
                class="h-11 w-full justify-start rounded-sm px-2"
                @click="openEditDialog"
              >
                <SquarePen
                  aria-hidden="true"
                  class="mr-2 size-5"
                />
                {{ $t('common.edit') }}
              </Button>

              <Separator class="my-1" />

              <Button
                type="button"
                variant="ghost"
                class="
                  h-11 w-full justify-start rounded-sm px-2 text-destructive
                  hover:text-destructive
                "
                @click="openDeleteDialog"
              >
                <Eraser
                  aria-hidden="true"
                  class="mr-2 size-5"
                />
                {{ $t('common.delete') }}
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div class="mt-auto flex flex-col space-y-3">
        <div class="flex h-5 w-full min-w-0 space-x-2 overflow-hidden text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <NuxtLink
                  tabindex="-1"
                  class="
                    relative z-20 inline-flex items-center leading-5
                    whitespace-nowrap
                  "
                  :to="getDashboardLinkDetailLocation(link.slug)"
                >
                  <CalendarPlus2 aria-hidden="true" class="mr-1 size-4" /> {{ shortDate(link.createdAt, locale) }}
                </NuxtLink>
              </TooltipTrigger>
              <TooltipContent>
                <p>{{ $t('links.created_at') }}: {{ longDate(link.createdAt, locale) }}</p>
                <p>{{ $t('links.updated_at') }}: {{ longDate(link.updatedAt, locale) }}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <template v-if="link.expiration">
            <Separator orientation="vertical" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <NuxtLink
                    tabindex="-1"
                    class="
                      relative z-20 inline-flex items-center leading-5
                      whitespace-nowrap
                    "
                    :to="getDashboardLinkDetailLocation(link.slug)"
                  >
                    <Hourglass aria-hidden="true" class="mr-1 size-4" /> {{ shortDate(link.expiration, locale) }}
                  </NuxtLink>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{{ $t('links.expires_at') }}: {{ longDate(link.expiration, locale) }}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </template>
          <Separator orientation="vertical" />
          <span class="min-w-0 truncate">{{ link.url }}</span>
        </div>
        <div
          v-if="tags.length || countersMap"
          class="flex h-5 w-full min-w-0 items-center gap-2 text-sm"
        >
          <div
            v-if="countersMap"
            class="flex shrink-0 items-center gap-1 tabular-nums"
          >
            <template v-if="countersError">
              <Button
                type="button"
                variant="link"
                class="h-5 px-0 text-xs text-destructive"
                :aria-label="$t('ux.links.counts_retry', { slug: link.slug })"
                @click="retryCounters?.(link.id)"
              >
                {{ $t('common.try_again') }}
              </Button>
            </template>
            <template v-else-if="counters">
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('ux.links.visits_count', { count: counters.visits })"
              >
                <MousePointerClick aria-hidden="true" class="size-3.5" />
                {{ counters.visits }}
              </Badge>
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('ux.links.visitors_count', { count: counters.visitors })"
              >
                <Users aria-hidden="true" class="size-3.5" />
                {{ counters.visitors }}
              </Badge>
              <Badge
                variant="secondary"
                class="shrink-0"
                :aria-label="$t('ux.links.referers_count', { count: counters.referers })"
              >
                <Flame aria-hidden="true" class="size-3.5" />
                {{ counters.referers }}
              </Badge>
            </template>
            <Skeleton v-else class="h-5 w-28 rounded-full bg-secondary" />
          </div>
          <div
            v-if="tags.length"
            class="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1"
          >
            <Badge
              v-for="tag in visibleTags"
              :key="tag"
              variant="outline"
              class="max-w-24 min-w-0 shrink truncate"
            >
              {{ tag }}
            </Badge>
            <Badge
              v-if="hiddenTagCount"
              variant="outline"
              class="shrink-0 text-muted-foreground"
            >
              +{{ hiddenTagCount }}
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>

    <DashboardLinksEditor
      v-model:open="editDialogOpen"
      :link="link"
      @close-auto-focus="handleDialogCloseAutoFocus"
    />
    <DashboardLinksDelete
      v-model:open="deleteDialogOpen"
      :link="link"
      @close-auto-focus="handleDialogCloseAutoFocus"
    />
  </Card>
</template>
