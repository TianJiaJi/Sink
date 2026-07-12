import type { LogEvent } from '@/types'
import { useEventBus } from '@vueuse/core'

const trafficEventBus = useEventBus<LogEvent>(Symbol('traffic'))

/**
 * Traffic event bus for globe arc/ripple animations.
 * Wraps global event bus for testability and explicit dependency.
 */
export function useTrafficEventBus() {
  return trafficEventBus
}
