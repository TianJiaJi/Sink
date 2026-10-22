import { describe, expect, it } from 'vitest'
import { isPublicHttpUrl } from '../../server/utils/public-url'

describe('public HTTP target validation', () => {
  it.each(['https://example.com/path', 'http://example.com', 'https://1.1.1.1/dns-query'])('allows public target %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(true)
  })

  it.each([
    'not-a-url',
    'ftp://example.com/file',
    'file:///etc/passwd',
    'http://localhost',
    'http://localhost.',
    'http://app.localhost',
    'http://127.0.0.1',
    'http://127.1',
    'http://10.0.0.1',
    'http://100.64.0.1',
    'http://169.254.169.254',
    'http://172.16.0.1',
    'http://192.168.1.1',
    'http://198.18.0.1',
    'http://224.0.0.1',
    'http://[::1]',
    'http://[fc00::1]',
    'http://[fe80::1]',
    'http://[::ffff:127.0.0.1]',
  ])('rejects non-public or unsupported target %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(false)
  })
})
