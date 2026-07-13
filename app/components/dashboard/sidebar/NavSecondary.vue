<script setup lang="ts">
import { ArrowUpCircle, Coffee, Languages, Laptop, Moon, Sun } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'

const { coffee } = useAppConfig()
const colorMode = useColorMode()
const { setLocale, locales } = useI18n()
const { state } = useSidebar()
const { hasUpdate, currentVersion, latestVersion } = useVersionCheck()
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex w-full p-1.5 pr-0" :class="[
              state === 'collapsed'
                ? 'flex-col items-center gap-2'
                : 'items-center justify-between',
            ]"
          >
            <div class="flex items-center">
              <TooltipProvider>
                <Tooltip :delay-duration="100">
                  <TooltipTrigger as-child>
                    <a
                      :href="coffee"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="$t('sidebar.coffee')"
                      class="
                        flex size-11 items-center justify-center rounded-md
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                        focus-visible:ring-3 focus-visible:ring-sidebar-ring/50
                      "
                    >
                      <Coffee aria-hidden="true" class="size-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                    <p>{{ $t('sidebar.coffee') }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider v-if="hasUpdate">
                <Tooltip :delay-duration="100">
                  <TooltipTrigger as-child>
                    <a
                      href="https://github.com/ccbikai/Sink/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="$t('sidebar.update', { current: currentVersion, version: latestVersion })"
                      class="
                        relative flex size-11 items-center justify-center
                        rounded-md
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                        focus-visible:ring-3 focus-visible:ring-sidebar-ring/50
                      "
                    >
                      <ArrowUpCircle aria-hidden="true" class="size-4" />
                      <span
                        class="
                          absolute top-1.5 right-1.5 size-2 rounded-full
                          bg-primary
                          motion-safe:animate-pulse
                        "
                      />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                    <p>{{ $t('sidebar.update', { current: currentVersion, version: latestVersion }) }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div
              class="flex gap-1" :class="[
                state === 'collapsed' ? 'flex-col items-center' : 'items-center',
              ]"
            >
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    :aria-label="$t('layouts.header.select_language')"
                    class="
                      flex size-11 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                      focus-visible:ring-3 focus-visible:ring-sidebar-ring/50
                    "
                  >
                    <Languages aria-hidden="true" class="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                >
                  <DropdownMenuItem
                    v-for="locale in locales"
                    :key="locale.code"
                    class="min-h-11 cursor-pointer"
                    @click="setLocale(locale.code)"
                  >
                    <span class="mr-1">{{ locale.emoji }}</span>
                    {{ locale.name }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    :aria-label="$t('theme.toggle')"
                    class="
                      flex size-11 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                      focus-visible:ring-3 focus-visible:ring-sidebar-ring/50
                    "
                  >
                    <Sun
                      aria-hidden="true"
                      class="
                        size-4
                        dark:hidden
                      "
                    />
                    <Moon
                      aria-hidden="true"
                      class="
                        hidden size-4
                        dark:block
                      "
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                >
                  <DropdownMenuItem
                    class="min-h-11 cursor-pointer"
                    @click="colorMode.preference = 'light'"
                  >
                    <Sun aria-hidden="true" class="mr-1 size-4" />
                    {{ $t('theme.light') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="min-h-11 cursor-pointer"
                    @click="colorMode.preference = 'dark'"
                  >
                    <Moon aria-hidden="true" class="mr-1 size-4" />
                    {{ $t('theme.dark') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="min-h-11 cursor-pointer"
                    @click="colorMode.preference = 'system'"
                  >
                    <Laptop aria-hidden="true" class="mr-1 size-4" />
                    {{ $t('theme.system') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
