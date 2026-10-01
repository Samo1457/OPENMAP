import { describe, expect, it } from 'vitest'
import { editorHref, parseRoute } from './routing'

describe('hash routes', () => {
  it('maps #/p/<id> to the Editor and anything else to Home', () => {
    expect(parseRoute(editorHref('abcDEF123_-xyz0000000'))).toEqual({ kind: 'editor', projectId: 'abcDEF123_-xyz0000000' })
    for (const hash of ['', '#', '#/', '#/p/', '#/p/a/b', '#/x/abc', '#/p/a b']) expect(parseRoute(hash)).toEqual({ kind: 'home' })
  })
})
