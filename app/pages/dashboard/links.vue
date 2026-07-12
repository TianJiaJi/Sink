<script setup lang="ts">
import { AlertCircle, Database, Loader } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
})

const migration = useLinkMigration()
useDashboardLinksRouteState()

onMounted(() => {
  migration.autoMigration()
})
</script>

<template>
  <main v-if="migration.completed.value" class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <DashboardLinksEditor />
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardLinksSort />
      <DashboardLinksSearch
        class="max-sm:w-full"
      />
    </Teleport>

    <DashboardLinksFilters />
    <DashboardLinks />
  </main>
  <section
    v-else
    class="flex min-h-[50vh] items-center justify-center px-4"
  >
    <div
      v-if="migration.error.value"
      role="alert"
      class="flex max-w-md flex-col items-center gap-4 text-center"
    >
      <AlertCircle class="size-10 text-destructive" />
      <div class="space-y-1">
        <h2 class="font-semibold">
          {{ $t('links.migration_gate.failed_title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('links.migration_gate.failed_description') }}
        </p>
        <p class="text-xs wrap-break-word text-destructive">
          {{ migration.error.value }}
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        <Button :disabled="migration.running.value" @click="migration.autoMigration">
          {{ $t('links.migration_gate.retry') }}
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="/dashboard/migrate">
            {{ $t('links.migration_gate.open_migration') }}
          </NuxtLink>
        </Button>
      </div>
    </div>
    <div
      v-else
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-3 text-center"
    >
      <div class="relative">
        <Database class="size-10 text-muted-foreground" />
        <Loader class="absolute -right-3 -bottom-2 size-5 animate-spin" />
      </div>
      <p class="font-medium">
        {{ $t('links.migration_gate.loading') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ $t('links.migration_gate.scanned', { count: migration.totals.value.scanned }) }}
      </p>
    </div>
  </section>
</template>
