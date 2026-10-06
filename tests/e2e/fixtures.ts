// The Playwright `test` of every spec: the data origin is mocked, so no test depends on
// `pipeline/out*` (CI and the Pages preview have none) and no request leaves the app origin. By
// default the geo dataset is empty (the pinned version with its full source metadata, no entity): the
// Map draws no Territory, so no credit, the date field shows no chip or caption, and « Sources et
// licences » lists the loaded sources. `/library/v1/datasets.json` serves the metadata of the Basemap
// datasets. `reference-date.spec.ts` and `credit.spec.ts` serve their own fixture data on top.
import { expect, test as base } from '@playwright/test'
import { DATASETS_META, GEO_INDEX_WITH_META } from '../../src/core/testing/geo-fixtures'
import { SEARCH_INDEX } from '../../src/core/testing/search-fixtures'

/** The geo index of the pinned version with the dataset block the pipeline writes, and no entity. */
export const EMPTY_GEO_INDEX = { schemaVersion: 1, dataset: GEO_INDEX_WITH_META.dataset, entities: [] }

/** `datasets.json` as the Basemap pipeline writes it (Story 1.8): the metadata of every dataset, plus keys the client ignores. */
export const DATASETS_DOCUMENT = { schemaVersion: 1, datasets: DATASETS_META.map((meta) => ({ ...meta, kind: 'fixture' })) }

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/library/v1/geo/**', (route) => route.fulfill({ json: EMPTY_GEO_INDEX }))
    // The Basemap datasets metadata (Story 1.13): a fixture, never `pipeline/out/library/v1/datasets.json`.
    await context.route('**/library/v1/datasets.json', (route) => route.fulfill({ json: DATASETS_DOCUMENT }))
    // The place search index (Story 1.12) is loaded on the first focus of the search field: a small fixture, never `pipeline/out-search`.
    await context.route('**/library/v1/search/**', (route) => route.fulfill({ json: SEARCH_INDEX }))
    await use(context)
  },
})

export { expect }
