<script setup lang="ts">
withDefaults(defineProps<{
  href: string
  block?: boolean
  size?: 'lg' | 'md'
  type?: 'outline' | 'primary' | 'inverted' | 'muted'
  className?: string
}>(), {
  block: false,
  size: 'md',
  type: 'primary',
  className: '',
})

const sizes: Record<string, string> = {
  lg: 'px-5 py-2.5',
  md: 'px-4 py-2',
}

const styles: Record<string, string> = {
  outline: 'bg-white border-2 border-black hover:bg-gray-100 text-black',
  primary: 'bg-black text-white hover:bg-gray-800 border-2 border-transparent',
  inverted: 'bg-white text-black border-2 border-transparent',
  muted: 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent',
}
</script>

<template>
  <a
    :href="href"
    class="
      rounded text-center ring-gray-200 ring-offset-2 transition
      focus-visible:ring-2
    "
    :class="[
      block && 'w-full',
      sizes[size],
      styles[type],
      className,
    ]"
    v-bind="$attrs"
  >
    <slot />
  </a>
</template>
