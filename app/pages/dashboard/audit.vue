<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

interface AuditLog {
  id: string
  createdAt: number
  action: string
  linkSlug: string
  actor: string
  details: Record<string, unknown> | null
}

const { locale } = useI18n()
const logs = ref<AuditLog[]>([])
const loading = shallowRef(false)
const slugFilter = ref('')

async function load() {
  loading.value = true
  try {
    const data = await useAPI<{ logs: AuditLog[] }>('/api/link/audit/list', {
      query: { limit: 100, ...(slugFilter.value.trim() ? { slug: slugFilter.value.trim() } : {}) },
    })
    logs.value = data.logs ?? []
  }
  catch (error) {
    console.error(error)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <main class="space-y-6">
    <h1 class="text-xl font-bold">
      {{ $t('nav.audit') }}
    </h1>
    <Card>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <Input
            v-model="slugFilter"
            placeholder="slug filter"
            class="max-w-xs"
            @keyup.enter="load"
          />
          <Button variant="outline" size="sm" :disabled="loading" @click="load">
            {{ loading ? $t('dashboard.loading') : $t('common.refresh') }}
          </Button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-xs text-muted-foreground">
                <th class="py-2 pr-4">
                  {{ $t('audit.time') }}
                </th>
                <th class="py-2 pr-4">
                  {{ $t('audit.action') }}
                </th>
                <th class="py-2 pr-4">
                  {{ $t('audit.slug') }}
                </th>
                <th class="py-2 pr-4">
                  {{ $t('audit.actor') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" class="border-b">
                <td class="py-2 pr-4 text-muted-foreground tabular-nums">
                  {{ new Date(log.createdAt * 1000).toLocaleString(locale) }}
                </td>
                <td class="py-2 pr-4">
                  <Badge variant="outline">
                    {{ log.action }}
                  </Badge>
                </td>
                <td class="py-2 pr-4 font-mono text-xs">
                  {{ log.linkSlug }}
                </td>
                <td class="py-2 pr-4 text-muted-foreground">
                  {{ log.actor }}
                </td>
              </tr>
              <tr v-if="!logs.length && !loading">
                <td colspan="4" class="py-8 text-center text-muted-foreground">
                  {{ $t('audit.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
