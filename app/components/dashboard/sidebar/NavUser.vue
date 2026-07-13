<script setup lang="ts">
import { ChevronsUpDown, LogOut } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'

interface User {
  name: string
  email: string
  avatar: string
}

const { isMobile } = useSidebar()
const menuButton = useTemplateRef<{ $el: HTMLElement }>('menuButton')
const menuOpen = shallowRef(false)
const logoutOpen = shallowRef(false)

async function openLogoutDialog() {
  menuOpen.value = false
  await nextTick()
  logoutOpen.value = true
}

function restoreMenuFocus(event: Event) {
  event.preventDefault()
  menuButton.value?.$el.focus()
}

const hostname = computed<string>(() => {
  if (import.meta.client) {
    return window.location.hostname
  }
  return 'localhost'
})

const user = computed<User>(() => ({
  name: 'Root',
  email: `root@${hostname.value}`,
  avatar: '/sink.png',
}))
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu v-model:open="menuOpen">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            ref="menuButton"
            size="lg"
            :aria-label="user.name"
            class="
              min-h-11
              focus-visible:ring-3 focus-visible:ring-sidebar-ring/50
              data-[state=open]:bg-sidebar-accent
              data-[state=open]:text-sidebar-accent-foreground
            "
          >
            <Avatar class="size-8 rounded-full">
              <AvatarImage :src="user.avatar" :alt="user.name" />
              <AvatarFallback class="rounded-full">
                R
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm/tight">
              <span class="truncate font-medium">{{ user.name }}</span>
              <span class="truncate text-xs">{{ user.email }}</span>
            </div>
            <ChevronsUpDown aria-hidden="true" class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="size-8 rounded-full">
                <AvatarImage :src="user.avatar" :alt="user.name" />
                <AvatarFallback class="rounded-full">
                  R
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm/tight">
                <span class="truncate font-semibold">{{ user.name }}</span>
                <span class="truncate text-xs">{{ user.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            class="min-h-11 cursor-pointer"
            @select.prevent="openLogoutDialog"
          >
            <LogOut aria-hidden="true" class="mr-2 size-4" />
            {{ $t('logout.action') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DashboardLogout
        v-model:open="logoutOpen"
        :show-trigger="false"
        @close-auto-focus="restoreMenuFocus"
      />
    </SidebarMenuItem>
  </SidebarMenu>
</template>
