// Regenerates the tiny committed test fixtures (Story 1.8):
//   node pipeline/fixtures/generate.mjs
// Hand-made geometry, not Natural Earth data: two islands (one with a lake
// hole), a river, and three places; plus a 64x32 world GeoTIFF gradient.

import { writeFileSync } from 'node:fs'
import { writeArrayBuffer } from 'geotiff'

const dir = import.meta.dirname

function shpFile(shapeType, records) {
  const bodies = records.map((r, i) => {
    if (shapeType === 1) {
      const b = Buffer.alloc(8 + 20)
      b.writeInt32BE(i + 1, 0)
      b.writeInt32BE(10, 4)
      b.writeInt32LE(1, 8)
      b.writeDoubleLE(r.x, 12)
      b.writeDoubleLE(r.y, 20)
      return b
    }
    const points = r.parts.flat()
    const b = Buffer.alloc(8 + 44 + 4 * r.parts.length + 16 * points.length)
    b.writeInt32BE(i + 1, 0)
    b.writeInt32BE((b.length - 8) / 2, 4)
    b.writeInt32LE(shapeType, 8)
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    ;[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].forEach((v, k) => b.writeDoubleLE(v, 12 + 8 * k))
    b.writeInt32LE(r.parts.length, 44)
    b.writeInt32LE(points.length, 48)
    let start = 0
    r.parts.forEach((part, k) => {
      b.writeInt32LE(start, 52 + 4 * k)
      start += part.length
    })
    let pos = 52 + 4 * r.parts.length
    for (const [x, y] of points) {
      b.writeDoubleLE(x, pos)
      b.writeDoubleLE(y, pos + 8)
      pos += 16
    }
    return b
  })
  const all = records.flatMap((r) => (shapeType === 1 ? [[r.x, r.y]] : r.parts.flat()))
  const header = Buffer.alloc(100)
  header.writeInt32BE(9994, 0)
  header.writeInt32BE((100 + bodies.reduce((n, b) => n + b.length, 0)) / 2, 24)
  header.writeInt32LE(1000, 28)
  header.writeInt32LE(shapeType, 32)
  ;[Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))].forEach((v, k) => header.writeDoubleLE(v, 36 + 8 * k))
  return Buffer.concat([header, ...bodies])
}

function dbfFile(fields, rows) {
  const recordLength = 1 + fields.reduce((n, f) => n + f.length, 0)
  const header = Buffer.alloc(32 + 32 * fields.length + 1)
  header[0] = 3
  header.writeUInt32LE(rows.length, 4)
  header.writeUInt16LE(header.length, 8)
  header.writeUInt16LE(recordLength, 10)
  fields.forEach((f, i) => {
    header.write(f.name, 32 + 32 * i, 'ascii')
    header.write(f.type, 32 + 32 * i + 11, 'ascii')
    header[32 + 32 * i + 16] = f.length
  })
  header[header.length - 1] = 0x0d
  const body = rows.map((row) => {
    const b = Buffer.alloc(recordLength, 0x20)
    let pos = 1
    fields.forEach((f) => {
      const text = String(row[f.name] ?? '')
      const bytes = Buffer.from(text, 'utf8')
      if (f.type === 'N') bytes.copy(b, pos + f.length - bytes.length)
      else bytes.copy(b, pos, 0, f.length)
      pos += f.length
    })
    return b
  })
  return Buffer.concat([header, ...body, Buffer.from([0x1a])])
}

const ring = (x0, y0, x1, y1, clockwise = true) => {
  const r = [[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]
  return clockwise ? r : r.reverse()
}

const land = [
  { parts: [ring(-20, -10, 30, 30), ring(0, 5, 10, 15, false)] },
  { parts: [ring(60, 20, 100, 50)] },
]
writeFileSync(`${dir}/tiny-land.shp`, shpFile(5, land))
writeFileSync(`${dir}/tiny-land.dbf`, dbfFile([{ name: 'featurecla', type: 'C', length: 12 }, { name: 'scalerank', type: 'N', length: 3 }], [{ featurecla: 'Land', scalerank: 0 }, { featurecla: 'Land', scalerank: 0 }]))

const places = [
  { x: 2.35, y: 48.85, name: 'Paris', scalerank: 1, labelrank: 1, pop_max: 10858000 },
  { x: 12.5, y: 41.9, name: 'Rome', scalerank: 1, labelrank: 2, pop_max: 3500000 },
  { x: 5.9, y: 45.6, name: 'Chambéry', scalerank: 9, labelrank: 9, pop_max: 60000 },
]
writeFileSync(`${dir}/tiny-places.shp`, shpFile(1, places))
writeFileSync(
  `${dir}/tiny-places.dbf`,
  dbfFile([{ name: 'name', type: 'C', length: 30 }, { name: 'scalerank', type: 'N', length: 3 }, { name: 'labelrank', type: 'N', length: 3 }, { name: 'pop_max', type: 'N', length: 10 }, { name: 'adm0name', type: 'C', length: 20 }], places.map((p) => ({ ...p, adm0name: 'Dropped' }))),
)

// Place search fixtures (Story 1.12): two countries (the first in two parts, the large one being the
// main landmass) and three places, with the Natural Earth field names the search pipeline reads.
const countries = [
  { parts: [ring(10, 10, 30, 30), ring(60, 60, 62, 62)], NAME: 'Alphaland', NAME_EN: 'Alphaland', NAME_FR: 'Alphalande', ADM0_A3: 'ALP', ADMIN: 'Alphaland', LABEL_X: 20.5, LABEL_Y: 21.25, POP_EST: 5000000 },
  { parts: [ring(-30, -30, -10, -10)], NAME: 'Betaland', NAME_EN: 'Betaland', NAME_FR: 'Betaland', ADM0_A3: 'BET', ADMIN: 'Betaland', LABEL_X: -20, LABEL_Y: -20, POP_EST: 800000 },
]
writeFileSync(`${dir}/tiny-countries.shp`, shpFile(5, countries))
writeFileSync(
  `${dir}/tiny-countries.dbf`,
  dbfFile(
    [
      { name: 'NAME', type: 'C', length: 30 },
      { name: 'NAME_EN', type: 'C', length: 30 },
      { name: 'NAME_FR', type: 'C', length: 30 },
      { name: 'ADM0_A3', type: 'C', length: 5 },
      { name: 'ADMIN', type: 'C', length: 30 },
      { name: 'LABEL_X', type: 'N', length: 12 },
      { name: 'LABEL_Y', type: 'N', length: 12 },
      { name: 'POP_EST', type: 'N', length: 12 },
    ],
    countries,
  ),
)

const namedPlaces = [
  { x: 20.1234, y: 21.4321, NAME: 'Alphaville', NAME_EN: 'Alphaville', NAME_FR: 'Alphaville-sur-Mer', ADM0_A3: 'ALP', ADM0NAME: 'Alphaland', POP_MAX: 120000 },
  { x: -19.5, y: -20.25, NAME: 'Betatown', NAME_EN: 'Betatown', NAME_FR: 'Betatown', ADM0_A3: 'BET', ADM0NAME: 'Betaland', POP_MAX: 4500 },
  { x: 100, y: 10, NAME: 'Faraway', NAME_EN: 'Faraway', NAME_FR: 'Éloigné', ADM0_A3: 'ZZZ', ADM0NAME: 'Zedland', POP_MAX: 10 },
]
writeFileSync(`${dir}/tiny-places-names.shp`, shpFile(1, namedPlaces))
writeFileSync(
  `${dir}/tiny-places-names.dbf`,
  dbfFile(
    [
      { name: 'NAME', type: 'C', length: 30 },
      { name: 'NAME_EN', type: 'C', length: 30 },
      { name: 'NAME_FR', type: 'C', length: 30 },
      { name: 'ADM0_A3', type: 'C', length: 5 },
      { name: 'ADM0NAME', type: 'C', length: 20 },
      { name: 'POP_MAX', type: 'N', length: 10 },
    ],
    namedPlaces,
  ),
)

const W = 64
const H = 32
const values = new Uint8Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) values[y * W + x] = Math.round((x / (W - 1)) * 255)
const tiff = writeArrayBuffer(values, {
  width: W,
  height: H,
  ModelPixelScale: [360 / W, 180 / H, 0],
  ModelTiepoint: [0, 0, 0, -180, 90, 0],
  GTModelTypeGeoKey: 2,
  GTRasterTypeGeoKey: 1,
  GeographicTypeGeoKey: 4326,
})
writeFileSync(`${dir}/tiny-relief.tif`, Buffer.from(tiff))
