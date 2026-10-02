// Cached, checksum-verified downloads (Story 1.8). A failed or corrupt
// download never leaves a partial file behind.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { inflateRawSync } from 'node:zlib'

export type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>

export class DownloadError extends Error {
  readonly url: string
  constructor(url: string, message: string) {
    super(`Download of ${url} failed: ${message}`)
    this.name = 'DownloadError'
    this.url = url
  }
}

/** A stalled server must not hang the pipeline forever. */
export const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000

export const sha256 = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex')

export interface FetchCachedOptions {
  url: string
  dest: string
  /** Expected hex SHA-256; empty skips verification with a warning. */
  sha256: string
  fetcher?: Fetcher
  warn?: (message: string) => void
}

/** Returns the file bytes, downloading only when the cache is missing or corrupt. */
export async function fetchCached(options: FetchCachedOptions): Promise<Uint8Array> {
  const { url, dest, fetcher = fetch, warn = console.warn } = options
  const expected = options.sha256
  if (existsSync(dest)) {
    const cached = new Uint8Array(readFileSync(dest))
    if (expected === '' || sha256(cached) === expected) {
      if (expected === '') warn(`No checksum pinned for ${url}; run with --pin to record it.`)
      return cached
    }
    rmSync(dest, { force: true })
  }

  const partial = `${dest}.part`
  try {
    const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))
    let data: Uint8Array
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (!response.ok) throw new DownloadError(url, `HTTP ${response.status}`)
      data = new Uint8Array(await response.arrayBuffer())
    } catch (error) {
      throw error instanceof DownloadError ? error : new DownloadError(url, reason(error))
    }
    if (expected === '') {
      warn(`No checksum pinned for ${url}; run with --pin to record it.`)
    } else if (sha256(data) !== expected) {
      throw new DownloadError(url, `checksum mismatch (expected ${expected}, got ${sha256(data)})`)
    }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(partial, data)
    renameSync(partial, dest)
    return data
  } catch (error) {
    rmSync(partial, { force: true })
    throw error
  }
}

const ZIP64 = 0xffffffff

/**
 * Extracts one member of a ZIP archive (stored or deflated). An exact basename
 * match wins over a name that merely ends with `member`; directory entries and
 * `__MACOSX/` resource forks are never picked. ZIP64 archives are refused.
 */
export function extractZipMember(zip: Uint8Array, member: string): Uint8Array {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  let eocd = -1
  for (let i = zip.byteLength - 22; i >= Math.max(0, zip.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('not a ZIP archive')
  const entries = view.getUint16(eocd + 10, true)
  let pos = view.getUint32(eocd + 16, true)
  if (entries === 0xffff || pos === ZIP64) throw new Error('ZIP64 archives are not supported')
  let exact: { method: number; start: number; size: number } | undefined
  let suffix: typeof exact
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('corrupt ZIP central directory')
    const method = view.getUint16(pos + 10, true)
    const compressedSize = view.getUint32(pos + 20, true)
    const nameLength = view.getUint16(pos + 28, true)
    const extraLength = view.getUint16(pos + 30, true)
    const commentLength = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLength))
    const usable = !name.endsWith('/') && !name.startsWith('__MACOSX/') && !name.includes('/__MACOSX/')
    if (usable && (name === member || name.endsWith(member))) {
      if (compressedSize === ZIP64 || localOffset === ZIP64) throw new Error('ZIP64 archives are not supported')
      const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
      const found = { method, start, size: compressedSize }
      if (name.split('/').pop() === member) {
        exact ??= found
      } else {
        suffix ??= found
      }
    }
    pos += 46 + nameLength + extraLength + commentLength
  }
  const hit = exact ?? suffix
  if (!hit) throw new Error(`no member ending with "${member}" in the archive`)
  const raw = zip.subarray(hit.start, hit.start + hit.size)
  if (hit.method === 0) return raw
  if (hit.method === 8) return new Uint8Array(inflateRawSync(raw))
  throw new Error(`unsupported ZIP compression method ${hit.method}`)
}
