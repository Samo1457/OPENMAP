// A small deterministic search dataset for core, library and e2e tests (never imported by app code):
// the shape of Story 1.12's index, a few countries and cities with both names, and a few GeoEntities.

import { type GeoGeometry, type GeoIndex, stateKey } from '../geo/geo'
import { CLIOPATRIA_META } from './geo-fixtures'
import { SEARCH_DATASET_ID, SEARCH_DATASET_VERSION, type SearchIndex } from '../search/search-index'

const country = (en: string, fr: string, lon: number, lat: number, bounds: [number, number, number, number], pop: number) => ({ en, fr, lon, lat, bounds, pop })

/** Countries: 0 France, 1 Germany, 2 Ivory Coast, 3 United Kingdom, 4 Ukraine, 5 Canada, 6 United States of America, 7 Italy. */
export const SEARCH_INDEX: SearchIndex = {
  schemaVersion: 1,
  dataset: { id: SEARCH_DATASET_ID, version: SEARCH_DATASET_VERSION, source: 'Natural Earth', licence: 'Public-Domain', attribution: 'Made with Natural Earth.', creditRequired: false },
  countries: [
    country('France', '', 2.55, 46.7, [-4.8, 42.3, 8.2, 51.1], 67_000_000),
    country('Germany', 'Allemagne', 9.68, 50.96, [5.9, 47.3, 15, 55.1], 83_000_000),
    country('Ivory Coast', "Côte d'Ivoire", -5.57, 7.49, [-8.6, 4.4, -2.5, 10.7], 25_700_000),
    country('United Kingdom', 'Royaume-Uni', -2.9, 54.1, [-8.2, 49.9, 1.8, 60.8], 66_800_000),
    country('Ukraine', '', 31.4, 49, [22.1, 44.4, 40.2, 52.4], 44_000_000),
    country('Canada', '', -101, 60, [-141, 41.7, -52.6, 83.1], 37_600_000),
    country('United States of America', 'États-Unis', -112, 45.7, [-124.7, 24.5, -66.9, 49.4], 328_000_000),
    country('Italy', 'Italie', 12.5, 42.1, [6.6, 36.6, 18.5, 47.1], 60_000_000),
  ],
  places: [
    ['London', 'Londres', -0.119, 51.502, 8_567_000, 3],
    ['London', '', -81.25, 42.97, 346_765, 5],
    ['London', '', -84.083, 37.129, 7_844, 6],
    ['Paris', '', 2.331, 48.869, 9_904_000, 0],
    ['Mariupol', 'Marioupol', 37.556, 47.096, 481_626, 4],
    ['Kyiv', 'Kiev', 30.515, 50.435, 2_709_000, 4],
    ['New York', 'New York', -73.99, 40.72, 19_040_000, 6],
    ['Munich', 'Munich', 11.575, 48.14, 1_260_000, 1],
    ['Rome', 'Rome', 12.481, 41.893, 3_339_000, 7],
    ['Saint Petersburg', 'Saint-Pétersbourg', 30.32, 59.939, 5_383_000, 'Russia'],
    ['Cologne', 'Cologne', 6.96, 50.94, 1_005_000, 1],
    ['Ghent', 'Gand', 3.72, 51.05, 248_000, 'Belgium'],
    ['Strasbourg', '', 7.75, 48.58, 439_000, 0],
    ['Åre', '', 13.08, 63.4, 3_000, 'Sweden'],
  ],
}

const ring = (x: number, y: number, size: number): [number, number][] => [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]
const square = (x: number, y: number, size: number): GeoGeometry => ({ type: 'Polygon', coordinates: [ring(x, y, size)] })

/** An empire in two parts: the larger one is the main landmass, the small island far away does not count. */
const twoParts = (x: number, y: number): GeoGeometry => ({
  type: 'MultiPolygon',
  coordinates: [[ring(x + 40, y - 30, 2)], [ring(x, y, 12)]],
})

/**
 * Years: ottoman-empire 1300-1922, kingdom-of-france 987-1792 (split in two states), roman-empire
 * (a group « (Roman Empire) ») 27 BCE-476 with its member gaul, and prussia 1701-1871.
 */
export const SEARCH_GEO_INDEX: GeoIndex = {
  schemaVersion: 1,
  dataset: { ...CLIOPATRIA_META, version: '0.2.0' },
  entities: [
    { id: 'ottoman-empire', name: 'Ottoman Empire', kind: 'polity', memberOf: [], states: [[1300, 1922]] },
    { id: 'kingdom-of-france', name: 'Kingdom of France', kind: 'polity', memberOf: [], states: [[987, 1500], [1501, 1792]] },
    { id: 'roman-empire.group', name: '(Roman Empire)', kind: 'group', memberOf: [], states: [[-27, 476]] },
    { id: 'gaul', name: 'Gaul', kind: 'polity', memberOf: ['roman-empire.group'], states: [[-27, 476]] },
    { id: 'prussia', name: 'Prussia', kind: 'polity', memberOf: [], states: [[1701, 1871]] },
    { id: 'alliance', name: 'Alliance of Cities', kind: 'relation', memberOf: [], states: [[1300, 1500]] },
  ],
}

/** Every state of `SEARCH_GEO_INDEX`, keyed like `Geodata.states`. */
export const SEARCH_GEO_STATES: Readonly<Record<string, GeoGeometry>> = Object.fromEntries(
  SEARCH_GEO_INDEX.entities.flatMap((entity, row) => entity.states.map(([from]) => [stateKey(entity.id, from), entity.id === 'ottoman-empire' ? twoParts(row * 15 - 10, 5) : square(row * 15 - 10, 5, 12)] as const)),
)
