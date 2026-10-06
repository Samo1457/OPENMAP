// Public API of the library adapter. Other layers import this file only (spine Design Paradigm).
// It is the only data client (AD-27): it fills and reads the Library cache through `src/persistence`.

import { readLibraryCache, writeLibraryCache } from '@/persistence'
import { createDatasetsClient, type DatasetsClient } from './datasets'
import { createGeoClient, type GeoClient } from './geo'
import { createSearchClient, type SearchClient } from './search'

export { createDatasetsClient, DATASETS_CACHE_KEY, DATASETS_PATH, type DatasetsClient, type DatasetsClientOptions } from './datasets'
export { createSearchClient, SEARCH_CACHE_KEY, SEARCH_INDEX_PATH, type SearchClient, type SearchClientOptions } from './search'
export { createGeoClient, GEO_FETCH_CONCURRENCY, GEO_ROOT, type GeoClient, type GeoClientOptions, type GeoStateRequest, type LibraryCache } from './geo'

/** The geo data client of the app: the app origin's `/library/v1/geo/…`, cached in Dexie. */
export const geo: GeoClient = createGeoClient({ cache: { read: readLibraryCache, write: writeLibraryCache } })

/** The place search client of the app: the app origin's `/library/v1/search/index.json`, cached in Dexie. */
export const search: SearchClient = createSearchClient({ cache: { read: readLibraryCache, write: writeLibraryCache } })

/** The datasets metadata client of the app (Basemap sources, AD-17): `/library/v1/datasets.json`, cached in Dexie. */
export const datasets: DatasetsClient = createDatasetsClient({ cache: { read: readLibraryCache, write: writeLibraryCache } })
