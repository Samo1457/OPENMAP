// Public API of the library adapter. Other layers import this file only (spine Design Paradigm).
// It is the only data client (AD-27): it fills and reads the Library cache through `src/persistence`.

import { readLibraryCache, writeLibraryCache } from '@/persistence'
import { createGeoClient, type GeoClient } from './geo'

export { createGeoClient, GEO_FETCH_CONCURRENCY, GEO_ROOT, type GeoClient, type GeoClientOptions, type GeoStateRequest, type LibraryCache } from './geo'

/** The geo data client of the app: the app origin's `/library/v1/geo/…`, cached in Dexie. */
export const geo: GeoClient = createGeoClient({ cache: { read: readLibraryCache, write: writeLibraryCache } })
