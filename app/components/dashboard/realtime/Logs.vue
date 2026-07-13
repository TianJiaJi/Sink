<script setup lang="ts">
const emit = defineEmits<{
  errorChange: [value: boolean]
}>()

const { logs, loading, error, hasSnapshot, isPaused, retry } = useRealtimeLogs()

watch(error, value => emit('errorChange', value), { immediate: true })
</script>

<template>
  <section class="lg:w-72" :aria-label="$t('nav.realtime')">
    <div
      v-if="error && !logs.length"
      class="flex h-full items-center justify-center text-sm text-destructive"
      role="alert"
    >
      {{ $t('dashboard.realtime.events_error') }}
      <Button type="button" variant="link" class="text-destructive" @click="retry">
        {{ $t('common.try_again') }}
      </Button>
    </div>
    <div
      v-else-if="loading && !hasSnapshot"
      class="
        flex h-full items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.loading') }}
    </div>
    <div
      v-else-if="!logs.length"
      class="
        flex h-full items-center justify-center text-sm text-muted-foreground
      "
      role="status"
    >
      {{ $t('dashboard.no_data') }}
    </div>
    <div v-else class="flex h-full min-h-0 flex-col">
      <div
        v-if="error"
        class="flex items-center justify-center text-sm text-destructive"
        role="alert"
      >
        {{ $t('dashboard.realtime.events_error') }}
        <Button type="button" variant="link" class="text-destructive" @click="retry">
          {{ $t('common.try_again') }}
        </Button>
      </div>
      <SparkUiAnimatedList
        class="min-h-0 flex-1"
        role="log"
        :aria-live="isPaused ? 'off' : 'polite'"
        aria-relevant="additions"
      >
        <SparkUiNotification
          v-for="item in logs"
          :key="item.id"
          :name="item.slug"
          :description="[item.os, item.browser].filter(Boolean).join(' ')"
          :icon="getFlag(item.country || '')"
          :time="item.timestamp"
          class="w-full"
        />
      </SparkUiAnimatedList>
    </div>
  </section>
</template>
