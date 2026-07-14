import type { LocaleObject } from '@nuxtjs/i18n'

const localeModules = [
  'core',
  'auth',
  'shell',
  'home',
  'dashboard',
  'links',
  'check',
  'migrate',
] as const

function localeFiles(code: string): string[] {
  return localeModules.map(module => `${code}/${module}.json`)
}

const locales: LocaleObject[] = [
  {
    code: 'en-US',
    files: localeFiles('en-US'),
    name: 'English',
    emoji: '🇺🇸',
  },
  {
    code: 'zh-CN',
    files: localeFiles('zh-CN'),
    name: '简体中文',
    emoji: '🇨🇳',
  },
  {
    code: 'zh-TW',
    files: localeFiles('zh-TW'),
    name: '繁體中文',
    emoji: '🇹🇼',
  },
  {
    code: 'fr-FR',
    files: localeFiles('fr-FR'),
    name: 'Français',
    emoji: '🇫🇷',
  },
  {
    code: 'id-ID',
    files: localeFiles('id-ID'),
    name: 'Bahasa Indonesia',
    emoji: '🇮🇩',
  },
  {
    code: 'ko-KR',
    files: localeFiles('ko-KR'),
    name: '한국어',
    emoji: '🇰🇷',
  },
  {
    code: 'it-IT',
    files: localeFiles('it-IT'),
    name: 'Italiano',
    emoji: '🇮🇹',
  },
  {
    code: 'vi-VN',
    files: localeFiles('vi-VN'),
    name: 'Tiếng Việt',
    emoji: '🇻🇳',
  },
  {
    code: 'de-DE',
    files: localeFiles('de-DE'),
    name: 'Deutsch',
    emoji: '🇩🇪',
  },
  {
    code: 'pt-PT',
    files: localeFiles('pt-PT'),
    name: 'Português (PT)',
    emoji: '🇵🇹',
  },
  {
    code: 'pt-BR',
    files: localeFiles('pt-BR'),
    name: 'Português (BR)',
    emoji: '🇧🇷',
  },
]

export const currentLocales = [...locales].sort((a, b) => a.code.localeCompare(b.code))
