<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { pageTitle } = useDashboardRoute()
const route = useRoute()

const scrollContainer = ref<HTMLElement | null>(null)
const { y } = useScroll(scrollContainer)

watch(() => route.fullPath, () => {
  y.value = 0
})

useSeoMeta({
  robots: 'noindex, nofollow',
})
</script>

<template>
  <SidebarProvider>
    <DashboardSidebarAppSidebar />
    <SidebarInset
      class="
        max-h-svh overflow-hidden
        md:max-h-[calc(100svh-1rem)]
      "
    >
      <div class="flex h-full flex-col">
        <header
          class="
            z-20 flex shrink-0 flex-col gap-2 border-b bg-background p-4
            pt-[calc(1rem+env(safe-area-inset-top))]
            sm:h-16 sm:flex-row sm:items-center sm:gap-2 sm:py-0
          "
        >
          <div
            class="
              flex w-full min-w-0 items-center gap-2
              sm:w-auto
            "
          >
            <SidebarTrigger
              class="
                -ml-1 size-11
                lg:size-8
              "
            />
            <div
              class="
                flex h-11 items-center
                lg:h-8
              "
            >
              <Separator
                orientation="vertical"
                class="
                  h-4
                  data-[orientation=vertical]:self-auto
                "
              />
            </div>
            <DashboardPageBreadcrumb :title="$t(pageTitle ?? 'dashboard.title')" />
          </div>

          <div
            id="dashboard-header-actions"
            class="
              flex w-full flex-wrap items-center gap-2
              sm:ml-auto sm:w-auto sm:flex-1 sm:flex-nowrap sm:justify-end
            "
          />
        </header>

        <div
          ref="scrollContainer"
          class="
            flex-1 overflow-x-hidden overflow-y-auto p-4
            pb-[calc(1rem+env(safe-area-inset-bottom))]
          "
        >
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
