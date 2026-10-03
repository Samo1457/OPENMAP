// The Playwright `test` of every spec: the geo data origin is mocked, so no test depends on
// `pipeline/out-geo` (CI and the Pages preview have none) and no request leaves the app origin. By
// default the dataset is empty (the pinned version, no entity): the Map draws no Territory, the
// date field shows no chip or caption. `reference-date.spec.ts` serves its own fixture data on top.
import { expect, test as base } from '@playwright/test'

export const EMPTY_GEO_INDEX = { schemaVersion: 1, dataset: { id: 'cliopatria', version: '0.2.0' }, entities: [] }

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/library/v1/geo/**', (route) => route.fulfill({ json: EMPTY_GEO_INDEX }))
    await use(context)
  },
})

export { expect }
