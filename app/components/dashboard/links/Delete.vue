<script setup lang="ts">
import type { Link } from '@/types'
import { Loader2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
  link: Link
}>()

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const { t } = useI18n()
const linksStore = useDashboardLinksStore()
const linksSearchStore = useDashboardLinksSearchStore()
const deleting = shallowRef(false)
const pendingDelete = shallowRef<Link | null>(null)
const open = defineModel<boolean>('open', { default: false })

async function deleteLink() {
  if (deleting.value)
    return

  deleting.value = true
  try {
    await useAPI('/api/link/delete', {
      method: 'POST',
      body: {
        slug: props.link.slug,
      },
    })
    pendingDelete.value = props.link
    open.value = false
    toast(t('links.delete_success'))
  }
  catch (error) {
    console.error(error)
    toast.error(t('links.delete_failed'))
  }
  finally {
    deleting.value = false
  }
}

function updateOpen(value: boolean) {
  if (!value && deleting.value)
    return

  open.value = value
}

function handleEscapeKeyDown(event: KeyboardEvent) {
  if (deleting.value)
    event.preventDefault()
}

function handleCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event)

  const link = pendingDelete.value
  if (!link)
    return

  pendingDelete.value = null
  linksSearchStore.syncLink(link, 'delete')
  linksStore.notifyLinkUpdate(link, 'delete')
}
</script>

<template>
  <AlertDialog :open="open" @update:open="updateOpen">
    <AlertDialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
      @close-auto-focus="handleCloseAutoFocus"
      @escape-key-down="handleEscapeKeyDown"
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('ux.links.delete_title', { slug: link.slug }) }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('ux.links.delete_description', { slug: link.slug }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deleting">
          {{ $t('common.cancel') }}
        </AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="deleting"
          :aria-busy="deleting"
          @click.prevent="deleteLink"
        >
          <Loader2 v-if="deleting" class="motion-safe:animate-spin" aria-hidden="true" />
          {{ $t('ux.links.delete_action') }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
