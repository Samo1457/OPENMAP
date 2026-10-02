declare module 'pbf' {
  export default class Pbf {
    constructor(buf?: Uint8Array)
    finish(): Uint8Array
    pos: number
    length: number
    readVarint(): number
    readSVarint(): number
    readString(): string
    readBytes(): Uint8Array
    readFields<T>(fn: (tag: number, result: T, pbf: Pbf) => void, result: T, end?: number): T
    writeVarintField(tag: number, value: number): void
    writeStringField(tag: number, value: string): void
    writeBytesField(tag: number, value: Uint8Array): void
    writeSVarintField(tag: number, value: number): void
    writeMessage<T>(tag: number, fn: (obj: T, pbf: Pbf) => void, obj: T): void
  }
}

declare module '@mapbox/vector-tile' {
  export class VectorTile {
    constructor(pbf: import('pbf').default)
    layers: Record<string, VectorTileLayer>
  }
  export class VectorTileLayer {
    length: number
    extent: number
    feature(index: number): { properties: Record<string, string | number>; type: number }
  }
}
declare module 'vt-pbf' {
  import type { LegacyTile } from 'geojson-vt'
  export function fromGeojsonVt(
    layers: Record<string, { features: LegacyTile['features'] }>,
    options?: { version?: number; extent?: number },
  ): Uint8Array
}

// Node provides WebAssembly; the ES2023 lib used for Node-side code does not declare it.
declare namespace WebAssembly {
  class Module {}
  function compile(bytes: Uint8Array): Promise<Module>
}
