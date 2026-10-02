# Pipeline de données OPENMAP

Construit hors ligne les données du fond de carte à partir de Natural Earth (domaine public). Les sorties ne sont jamais commitées : `pipeline/out/` et `pipeline/cache/` sont ignorés par Git. Les pipelines Cliopatria (frontières historiques) arrivent avec l'histoire 1.9.

## Commandes

Node.js 24 est requis (`.nvmrc`).

```
npm run pipeline:basemap                 # construction complète (tuiles vectorielles + relief)
npm run pipeline:basemap -- --vector-only # sans le relief (aucune donnée raster à télécharger)
npm run pipeline:basemap -- --pin         # enregistre les empreintes SHA-256 laissées vides dans sources.json
```

Options : `--out <dossier>` (défaut `pipeline/out`), `--cache <dossier>` (défaut `pipeline/cache`), `--manifest <fichier>`. Chaque option demande une valeur, une option inconnue est refusée, et un dossier de sortie existant, non vide et qui n'est pas une sortie du pipeline n'est jamais remplacé.

Ensuite, `npm run dev` sert les fichiers aux chemins définitifs de l'origine de données (en dev, c'est l'origine de l'application). Sans construction préalable, l'application démarre normalement et les chemins répondent 404 avec une ligne d'aide dans la console.

## Ce qui est produit

| Fichier (sous `pipeline/out/`) | Chemin servi | Contenu |
| --- | --- | --- |
| `natural-earth-v1.pmtiles` | `/natural-earth-v1/{z}/{x}/{y}.mvt` et `/natural-earth-v1.json` (TileJSON) | terres, océan, côtes, fleuves, lacs, lieux habités (`name`, `rank`, `scale`, `pop`), z0 à z6 |
| `natural-earth-relief-v1.pmtiles` | `/natural-earth-relief-v1/{z}/{x}/{y}.webp` et `/natural-earth-relief-v1.json` | ombrage du relief (WebP), z0 à z6 |
| `library/v1/styles/<fond>.json` | `/library/v1/styles/<fond>.json` | quatre styles MapLibre : `parchment`, `sombre`, `clair`, `relief` |
| `library/v1/glyphs/<pile>/<plage>.pbf` | `/library/v1/glyphs/{fontstack}/{range}.pbf` | glyphes SDF des deux polices OFL (Libre Baskerville, Source Sans 3), latin et latin étendu |
| `library/v1/datasets.json` | `/library/v1/datasets.json` | métadonnées `{source, licence, attribution, creditRequired}` de chaque jeu de données |

Au-delà de z6, MapLibre sur-échantillonne. Les styles reprennent les couleurs de `src/ui/theme/tokens.ts` (jamais retapées) ; le style Relief applique `map-shade-relief` à 35 % sur les terres. Les styles n'ont aucune couche de texte (les étiquettes sont dessinées par deck.gl) mais déclarent l'URL des glyphes. Aucune couche de routes, de voies ferrées ou d'autre infrastructure moderne.

## Licences et sources

`sources.json` déclare chaque source (URL figée sur une version, licence, empreinte). Avant tout téléchargement, la commande refuse toute source dont la licence n'est pas Public-Domain, CC0-1.0 ou CC-BY-4.0, et refuse sans exception les licences non commerciales (NC), ODbL et à partage à l'identique (SA) : le code retourne alors un statut différent de 0 et n'écrit rien. Les vecteurs viennent de `nvkelso/natural-earth-vector` (étiquette `v5.1.2`). Tous les vecteurs sont en Natural Earth 1:10m (`10m_physical` et `10m_cultural`). Le relief est le relief ombré 1:10m de Natural Earth (`SR_HR.zip`, hébergé sur `naciscdn.org`), qui ne publie pas d'étiquette de version : sa version est figée par son empreinte.

Premier passage sur un poste avec accès à Internet : lancer `npm run pipeline:basemap -- --pin` pour enregistrer l'empreinte du relief, puis commiter `sources.json`. Tant qu'une empreinte est vide, la commande avertit sans échouer.

Les téléchargements sont mis en cache dans `pipeline/cache/` (rien n'est retéléchargé au deuxième passage) et vérifiés par SHA-256 ; un téléchargement en échec ou corrompu ne laisse aucun fichier partiel. Un second passage avec le même cache produit des fichiers identiques octet pour octet (sur une même plateforme : le rendu des glyphes dépend du moteur Skia).

## Taille sur disque

Mesures de la construction complète (sources Natural Earth 10 m, relief compris, Windows, Node 24) :

- `pipeline/out/` : 56 Mio, dont les tuiles vectorielles 6,4 Mio, le relief 48,1 Mio (`natural-earth-relief-v1.pmtiles`), les glyphes 0,7 Mio et les styles 7 Kio ;
- `pipeline/cache/` : 92 Mio, dont les shapefiles téléchargés (environ 50 Mio) et l'archive du relief `SR_HR.zip` (42,3 Mio).

Soit environ 148 Mio sur disque pour une construction complète. Mesure : `du -sh pipeline/out pipeline/cache`.

## Tests

`npm test` exécute `pipeline/**/*.test.ts` avec de petits jeux de test versionnés dans `pipeline/fixtures/` (un shapefile et un GeoTIFF fabriqués à la main, régénérables avec `node pipeline/fixtures/generate.mjs`). Aucun accès réseau.
