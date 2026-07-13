<script setup lang="ts">
const MIGRATE_TABS = ['links-export', 'links-import', 'access-export', 'backup', 'd1'] as const
type MigrateTab = typeof MIGRATE_TABS[number]

const DEFAULT_TAB: MigrateTab = 'links-export'
const route = useRoute()
const router = useRouter()

function parseTab(value: unknown): MigrateTab {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && MIGRATE_TABS.includes(candidate as MigrateTab)
    ? candidate as MigrateTab
    : DEFAULT_TAB
}

const activeTab = computed<MigrateTab>({
  get: () => parseTab(route.query.tab),
  set: (tab) => {
    const query = { ...route.query }
    if (tab === DEFAULT_TAB)
      delete query.tab
    else
      query.tab = tab

    void router.push({ path: route.path, query, hash: route.hash })
  },
})

watch(
  () => route.query.tab,
  (value) => {
    const tab = parseTab(value)
    const isCanonical = tab === DEFAULT_TAB
      ? value === undefined
      : value === tab

    if (isCanonical)
      return

    const query = { ...route.query }
    if (tab === DEFAULT_TAB)
      delete query.tab
    else
      query.tab = tab
    void router.replace({ path: route.path, query, hash: route.hash })
  },
  { immediate: true },
)
</script>

<template>
  <Tabs v-model="activeTab" default-value="links-export" class="min-w-0">
    <div class="max-w-full overflow-x-auto pb-1">
      <TabsList
        class="
          h-auto min-h-11 min-w-max
          lg:h-9 lg:min-h-0
        "
      >
        <TabsTrigger
          value="links-export" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('migrate.export.title') }}
        </TabsTrigger>
        <TabsTrigger
          value="links-import" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('migrate.import.title') }}
        </TabsTrigger>
        <TabsTrigger
          value="access-export" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('migrate.access_export.title') }}
        </TabsTrigger>
        <TabsTrigger
          value="backup" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('migrate.backup.title') }}
        </TabsTrigger>
        <TabsTrigger
          value="d1" class="
            min-h-11
            lg:min-h-0
          "
        >
          {{ $t('migrate.d1.title') }}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent
      value="links-export"
      force-mount
      :hidden="activeTab !== 'links-export'"
      class="mt-0"
    >
      <DashboardMigrateExport />
    </TabsContent>
    <TabsContent
      value="links-import"
      force-mount
      :hidden="activeTab !== 'links-import'"
      class="mt-0"
    >
      <DashboardMigrateImport />
    </TabsContent>
    <TabsContent
      value="access-export"
      force-mount
      :hidden="activeTab !== 'access-export'"
      class="mt-0"
    >
      <DashboardMigrateAccessExport />
    </TabsContent>
    <TabsContent
      value="backup"
      force-mount
      :hidden="activeTab !== 'backup'"
      class="mt-0"
    >
      <DashboardMigrateBackup />
    </TabsContent>
    <TabsContent
      value="d1"
      force-mount
      :hidden="activeTab !== 'd1'"
      class="mt-0"
    >
      <DashboardMigrateD1 />
    </TabsContent>
  </Tabs>
</template>
