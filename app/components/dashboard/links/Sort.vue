<script setup lang="ts">
import { ArrowUpDown } from 'lucide-vue-next'

const linksStore = useDashboardLinksStore()
</script>

<template>
  <TooltipProvider>
    <Tooltip :delay-duration="100">
      <DropdownMenu>
        <TooltipTrigger as-child>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              class="
                min-h-11
                lg:min-h-9
              "
              :aria-label="$t(`links.sort.${linksStore.sortBy}`)"
            >
              <ArrowUpDown
                class="
                  size-4
                  sm:mr-2
                "
              />
              <span
                class="
                  hidden
                  sm:inline
                "
              >
                {{ $t(`links.sort.${linksStore.sortBy}`) }}
              </span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="linksStore.sortBy = 'newest'">
            {{ $t('links.sort.newest') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="linksStore.sortBy = 'oldest'">
            {{ $t('links.sort.oldest') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="linksStore.sortBy = 'az'">
            {{ $t('links.sort.az') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="linksStore.sortBy = 'za'">
            {{ $t('links.sort.za') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>
        <p>{{ $t('links.sort.tip') }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
