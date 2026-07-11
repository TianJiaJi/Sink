<script setup lang="ts">
import { AlertCircle, CheckCircle2, Database, Loader, RefreshCw } from 'lucide-vue-next'

const migration = useLinkMigration()
const manualRunStarted = shallowRef(false)

const markerDate = computed(() => {
  if (!migration.marker.value)
    return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(migration.marker.value.completedAt))
})

onMounted(() => {
  migration.refreshStatus()
})

function runAgain() {
  manualRunStarted.value = true
  void migration.forceMigration()
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader>
      <div class="flex items-start gap-3">
        <Database class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div class="space-y-1">
          <CardTitle>{{ $t('migrate.d1.title') }}</CardTitle>
          <CardDescription>{{ $t('migrate.d1.description') }}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="rounded-lg border bg-muted/30 p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2
            v-if="migration.completed.value && !migration.running.value"
            class="size-4 text-green-600"
          />
          <Loader
            v-else-if="migration.running.value"
            class="size-4 animate-spin"
          />
          <AlertCircle v-else class="size-4 text-muted-foreground" />
          <span>{{ $t('migrate.d1.status_title') }}</span>
        </div>
        <p
          class="mt-1 text-sm text-muted-foreground"
          :role="migration.running.value ? 'status' : undefined"
          :aria-live="migration.running.value ? 'polite' : undefined"
        >
          {{ $t(migration.running.value ? 'migrate.d1.running' : migration.completed.value ? 'migrate.d1.status_completed' : 'migrate.d1.status_pending') }}
        </p>
        <p v-if="markerDate" class="mt-1 text-xs text-muted-foreground">
          {{ $t('migrate.d1.completed_at', { date: markerDate }) }}
        </p>
        <p
          v-else-if="migration.checked.value && !migration.running.value"
          class="mt-1 text-xs text-muted-foreground"
        >
          {{ $t('migrate.d1.no_marker') }}
        </p>
      </div>

      <div
        v-if="migration.running.value || migration.totals.value.scanned > 0"
        :role="migration.running.value ? 'status' : undefined"
        :aria-live="migration.running.value ? 'polite' : undefined"
        class="space-y-3"
      >
        <div
          v-if="migration.running.value" class="
            h-1.5 overflow-hidden rounded-full bg-muted
          "
        >
          <div class="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
        <div
          class="
            grid grid-cols-2 gap-2 text-sm
            sm:grid-cols-3
          "
        >
          <span>{{ $t('migrate.d1.scanned') }}: {{ migration.totals.value.scanned }}</span>
          <span>{{ $t('migrate.d1.inserted') }}: {{ migration.totals.value.inserted }}</span>
          <span>{{ $t('migrate.d1.skipped') }}: {{ migration.totals.value.skipped }}</span>
          <span>{{ $t('migrate.d1.expired') }}: {{ migration.totals.value.expired }}</span>
          <span>{{ $t('migrate.d1.failed_count') }}: {{ migration.totals.value.failed }}</span>
        </div>
      </div>

      <div
        v-if="migration.error.value"
        role="alert"
        class="
          rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm
          text-destructive
        "
      >
        <p class="font-medium">
          {{ $t('migrate.d1.failed') }}
        </p>
        <p class="mt-1 text-xs wrap-break-word">
          {{ migration.error.value }}
        </p>
      </div>
      <p
        v-else-if="manualRunStarted && migration.completed.value && !migration.running.value"
        role="status"
        aria-live="polite"
        class="
          text-sm text-green-700
          dark:text-green-400
        "
      >
        {{ $t('migrate.d1.success') }}
      </p>

      <Button
        variant="outline"
        :disabled="migration.running.value"
        aria-label="Run KV to D1 migration again"
        @click="runAgain"
      >
        <Loader v-if="migration.running.value" class="mr-2 size-4 animate-spin" />
        <RefreshCw v-else class="mr-2 size-4" />
        {{ $t(migration.running.value ? 'migrate.d1.running' : 'migrate.d1.run_again') }}
      </Button>
    </CardContent>
  </Card>
</template>
