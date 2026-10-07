// Layer rules of the architecture spine (Design Paradigm table).
// Core is pure; adapters talk to each other and are reached by the UI only through index.ts.
const ADAPTERS = '(render|export|persistence|library|telemetry)'
const PURE_LIBS = '(immer|zod|nanoid|@turf/[^/]+)'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-no-react-map-libs',
      comment: 'src/core is pure: no React, react-dom, MapLibre, deck.gl or luma.gl (spine Design Paradigm, AD-1).',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '(^|node_modules/)(react|react-dom|maplibre-gl|deck\\.gl|@deck\\.gl/[^/]+|@luma\\.gl/[^/]+)(/|$)' },
    },
    {
      name: 'core-no-ui-or-i18n',
      comment: 'src/core never imports src/ui or src/i18n; Map text is formatted by src/core/format (AD-20, AD-25).',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(ui|i18n)/' },
    },
    {
      name: 'core-no-adapters',
      comment: 'src/core never imports an adapter (render, export, persistence, library, telemetry).',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: `^src/${ADAPTERS}/` },
    },
    {
      name: 'core-only-pure-libs',
      comment: 'src/core may import only src/core and immer, zod, nanoid, @turf/* modules.',
      severity: 'error',
      from: { path: '^src/core/', pathNot: '\\.test\\.ts$' },
      to: {
        pathNot: ['^src/core/', `(^|node_modules/)${PURE_LIBS}(/|$)`],
      },
    },
    {
      name: 'core-tests-only-pure-libs-and-vitest',
      comment: 'src/core tests may import only src/core, the pure libs and vitest.',
      severity: 'error',
      from: { path: '^src/core/.*\\.test\\.ts$' },
      to: {
        pathNot: ['^src/core/', `(^|node_modules/)${PURE_LIBS}(/|$)`, '(^|node_modules/)vitest(/|$)'],
      },
    },
    {
      name: 'core-testing-only-from-tests',
      comment: 'src/core/testing holds test fixtures: only *.test.ts files (and tests/) may import it, never app code.',
      severity: 'error',
      from: { pathNot: ['\\.test\\.ts$', '^tests/', '^src/core/testing/'] },
      to: { path: '^src/core/testing/' },
    },
    {
      name: 'testing-only-from-tests',
      comment: 'src/testing holds test doubles (fake Web Locks, BroadcastChannel): only *.test.ts files, tests/ and src/testing itself may import it, never app code.',
      severity: 'error',
      from: { pathNot: ['\\.test\\.ts$', '^tests/', '^src/testing/'] },
      to: { path: '^src/testing/' },
    },
    {
      name: 'adapter-imports-other-adapter-index-only',
      comment: 'An adapter imports another adapter only through its index.ts.',
      severity: 'error',
      from: { path: `^src/${ADAPTERS}/` },
      to: {
        path: `^src/${ADAPTERS}/`,
        pathNot: ['^src/$1/', '^src/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'adapters-no-ui',
      comment: 'Adapters are below the UI: they never import src/ui or src/i18n.',
      severity: 'error',
      from: { path: `^src/${ADAPTERS}/` },
      to: { path: '^src/(ui|i18n)/' },
    },
    {
      name: 'ui-imports-adapter-index-only',
      comment: 'src/ui, src/i18n and top-level src files (main.tsx) reach adapters only through their index.ts.',
      severity: 'error',
      from: { path: '^src/((ui|i18n)/|[^/]+$)' },
      to: {
        path: `^src/${ADAPTERS}/`,
        pathNot: '^src/[^/]+/index\\.ts$',
      },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import must resolve (a typo or a missing dependency).',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
