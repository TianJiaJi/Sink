<script setup lang="ts">
const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>('open', { default: false })

function confirmClear() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent
      class="
        max-w-[95svw]
        md:max-w-lg
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('ux.check.clear_title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('ux.check.clear_description') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="confirmClear">
          {{ $t('ux.check.clear_action') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
