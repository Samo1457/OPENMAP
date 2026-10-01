// Random ids for the imperative shell (AD-2: src/core never draws randomness). Pass `newId` as the
// IdSource of core factories such as `generateBlankProjectIds`.

import { nanoid } from 'nanoid'
import type { IdSource } from '../core'

export const newId: IdSource = () => nanoid()
