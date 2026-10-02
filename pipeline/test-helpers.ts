// Shared helpers for the pipeline tests.

import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'
import { PMTiles, type RangeResponse, type Source } from 'pmtiles'

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))

export class MemorySource implements Source {
  readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  getKey() {
    return 'memory'
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const slice = new Uint8Array(this.bytes.subarray(offset, offset + length))
    return { data: slice.buffer as ArrayBuffer }
  }
}

export const openArchive = (bytes: Uint8Array) => new PMTiles(new MemorySource(bytes))

/** A one-member ZIP archive, deflated or stored. */
export function zipOf(name: string, content: Uint8Array, deflate = true): Uint8Array {
  const data = deflate ? new Uint8Array(deflateRawSync(content)) : content
  const nameBytes = new TextEncoder().encode(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(deflate ? 8 : 0, 8)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(content.length, 22)
  local.writeUInt16LE(nameBytes.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(deflate ? 8 : 0, 10)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(content.length, 24)
  central.writeUInt16LE(nameBytes.length, 28)
  const centralOffset = local.length + nameBytes.length + data.length
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + nameBytes.length, 12)
  end.writeUInt32LE(centralOffset, 16)
  return new Uint8Array(Buffer.concat([local, nameBytes, data, central, nameBytes, end]))
}
