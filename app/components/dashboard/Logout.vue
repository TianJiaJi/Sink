<script setup lang="ts">
import { LogOut } from 'lucide-vue-next'

const { removeToken } = useAuthToken()

function logOut() {
  removeToken()
  navigateTo('/dashboard/login')
}
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        class="size-11"
        :aria-label="$t('logout.action')"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('logout.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('logout.confirm') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="logOut">
          {{ $t('logout.action') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
