import type { H3Event } from 'h3'
import { parseAcceptLanguage } from 'intl-parse-accept-language'

interface RedirectTranslation {
  passwordTitle: string
  passwordLabel: string
  passwordPlaceholder: string
  passwordError: string
  continue: string
  unsafeTitle: string
  unsafeDesc: string
  goBack: string
  turnstileVerifying: string
  turnstileError: string
  unavailableTitle: string
  unavailableExpired: string
  unavailableCap: string
  unavailableBlocked: string
  unavailableDisabled: string
  unavailableNotFound: string
}

const REDIRECT_LOCALES = [
  'de-DE',
  'en-US',
  'fr-FR',
  'id-ID',
  'it-IT',
  'pt-BR',
  'pt-PT',
  'vi-VN',
  'zh-CN',
  'zh-TW',
] as const

export type RedirectLocale = typeof REDIRECT_LOCALES[number]

const DEFAULT_REDIRECT_LOCALE = 'en-US' satisfies RedirectLocale
const REDIRECT_LOCALE_COOKIE = 'sink_i18n_redirected'

export const REDIRECT_TRANSLATIONS = {
  'de-DE': {
    passwordTitle: 'Passwort erforderlich',
    passwordLabel: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben',
    passwordError: 'Falsches Passwort',
    continue: 'Weiter',
    unsafeTitle: 'Potenziell unsicherer Link',
    unsafeDesc: 'Dieser Link wurde als potenziell unsicher markiert. Gehen Sie mit Vorsicht vor.',
    goBack: 'Zurück',
    turnstileVerifying: 'Verifizierung, dass Sie ein Mensch sind…',
    turnstileError: 'Bitte schließen Sie die Verifizierung ab und versuchen Sie es erneut.',
    unavailableTitle: 'Nicht verfügbar',
    unavailableExpired: 'Dieser Link ist abgelaufen.',
    unavailableCap: 'Dieser Link hat sein Besuchslimit erreicht.',
    unavailableBlocked: 'Dieser Link ist in Ihrer Region nicht verfügbar.',
    unavailableDisabled: 'Dieser Link wurde vom Administrator deaktiviert.',
    unavailableNotFound: 'Dieser Link existiert nicht oder wurde entfernt.',
  },
  'en-US': {
    passwordTitle: 'Password Required',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    passwordError: 'Incorrect password',
    continue: 'Continue',
    unsafeTitle: 'Potentially Unsafe Link',
    unsafeDesc: 'This link has been flagged as potentially unsafe. Proceed with caution.',
    goBack: 'Go Back',
    turnstileVerifying: 'Verifying you are human…',
    turnstileError: 'Please complete the verification and try again.',
    unavailableTitle: 'Unavailable',
    unavailableExpired: 'This link has expired.',
    unavailableCap: 'This link has reached its visit limit.',
    unavailableBlocked: 'This link is not available in your region.',
    unavailableDisabled: 'This link has been disabled by the administrator.',
    unavailableNotFound: 'This link does not exist or has been removed.',
  },
  'fr-FR': {
    passwordTitle: 'Mot de passe requis',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez le mot de passe',
    passwordError: 'Mot de passe incorrect',
    continue: 'Continuer',
    unsafeTitle: 'Lien potentiellement dangereux',
    unsafeDesc: 'Ce lien a été signalé comme potentiellement dangereux. Procédez avec prudence.',
    goBack: 'Retour',
    turnstileVerifying: 'Vérification que vous êtes humain…',
    turnstileError: 'Veuillez terminer la vérification et réessayer.',
    unavailableTitle: 'Indisponible',
    unavailableExpired: 'Ce lien a expiré.',
    unavailableCap: 'Ce lien a atteint sa limite de visites.',
    unavailableBlocked: 'Ce lien est indisponible dans votre région.',
    unavailableDisabled: 'Ce lien a été désactivé par un administrateur.',
    unavailableNotFound: 'Ce lien est introuvable ou a été supprimé.',
  },
  'id-ID': {
    passwordTitle: 'Diperlukan Kata Sandi',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Masukkan kata sandi',
    passwordError: 'Kata sandi salah',
    continue: 'Lanjutkan',
    unsafeTitle: 'Tautan Berpotensi Tidak Aman',
    unsafeDesc: 'Tautan ini telah ditandai berpotensi tidak aman. Lanjutkan dengan hati-hati.',
    goBack: 'Kembali',
    turnstileVerifying: 'Memverifikasi bahwa Anda manusia…',
    turnstileError: 'Selesaikan verifikasi terlebih dahulu, lalu coba lagi.',
    unavailableTitle: 'Tidak Tersedia',
    unavailableExpired: 'Tautan ini telah kedaluwarsa.',
    unavailableCap: 'Tautan ini telah mencapai batas kunjungan.',
    unavailableBlocked: 'Tautan ini tidak tersedia di wilayah Anda.',
    unavailableDisabled: 'Tautan ini telah dinonaktifkan oleh administrator.',
    unavailableNotFound: 'Tautan ini tidak ada atau telah dihapus.',
  },
  'it-IT': {
    passwordTitle: 'Password richiesta',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Inserisci la password',
    passwordError: 'Password errata',
    continue: 'Continuare',
    unsafeTitle: 'Link potenzialmente non sicuro',
    unsafeDesc: 'Questo link è stato contrassegnato come potenzialmente non sicuro. Procedi con cautela.',
    goBack: 'Indietro',
    turnstileVerifying: 'Verifica che tu sia umano…',
    turnstileError: 'Completa la verifica e riprova.',
    unavailableTitle: 'Non disponibile',
    unavailableExpired: 'Questo link è scaduto.',
    unavailableCap: 'Questo link ha raggiunto il limite di visite.',
    unavailableBlocked: 'Questo link non è disponibile nella tua regione.',
    unavailableDisabled: 'Questo link è stato disabilitato da un amministratore.',
    unavailableNotFound: 'Questo link non esiste o è stato rimosso.',
  },
  'pt-BR': {
    passwordTitle: 'Senha necessária',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Digite a senha',
    passwordError: 'Senha incorreta',
    continue: 'Continuar',
    unsafeTitle: 'Link potencialmente inseguro',
    unsafeDesc: 'Este link foi sinalizado como potencialmente inseguro. Prossiga com cuidado.',
    goBack: 'Voltar',
    turnstileVerifying: 'Verificando se você é humano…',
    turnstileError: 'Conclua a verificação e tente novamente.',
    unavailableTitle: 'Indisponível',
    unavailableExpired: 'Este link expirou.',
    unavailableCap: 'Este link atingiu o limite de visitas.',
    unavailableBlocked: 'Este link não está disponível na sua região.',
    unavailableDisabled: 'Este link foi desativado pelo administrador.',
    unavailableNotFound: 'Este link não existe ou foi removido.',
  },
  'pt-PT': {
    passwordTitle: 'Palavra-passe necessária',
    passwordLabel: 'Palavra-passe',
    passwordPlaceholder: 'Introduza a palavra-passe',
    passwordError: 'Palavra-passe incorreta',
    continue: 'Continuar',
    unsafeTitle: 'Ligação potencialmente insegura',
    unsafeDesc: 'Esta ligação foi assinalada como potencialmente insegura. Prossiga com cuidado.',
    goBack: 'Voltar',
    turnstileVerifying: 'A verificar se é humano…',
    turnstileError: 'Conclua a verificação e tente novamente.',
    unavailableTitle: 'Indisponível',
    unavailableExpired: 'Esta ligação expirou.',
    unavailableCap: 'Esta ligação atingiu o limite de visitas.',
    unavailableBlocked: 'Esta ligação não está disponível na sua região.',
    unavailableDisabled: 'Esta ligação foi desativada pelo administrador.',
    unavailableNotFound: 'Esta ligação não existe ou foi removida.',
  },
  'vi-VN': {
    passwordTitle: 'Yêu cầu mật khẩu',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu',
    passwordError: 'Mật khẩu không đúng',
    continue: 'Tiếp tục',
    unsafeTitle: 'Liên kết có thể không an toàn',
    unsafeDesc: 'Liên kết này đã bị đánh dấu là có thể không an toàn. Hãy thận trọng khi tiếp tục.',
    goBack: 'Quay lại',
    turnstileVerifying: 'Đang xác minh bạn là người…',
    turnstileError: 'Vui lòng hoàn thành xác minh rồi thử lại.',
    unavailableTitle: 'Không khả dụng',
    unavailableExpired: 'Liên kết này đã hết hạn.',
    unavailableCap: 'Liên kết này đã đạt giới hạn lượt truy cập.',
    unavailableBlocked: 'Liên kết này không khả dụng ở khu vực của bạn.',
    unavailableDisabled: 'Liên kết này đã bị quản trị viên tắt.',
    unavailableNotFound: 'Liên kết này không tồn tại hoặc đã bị xóa.',
  },
  'zh-CN': {
    passwordTitle: '需要密码',
    passwordLabel: '密码',
    passwordPlaceholder: '请输入密码',
    passwordError: '密码错误',
    continue: '继续',
    unsafeTitle: '潜在不安全链接',
    unsafeDesc: '此链接已被标记为潜在不安全。请谨慎访问。',
    goBack: '返回',
    turnstileVerifying: '正在验证你是否为真人…',
    turnstileError: '请先完成验证后再试。',
    unavailableTitle: '暂不可用',
    unavailableExpired: '此链接已过期。',
    unavailableCap: '此链接的访问次数已达上限。',
    unavailableBlocked: '此链接在你的地区不可用。',
    unavailableDisabled: '此链接已被管理员停用。',
    unavailableNotFound: '此链接不存在或已被删除。',
  },
  'zh-TW': {
    passwordTitle: '需要密碼',
    passwordLabel: '密碼',
    passwordPlaceholder: '請輸入密碼',
    passwordError: '密碼錯誤',
    continue: '繼續',
    unsafeTitle: '潛在不安全連結',
    unsafeDesc: '此連結已被標記為潛在不安全。請謹慎訪問。',
    goBack: '返回',
    turnstileVerifying: '正在驗證你是否為真人…',
    turnstileError: '請先完成驗證後再試。',
    unavailableTitle: '暫不可用',
    unavailableExpired: '此連結已過期。',
    unavailableCap: '此連結的造訪次數已達上限。',
    unavailableBlocked: '此連結在你的地區不可用。',
    unavailableDisabled: '此連結已被管理員停用。',
    unavailableNotFound: '此連結不存在或已被刪除。',
  },
} as const satisfies Record<RedirectLocale, RedirectTranslation>

const SUPPORTED_LOCALES = [...REDIRECT_LOCALES]

const LOCALE_ALIASES: Record<string, RedirectLocale> = {
  'de': 'de-DE',
  'en': 'en-US',
  'fr': 'fr-FR',
  'id': 'id-ID',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'vi': 'vi-VN',
  'zh': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-MO': 'zh-TW',
}

function normalizeLocaleCode(code: string): string {
  const normalized = code.replace('_', '-')
  try {
    return Intl.getCanonicalLocales(normalized)[0] || ''
  }
  catch {
    return ''
  }
}

function resolveLocaleCode(code: string | undefined): RedirectLocale | undefined {
  if (!code)
    return undefined

  const normalized = normalizeLocaleCode(code)
  if (!normalized)
    return undefined

  if (SUPPORTED_LOCALES.includes(normalized as RedirectLocale))
    return normalized as RedirectLocale

  const alias = LOCALE_ALIASES[normalized]
  if (alias)
    return alias

  const prefix = normalized.split('-')[0]
  return prefix ? LOCALE_ALIASES[prefix] : undefined
}

export function resolveRedirectLocale(event: H3Event): RedirectLocale {
  const cookieLocale = resolveLocaleCode(getCookie(event, REDIRECT_LOCALE_COOKIE))
  if (cookieLocale)
    return cookieLocale

  const header = getHeader(event, 'accept-language')
  if (!header)
    return DEFAULT_REDIRECT_LOCALE

  for (const code of parseAcceptLanguage(header)) {
    const locale = resolveLocaleCode(code)
    if (locale)
      return locale
  }

  return DEFAULT_REDIRECT_LOCALE
}
