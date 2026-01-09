<script setup lang="ts">
defineProps<{
  text?: string
  contentClass?: string
}>()
</script>

<template>
  <TooltipProvider v-if="text">
    <Tooltip>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipContent>
        <p :class="contentClass">
          {{ text }}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <slot v-else />
</template>
