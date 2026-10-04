// Name folding for place search (Story 1.12, FR-8): the same text for the query and for every name,
// so « Londres », « LONDRES » and « londrès » meet. Pure and locale-independent.

/** Letters that Unicode does not decompose into a base letter and a mark. */
const LIGATURES: Readonly<Record<string, string>> = {
  œ: 'oe',
  æ: 'ae',
  ĳ: 'ij',
  ß: 'ss',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ł: 'l',
  þ: 'th',
  ı: 'i',
}

/**
 * Lower case, accents and ligatures removed, every run of anything that is not a letter or a digit
 * (apostrophes, hyphens, parentheses, full stops) turned into one space, trimmed:
 * « Côte d'Ivoire » and « cote d ivoire » fold to the same text, « (Roman Empire) » to « roman empire ».
 */
export function foldName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[œæĳßøđðłþı]/g, (letter) => LIGATURES[letter])
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}
