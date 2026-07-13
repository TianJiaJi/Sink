import type { Link } from '#shared/schemas/link'

interface BackupJsonStreamOptions {
  version: string
  exportedAt: string
  count: number
  linksByteLength: number
}

const encoder = new TextEncoder()

export function getSerializedLinkByteLength(link: Link): number {
  return encoder.encode(JSON.stringify(link)).byteLength
}

export function createBackupJsonStream(links: AsyncIterable<Link>, options: BackupJsonStreamOptions): ReadableStream<Uint8Array> {
  const iterator = links[Symbol.asyncIterator]()
  const prefix = encoder.encode(`{"version":${JSON.stringify(options.version)},"exportedAt":${JSON.stringify(options.exportedAt)},"count":${options.count},"links":[`)
  const expectedByteLength = prefix.byteLength + options.linksByteLength + Math.max(0, options.count - 1) + 2
  const stream = new FixedLengthStream(expectedByteLength)
  const writer = stream.writable.getWriter()

  async function serialize(): Promise<void> {
    let emitted = 0
    try {
      await writer.write(prefix)
      while (true) {
        const next = await iterator.next()
        if (next.done)
          break

        if (emitted >= options.count)
          throw new Error(`Backup link count changed during export: expected ${options.count}, received more`)

        await writer.write(encoder.encode(`${emitted ? ',' : ''}${JSON.stringify(next.value)}`))
        emitted++
      }

      if (emitted !== options.count)
        throw new Error(`Backup link count changed during export: expected ${options.count}, received ${emitted}`)

      await writer.write(encoder.encode(']}'))
      await writer.close()
    }
    catch (error) {
      if (iterator.return) {
        try {
          await iterator.return()
        }
        catch {
          // Preserve the serialization error that caused the stream to fail.
        }
      }
      try {
        await writer.abort(error)
      }
      catch {
        // The consumer may already have canceled the stream.
      }
    }
  }

  void serialize()
  return stream.readable
}
