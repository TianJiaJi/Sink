<script setup lang="ts">
import type { Link, LinkUpdateType } from '@/types'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: Link
}>()

const emit = defineEmits<{
  'update:link': [link: Link, type: LinkUpdateType]
}>()

async function deleteLink() {
  await useAPI('/api/link/delete', {
    method: 'POST',
    body: {
      slug: props.link.slug,
    },
  })
  emit('update:link', props.link, 'delete')
  toast('Delete successful!')
}
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('links.delete_confirm_title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('links.delete_confirm_desc') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="deleteLink">
          {{ $t('common.continue') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
