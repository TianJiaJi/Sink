import type { ComputedRef, InjectionKey, Ref } from 'vue'

export const LINK_ID_KEY: InjectionKey<ComputedRef<string | undefined>> = Symbol('linkId')
export const REALTIME_PAUSED_KEY: InjectionKey<Ref<boolean>> = Symbol('realtimePaused')
