import type { Link } from '#shared/schemas/link'
import { escape } from 'es-toolkit/string'
import { parseURL } from 'ufo'

const CLOAKING_IFRAME_SANDBOX = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
  'allow-downloads',
  'allow-modals',
].join(' ')

// Shared dark theme (zinc-950 base). Color tokens kept identical to the previous
// design; only depth/finish is upgraded (gradient, softer shadow, larger radius).
const REDIRECT_BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse 90% 70% at 50% -10%,#1c1c1f 0%,#09090b 55%);color:#fafafa;padding:1rem;-webkit-font-smoothing:antialiased}
  .card{position:relative;background:linear-gradient(180deg,#101012 0%,#0a0a0a 100%);border:1px solid #2a2a2e;border-radius:16px;padding:2.5rem 2rem 2rem;width:100%;max-width:380px;box-shadow:0 30px 60px -25px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.06)}
  .icon{width:44px;height:44px;margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(180deg,#2a2a2e,#18181b);border:1px solid #2a2a2e;color:#d4d4d8;box-shadow:0 6px 16px -6px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)}
  .icon svg{width:20px;height:20px}
  .icon.danger{color:#f87171;background:linear-gradient(180deg,rgba(239,68,68,.18),rgba(239,68,68,.05));border-color:rgba(239,68,68,.28)}
  h1{font-size:1.0625rem;font-weight:600;text-align:center;letter-spacing:-.02em}
  .btn{display:block;width:100%;padding:.625rem;border-radius:10px;font-size:.875rem;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;border:none;transition:background .15s ease,transform .1s ease,opacity .15s ease,box-shadow .15s ease}
  .btn-primary{background:linear-gradient(180deg,#fafafa,#e4e4e7);color:#18181b;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
  .btn-primary:hover:not(:disabled){background:linear-gradient(180deg,#fff,#e4e4e7)}
  .btn-primary:active:not(:disabled){transform:translateY(1px)}
  .btn-primary:disabled{opacity:.45;cursor:not-allowed}
  .btn-ghost{background:#18181b;border:1px solid #27272a;color:#d4d4d8}
  .btn-ghost:hover{background:#27272a}
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`

function buildMetaTags(link: Link, baseUrl: string) {
  const { host: hostname } = parseURL(link.url)
  const title = link.title || hostname || 'Link'
  const hasImage = !!link.image
  const imageUrl = hasImage && link.image!.startsWith('/')
    ? `${baseUrl}${link.image}`
    : link.image
  const twitterCard = hasImage ? 'summary_large_image' : 'summary'

  const tags = [
    link.description ? `<meta name="description" content="${escape(link.description)}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escape(baseUrl)}/${escape(link.slug)}">`,
    `<meta property="og:title" content="${escape(title)}">`,
    link.description ? `<meta property="og:description" content="${escape(link.description)}">` : '',
    hasImage ? `<meta property="og:image" content="${escape(imageUrl!)}">` : '',
    `<meta name="twitter:card" content="${twitterCard}">`,
    `<meta name="twitter:title" content="${escape(title)}">`,
    link.description ? `<meta name="twitter:description" content="${escape(link.description)}">` : '',
    hasImage ? `<meta name="twitter:image" content="${escape(imageUrl!)}">` : '',
  ].filter(Boolean).join('\n    ')

  return { title, tags }
}

export function generateCloakingHtml(link: Link, targetUrl: string, baseUrl: string): string {
  const { title, tags } = buildMetaTags(link, baseUrl)

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escape(title)}</title>
    ${tags}
</head>
<body style="margin:0;overflow:hidden">
    <iframe src="${escape(targetUrl)}" style="width:100%;height:100%;width:100vw;height:100vh;border:none" sandbox="${CLOAKING_IFRAME_SANDBOX}" allowfullscreen referrerpolicy="no-referrer"></iframe>
    <noscript><meta http-equiv="refresh" content="0;url=${escape(targetUrl)}"></noscript>
</body>
</html>`
}

interface PasswordHtmlOptions {
  hasError?: boolean
  locale?: RedirectLocale
  requireTurnstile?: boolean
  sitekey?: string
  turnstileError?: boolean
}

export function generatePasswordHtml(slug: string, options: PasswordHtmlOptions = {}): string {
  const { hasError = false, locale = 'en-US', requireTurnstile = false, sitekey = '', turnstileError = false } = options
  const t = REDIRECT_TRANSLATIONS[locale]
  const withTurnstile = requireTurnstile && !!sitekey
  const turnstileScript = withTurnstile
    ? '\n    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n    <script>function onTurnstileOk(){var b=document.getElementById("submit-btn");if(b)b.disabled=false;}</script>'
    : ''
  const lockIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  return `<!DOCTYPE html>
<html lang="${escape(locale)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escape(t.passwordTitle)}</title>${turnstileScript}
    <style>${REDIRECT_BASE_CSS}
      h1{margin-bottom:1.25rem}
      .error{color:#f87171;font-size:.8125rem;margin-bottom:.75rem;text-align:center;font-weight:500;padding:.5rem .75rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.22);border-radius:8px}
      .input-field{position:relative;margin-bottom:1.25rem}
      .field-icon{position:absolute;left:.9rem;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#71717a;pointer-events:none;transition:color .15s ease}
      .input-field:focus-within .field-icon{color:#a1a1aa}
      input[type=password]{width:100%;padding:.7rem .75rem .7rem 2.5rem;background:#09090b;border:1px solid #2a2a2e;border-radius:10px;font-size:.875rem;outline:none;color:#fafafa;transition:border-color .15s ease,box-shadow .15s ease}
      input[type=password]:focus{border-color:#3f3f46;box-shadow:0 0 0 3px rgba(63,63,70,.25)}
      input[type=password]::placeholder{color:#52525b}
      .cf-turnstile{margin-bottom:1.25rem;display:flex;justify-content:center}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${lockIcon}</div>
        <h1>${escape(t.passwordTitle)}</h1>${hasError ? `\n        <p class="error">${escape(t.passwordError)}</p>` : ''}${turnstileError ? `\n        <p class="error">${escape(t.turnstileError)}</p>` : ''}
        <form method="POST" action="/${escape(slug)}">${withTurnstile ? `\n            <div class="cf-turnstile" data-sitekey="${escape(sitekey)}" data-action="turnstile-spin-v2" data-callback="onTurnstileOk"></div>` : ''}
            <div class="input-field">
                <span class="field-icon">${lockIcon}</span>
                <input type="password" id="password" name="password" required autofocus placeholder="${escape(t.passwordPlaceholder)}">
            </div>
            <button type="submit" id="submit-btn" class="btn btn-primary"${withTurnstile ? ' disabled' : ''}>${escape(t.continue)}</button>
        </form>
    </div>
</body>
</html>`
}

export function generateTurnstileGateHtml(slug: string, sitekey: string, locale: RedirectLocale = 'en-US'): string {
  const t = REDIRECT_TRANSLATIONS[locale]
  return `<!DOCTYPE html>
<html lang="${escape(locale)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escape(t.turnstileVerifying)}</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>${REDIRECT_BASE_CSS}
      .card{text-align:center}
      .title{font-size:1rem;font-weight:600;margin-bottom:.5rem;letter-spacing:-.02em}
      .desc{font-size:.8125rem;color:#71717a;margin-bottom:1.5rem}
      .cf-turnstile{display:flex;justify-content:center}
      @keyframes spin{to{transform:rotate(360deg)}}
      .spinner{width:24px;height:24px;margin:0 auto 1.25rem;border-radius:50%;border:2px solid #27272a;border-top-color:#fafafa;animation:spin .8s linear infinite}
    </style>
    <script>function onTurnstileGateOk(){document.getElementById("turnstile-gate-form").submit();}</script>
</head>
<body>
    <div class="card">
        <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></div>
        <p class="title">${escape(t.turnstileVerifying)}</p>
        <div class="spinner"></div>
        <form method="POST" action="/${escape(slug)}" id="turnstile-gate-form">
            <div class="cf-turnstile" data-sitekey="${escape(sitekey)}" data-action="turnstile-spin-v2" data-callback="onTurnstileGateOk"></div>
            <input type="hidden" name="turnstile-gate" value="1">
        </form>
    </div>
</body>
</html>`
}

interface UnsafeWarningHtmlOptions {
  password?: string
  locale?: RedirectLocale
}

export function generateUnsafeWarningHtml(slug: string, targetUrl: string, options: UnsafeWarningHtmlOptions = {}): string {
  const { password, locale = 'en-US' } = options
  const t = REDIRECT_TRANSLATIONS[locale]
  return `<!DOCTYPE html>
<html lang="${escape(locale)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escape(t.unsafeTitle)}</title>
    <style>${REDIRECT_BASE_CSS}
      .card{max-width:420px}
      h1{color:#ef4444;margin-bottom:.75rem}
      .desc{font-size:.875rem;color:#a1a1aa;margin-bottom:1rem;line-height:1.5;text-align:center}
      .url{font-size:.8125rem;color:#a1a1aa;background:#09090b;border:1px solid #27272a;border-radius:8px;padding:.5rem .75rem;word-break:break-all;margin-bottom:1.5rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
      .actions{display:flex;gap:.75rem}
      .actions .btn{flex:1}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon danger"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg></div>
        <h1>${escape(t.unsafeTitle)}</h1>
        <p class="desc">${escape(t.unsafeDesc)}</p>
        <div class="url">${escape(targetUrl)}</div>
        <div class="actions">
            <a href="javascript:history.back()" class="btn btn-ghost">${escape(t.goBack)}</a>
            <form method="POST" action="/${escape(slug)}" style="flex:1;display:flex">
                <input type="hidden" name="confirm" value="true">${password ? `\n                <input type="hidden" name="password" value="${escape(password)}">` : ''}
                <button type="submit" class="btn btn-primary" style="width:100%">${escape(t.continue)}</button>
            </form>
        </div>
    </div>
</body>
</html>`
}

export function generateUnavailableHtml(reason: 'expired' | 'cap' | 'blocked' | 'disabled' | 'notfound', locale: RedirectLocale = 'en-US'): string {
  const t = REDIRECT_TRANSLATIONS[locale]
  const message = reason === 'expired'
    ? t.unavailableExpired
    : reason === 'cap'
      ? t.unavailableCap
      : reason === 'blocked'
        ? t.unavailableBlocked
        : reason === 'disabled'
          ? t.unavailableDisabled
          : t.unavailableNotFound
  // Clock for expired, ban for cap, globe for blocked, power for disabled, file-x for not found
  const icon = reason === 'expired'
    ? `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`
    : reason === 'cap'
      ? `<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>`
      : reason === 'blocked'
        ? `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>`
        : reason === 'disabled'
          ? `<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>`
          : `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 13 6 6"/><path d="m15 13-6 6"/>`
  return `<!DOCTYPE html>
<html lang="${escape(locale)}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>${escape(t.unavailableTitle)}</title>
    <style>${REDIRECT_BASE_CSS}
      h1{margin-bottom:.75rem}
      .desc{font-size:.875rem;color:#a1a1aa;line-height:1.5;text-align:center;margin-bottom:1.5rem}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
        <h1>${escape(t.unavailableTitle)}</h1>
        <p class="desc">${escape(message)}</p>
        <a href="javascript:history.back()" class="btn btn-ghost">${escape(t.goBack)}</a>
    </div>
</body>
</html>`
}

export function generateOgHtml(link: Link, targetUrl: string, baseUrl: string): string {
  const { title, tags } = buildMetaTags(link, baseUrl)

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escape(title)}</title>
    ${tags}
    <meta http-equiv="refresh" content="1;url=${escape(targetUrl)}">
</head>
<body>
    <p>Redirecting to <a href="${escape(targetUrl)}">${escape(targetUrl)}</a>...</p>
</body>
</html>`
}
