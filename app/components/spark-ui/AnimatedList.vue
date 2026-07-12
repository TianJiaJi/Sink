<script lang="ts" setup>
import { usePreferredReducedMotion } from '@vueuse/core'
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()

const reducedMotion = usePreferredReducedMotion()
</script>

<template>
  <div :class="cn('overflow-auto', $props.class)">
    <transition-group
      :name="reducedMotion === 'reduce' ? undefined : 'list'"
      tag="div"
      class="flex flex-col items-center gap-2 p-2"
    >
      <slot />
    </transition-group>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active,
.list-move {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
