export const useDashboardLinksStore = defineStore('dashboard-links', () => {
  const sortBy = ref<'newest' | 'oldest' | 'az' | 'za'>('az')

  const showLinkEditor = ref(false)
  const editingLink = ref<Record<string, unknown> | null>(null)

  function openLinkEditor(link?: Record<string, unknown>) {
    editingLink.value = link || null
    showLinkEditor.value = true
  }

  function closeLinkEditor() {
    showLinkEditor.value = false
    editingLink.value = null
  }

  return {
    sortBy,
    showLinkEditor,
    editingLink,
    openLinkEditor,
    closeLinkEditor,
  }
})
