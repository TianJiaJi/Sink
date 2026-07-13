import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { defu } from 'defu'
import { getAuthToken, removeAuthToken } from '@/utils/auth-token'

type APIOptions = Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
  headers?: Record<string, string>
}

export function useAPI<T = unknown>(api: string, options?: APIOptions): Promise<T> {
  const mergedOptions = defu(options || {}, {
    headers: {
      'Authorization': `Bearer ${getAuthToken() || ''}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  }) as NitroFetchOptions<NitroFetchRequest>

  return $fetch<T>(api, mergedOptions).catch((error) => {
    if (error?.status === 401) {
      removeAuthToken()
      if (import.meta.client && window.location.pathname !== '/dashboard/login')
        window.location.assign('/dashboard/login')
    }
    return Promise.reject(error)
  }) as Promise<T>
}
