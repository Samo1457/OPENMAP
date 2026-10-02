import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DownloadError, extractZipMember, fetchCached, sha256, type Fetcher } from './download.ts'
import { zipOf } from './test-helpers.ts'

const dirs: string[] = []
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'openmap-dl-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const payload = new TextEncoder().encode('natural earth')
const okFetcher = (): Fetcher => vi.fn<Fetcher>(async () => ({ ok: true, status: 200, arrayBuffer: async () => payload.slice().buffer }))

describe('fetchCached', () => {
  it('downloads once, then serves the cache without fetching', async () => {
    const dest = join(tmp(), 'a/b.shp')
    const fetcher = okFetcher()
    const args = { url: 'https://x.test/v1/b.shp', dest, sha256: sha256(payload), fetcher }
    expect(await fetchCached(args)).toEqual(payload)
    expect(await fetchCached(args)).toEqual(payload)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refuses a wrong checksum, names the URL and leaves no partial file', async () => {
    const dir = tmp()
    const dest = join(dir, 'b.shp')
    await expect(fetchCached({ url: 'https://x.test/v1/b.shp', dest, sha256: 'f'.repeat(64), fetcher: okFetcher() })).rejects.toThrow(/https:\/\/x\.test\/v1\/b\.shp.*checksum/)
    expect(readdirSync(dir)).toEqual([])
  })

  it('reports network errors and HTTP errors with the URL', async () => {
    const dest = join(tmp(), 'b.shp')
    const down: Fetcher = async () => {
      throw new Error('ECONNRESET')
    }
    await expect(fetchCached({ url: 'https://x.test/a', dest, sha256: '', fetcher: down })).rejects.toThrow(DownloadError)
    const notFound: Fetcher = async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })
    await expect(fetchCached({ url: 'https://x.test/a', dest, sha256: '', fetcher: notFound })).rejects.toThrow(/https:\/\/x\.test\/a.*404/)
    expect(existsSync(dest)).toBe(false)
    expect(existsSync(`${dest}.part`)).toBe(false)
  })

  it('re-downloads a corrupt cache entry', async () => {
    const dest = join(tmp(), 'b.shp')
    writeFileSync(dest, 'corrupt')
    const fetcher = okFetcher()
    expect(await fetchCached({ url: 'https://x.test/a', dest, sha256: sha256(payload), fetcher })).toEqual(payload)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('names the URL when the body cannot be read, and passes a timeout signal', async () => {
    const dest = join(tmp(), 'b.shp')
    const seen: (AbortSignal | undefined)[] = []
    const broken: Fetcher = async (_url, init) => {
      seen.push(init?.signal)
      return { ok: true, status: 200, arrayBuffer: async () => Promise.reject(new Error('socket hang up')) }
    }
    await expect(fetchCached({ url: 'https://x.test/body', dest, sha256: '', fetcher: broken })).rejects.toThrow(/https:\/\/x\.test\/body.*socket hang up/)
    expect(seen[0]).toBeInstanceOf(AbortSignal)
  })

  it('warns, never fails, when no checksum is pinned', async () => {
    const warn = vi.fn<(message: string) => void>()
    const dest = join(tmp(), 'b.shp')
    expect(await fetchCached({ url: 'https://x.test/a', dest, sha256: '', fetcher: okFetcher(), warn })).toEqual(payload)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--pin'))
  })
})

describe('extractZipMember', () => {
  const content = new TextEncoder().encode('tiff bytes '.repeat(50))
  it('extracts deflated and stored members by suffix', () => {
    expect(extractZipMember(zipOf('dir/GRAY.tif', content), 'GRAY.tif')).toEqual(content)
    expect(extractZipMember(zipOf('GRAY.tif', content, false), '.tif')).toEqual(content)
  })
  it('skips directory entries and __MACOSX forks, and prefers an exact basename', () => {
    expect(() => extractZipMember(zipOf('__MACOSX/._SR_HR.tif', content), 'SR_HR.tif')).toThrow(/no member/)
    expect(() => extractZipMember(zipOf('SR_HR.tif/', content), 'SR_HR.tif')).toThrow(/no member/)
    expect(extractZipMember(zipOf('x/SR_HR.tif', content), 'SR_HR.tif')).toEqual(content)
  })
  it('refuses ZIP64 sizes and offsets', () => {
    const zip = zipOf('a.tif', content)
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
    const eocd = zip.length - 22
    view.setUint32(eocd + 16, 0xffffffff, true)
    expect(() => extractZipMember(zip, 'a.tif')).toThrow(/ZIP64/)
  })
  it('fails clearly on a missing member or a non-ZIP file', () => {
    expect(() => extractZipMember(zipOf('a.txt', content), '.tif')).toThrow(/no member/)
    expect(() => extractZipMember(new Uint8Array(100), '.tif')).toThrow(/not a ZIP/)
  })
})
