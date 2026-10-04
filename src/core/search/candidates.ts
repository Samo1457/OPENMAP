// The GeoEntities the search can find (Story 1.12): the ones the Map shows at the data date it was
// loaded for (the same selection, Story 1.11), each with the extent of its main landmass. An entity
// whose state is not loaded is not drawn, so it is not offered.

import type { Bounds } from '../evaluate/camera'
import { geoEntityKey, type Geodata, stateKey } from '../geo/geo'
import { selectGeoEntities } from '../geo/select'
import { mainLandmassBounds } from './landmass'

export interface EntityCandidate {
  /** Canonical GeoEntity key `dataset@version:entityId` (AD-22): the key of its Scene Territory. */
  readonly key: string
  /** The English Cliopatria name. */
  readonly name: string
  readonly bounds: Bounds
}

/** `year` is the Reference Date year the geodata was loaded for (`useGeodata`), not the Project's. */
export function entityCandidates(geodata: Geodata, year: number | undefined): readonly EntityCandidate[] {
  const { index, states } = geodata
  if (!index || !states || year === undefined) return []
  const selection = selectGeoEntities(index, year)
  if (!selection) return []
  const pin = { dataset: index.dataset.id, version: index.dataset.version }
  const candidates: EntityCandidate[] = []
  for (const { entity, fromYear } of selection.entities) {
    const geometry = states[stateKey(entity.id, fromYear)]
    const bounds = geometry && mainLandmassBounds(geometry)
    if (bounds) candidates.push({ key: geoEntityKey(pin, entity.id), name: entity.name, bounds })
  }
  return candidates
}

/**
 * The candidates the Scene actually draws (`items` keyed by canonical GeoEntity key): with the
 * Territories Layer hidden nothing is drawn, so nothing can be selected or outlined, and the search
 * does not offer it.
 */
export function drawnCandidates(candidates: readonly EntityCandidate[], items: readonly { readonly key?: string }[]): readonly EntityCandidate[] {
  const drawn = new Set(items.map((item) => item.key))
  return candidates.filter((candidate) => drawn.has(candidate.key))
}
