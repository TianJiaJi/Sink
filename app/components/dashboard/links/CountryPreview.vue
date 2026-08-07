<script setup lang="ts">
import type { Link } from '@/types'
import { ShieldAlert } from '@lucide/vue'

const props = defineProps<{ link: Link }>()
const selectedCountry = ref('')

const result = computed(() => {
  if (!selectedCountry.value)
    return null
  const code = selectedCountry.value
  if (props.link.disabled)
    return { kind: 'blocked' as const, reason: 'disabled' as const }
  if (evalCountryGate(props.link, code) === 'block')
    return { kind: 'blocked' as const, reason: 'geo' as const }
  const geoUrl = props.link.geo?.[code]
  return { kind: 'redirect' as const, url: geoUrl ?? props.link.url, fromGeo: !!geoUrl }
})
</script>

<template>
  <Card>
    <CardContent class="space-y-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">
          {{ $t('links.country_preview_title') }}
        </h3>
      </div>
      <p class="text-xs text-muted-foreground">
        {{ $t('links.select_country_to_preview') }}
      </p>
      <DashboardLinksEditorCountrySelect
        id="country-preview"
        :model-value="selectedCountry"
        :placeholder="$t('links.select_country_to_preview')"
        :search-placeholder="$t('links.form.search_country')"
        :empty-text="$t('links.form.no_country_found')"
        @update:model-value="selectedCountry = $event"
      />
      <div v-if="result" class="rounded-lg border border-border p-3 text-sm">
        <template v-if="result.kind === 'blocked'">
          <div class="flex items-center gap-2 font-medium text-destructive">
            <ShieldAlert aria-hidden="true" class="size-4 shrink-0" />
            <span>{{ $t('links.preview_blocked') }}</span>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">{{ $t('links.target_url') }}</span>
            <a
              :href="result.url"
              target="_blank"
              rel="noopener noreferrer"
              class="
                truncate break-all text-primary
                hover:underline
              "
            >
              {{ result.url }}
            </a>
            <span class="text-xs text-muted-foreground">
              {{ result.fromGeo ? $t('links.from_geo') : $t('links.from_default') }}
            </span>
            <p
              v-if="link.ab?.length" class="
                mt-1 text-xs text-amber-600
                dark:text-amber-400
              "
            >
              {{ $t('links.ab_target_random') }}
            </p>
          </div>
        </template>
      </div>
    </CardContent>
  </Card>
</template>
