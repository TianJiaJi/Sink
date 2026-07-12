<script setup lang="ts">
import type { DashboardLink } from '@/types/dashboard-links'
import { Loader2 } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  link?: Partial<DashboardLink>
}>(), {
  link: () => ({}),
})

const emit = defineEmits<{
  closeAutoFocus: [event: Event]
}>()

const { t } = useI18n()
const linksStore = useDashboardLinksStore()
const linksSearchStore = useDashboardLinksSearchStore()
const open = defineModel<boolean>('open', { default: false })
const isEdit = !!props.link.id
const formId = `link-editor-${useId()}`
const isSubmitting = shallowRef(false)
const pendingLink = shallowRef<DashboardLink | null>(null)

const formRef = ref<{ randomSlug: () => void } | null>(null)

watch(open, (isOpen) => {
  if (isOpen && !isEdit) {
    nextTick(() => {
      formRef.value?.randomSlug()
    })
  }
})

function handleSuccess(link: DashboardLink) {
  pendingLink.value = link
  open.value = false
}

function handleClose() {
  if (isSubmitting.value)
    return

  open.value = false
}

function handleCloseAutoFocus(event: Event) {
  emit('closeAutoFocus', event)

  const link = pendingLink.value
  if (!link)
    return

  pendingLink.value = null
  const operation = isEdit ? 'edit' : 'create'
  linksSearchStore.syncLink(link, operation)
  linksStore.notifyLinkUpdate(link, operation)
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="isEdit ? t('links.edit') : t('links.create')"
    :prevent-close="isSubmitting"
    @close-auto-focus="handleCloseAutoFocus"
  >
    <template v-if="!isEdit" #trigger>
      <slot>
        <Button
          class="
            min-h-11
            lg:min-h-9
          "
        >
          {{ $t('links.create') }}
        </Button>
      </slot>
    </template>

    <DashboardLinksEditorForm
      ref="formRef"
      :link="link"
      :is-edit="isEdit"
      :form-id="formId"
      @success="handleSuccess"
      @update:submitting="isSubmitting = $event"
    />

    <template #footer>
      <Button
        type="button"
        variant="secondary"
        class="
          min-h-11 flex-1
          sm:min-h-9 sm:flex-none
        "
        :disabled="isSubmitting"
        @click="handleClose"
      >
        {{ $t('common.close') }}
      </Button>
      <Button
        type="submit"
        :form="formId"
        :disabled="isSubmitting"
        :aria-busy="isSubmitting"
        class="
          min-h-11 flex-1
          sm:min-h-9 sm:flex-none
        "
      >
        <Loader2 v-if="isSubmitting" class="motion-safe:animate-spin" aria-hidden="true" />
        {{ $t('common.save') }}
      </Button>
    </template>
  </ResponsiveModal>
</template>
