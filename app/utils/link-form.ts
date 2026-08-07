import type { DashboardLink, DashboardLinkFormData } from '@/types/dashboard-links'
import { isMaskedLinkPassword } from '#shared/utils/link-password'
import { date2unix, unix2date } from './time'

export function createLinkFormInitialValues(link: Partial<DashboardLink>): DashboardLinkFormData {
  return {
    url: link.url ?? '',
    slug: link.slug ?? '',
    comment: link.comment ?? '',
    tags: link.tags ?? [],
    expiration: link.expiration ? unix2date(link.expiration) : undefined,
    google: link.google ?? '',
    apple: link.apple ?? '',
    title: link.title ?? '',
    description: link.description ?? '',
    image: link.image ?? '',
    cloaking: link.cloaking ?? false,
    turnstile: link.turnstile ?? false,
    disabled: link.disabled ?? false,
    burnAfterRead: link.burnAfterRead ?? false,
    countryBlock: link.countryBlock ?? [],
    countryAllow: link.countryAllow ?? [],
    ab: link.ab ? link.ab.map(v => ({ url: v.url, weight: v.weight })) : [],
    maxClicks: link.maxClicks ?? undefined,
    redirectWithQuery: link.redirectWithQuery ?? false,
    password: link.password ?? '',
    unsafe: link.unsafe ?? false,
    geo: link.geo ? Object.entries(link.geo).map(([country, url]) => ({ country, url })) : [],
  }
}

export function normalizeLinkFormSubmitPayload(value: DashboardLinkFormData, isEdit: boolean) {
  const geo: Record<string, string> = {}
  value.geo?.forEach((route) => {
    const country = route.country.trim().toUpperCase()
    const url = route.url.trim()
    if (country && url)
      geo[country] = url
  })

  let password: string | undefined = value.password
  if (isMaskedLinkPassword(password) || (!isEdit && password === ''))
    password = undefined

  return {
    url: value.url,
    slug: value.slug,
    comment: value.comment || undefined,
    tags: value.tags,
    expiration: value.expiration ? date2unix(value.expiration, 'end') : undefined,
    google: value.google || undefined,
    apple: value.apple || undefined,
    title: value.title || undefined,
    description: value.description || undefined,
    image: value.image || undefined,
    cloaking: value.cloaking,
    turnstile: value.turnstile,
    disabled: value.disabled,
    burnAfterRead: value.burnAfterRead,
    countryBlock: value.countryBlock?.length ? value.countryBlock : undefined,
    countryAllow: value.countryAllow?.length ? value.countryAllow : undefined,
    ab: value.ab?.length ? value.ab : undefined,
    maxClicks: value.maxClicks || undefined,
    redirectWithQuery: value.redirectWithQuery,
    password,
    unsafe: isEdit ? value.unsafe : value.unsafe || undefined,
    geo: Object.keys(geo).length > 0 ? geo : undefined,
  }
}
