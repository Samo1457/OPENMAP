# Pipeline de données OPENMAP

Construit hors ligne les données du fond de carte à partir de Natural Earth (domaine public). Les sorties ne sont jamais commitées : `pipeline/out/` et `pipeline/cache/` sont ignorés par Git. Les frontières historiques viennent de Cliopatria (CC BY 4.0) ; leur sortie est `pipeline/out-geo/` (aussi ignoré par Git), voir la section « Frontières historiques ». L'index de recherche de lieux vient de Natural Earth ; sa sortie est `pipeline/out-search/` (aussi ignoré par Git), voir la section « Recherche de lieux ».

## Commandes

Node.js 24 est requis (`.nvmrc`).

```
npm run pipeline:basemap                 # construction complète (tuiles vectorielles + relief)
npm run pipeline:basemap -- --vector-only # sans le relief (aucune donnée raster à télécharger)
npm run pipeline:basemap -- --pin         # enregistre les empreintes SHA-256 laissées vides dans sources.json
```

```
npm run pipeline:geo                     # frontières historiques (Cliopatria), voir la section dédiée plus bas
npm run pipeline:search                  # index de recherche de lieux (Natural Earth), voir la section dédiée plus bas
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

`npm test` exécute `pipeline/**/*.test.ts` avec de petits jeux de test versionnés dans `pipeline/fixtures/` (des shapefiles, dont deux pour la recherche de lieux, et un GeoTIFF fabriqués à la main, régénérables avec `node pipeline/fixtures/generate.mjs`). Aucun accès réseau.

## Frontières historiques (Cliopatria)

```
npm run pipeline:geo
```

Options : `--out <dossier>` (défaut `pipeline/out-geo`), `--cache <dossier>` (défaut `pipeline/cache`), `--manifest <fichier>` (défaut `sources-geo.json`). La sortie a son propre dossier : la construction du fond de carte ne l'efface jamais. Comme pour le fond de carte, un dossier de sortie non vide qui n'est pas une sortie de ce pipeline (pas de `library/v1/geo/index.json`) n'est jamais remplacé, et la sortie précédente survit à tout échec.

**Source et licence.** Cliopatria, version `v0.2.0` (archive `cliopatria.geojson.zip`, fichier `cliopatria_polities_only.geojson`), SHA-256 figé dans `sources-geo.json`, licence CC-BY-4.0, crédit obligatoire : « Cliopatria, Seshat Global History Databank ». La licence est vérifiée avant tout téléchargement, avec la même barrière que le fond de carte (NC, SA et ODbL refusés, code de sortie différent de 0, rien d'écrit). Un échec de téléchargement ou une empreinte inexacte arrête la commande en nommant l'URL.

**Ce qui est produit** (sous `pipeline/out-geo/library/v1/geo/`, servi par `npm run dev` aux mêmes chemins que la future origine de données) :

| Chemin | Contenu |
| --- | --- |
| `/library/v1/geo/index.json` | métadonnées du jeu (`id`, `version`, `source`, `licence`, `attribution`, `creditRequired`, `simplification`, effectifs) et, par entité : `id`, `name`, `kind` (`polity`, `group` ou `relation`), `components` (relations), `wikidata`, `wikipedia`, `seshatId`, `memberOf`, `states` (liste triée de `[annéeDébut, annéeFin]`) |
| `/library/v1/geo/<entityId>/<annéeDébut>.json` | un état d'une entité : une Feature GeoJSON compacte dont l'`id` est la clé canonique `cliopatria@0.2.0:<entityId>` et les propriétés `{fromYear, toYear, area}` ; années entières, av. J.-C. négatives |

Une entité regroupe toutes les lignes de même `Name`. Toutes les lignes sont gardées : polities simples, agrégats (nom entre parenthèses, `kind: "group"`, identifiant suffixé `.group`, avec `memberOf`) et relations (`kind: "relation"`, `memberOf` vide, parties dans `components`). L'histoire 1.11 choisit ce qui est affiché. L'`entityId` est le nom en ASCII (accents et parenthèses retirés). Si deux noms donnent le même identifiant (par exemple « Han » et « Hán »), chacun reçoit `-` suivi des 6 premiers caractères hexadécimaux du SHA-256 du nom exact. Une collision qui subsiste, deux états d'une même entité qui se chevauchent dans le temps, ou un état sans aucun polygone arrêtent la commande en nommant l'entité. Les métadonnées qui varient d'une ligne à l'autre (Wikidata, Wikipedia, Seshat) prennent la première valeur non vide dans l'ordre chronologique ; `memberOf` et `components` sont l'union triée de toutes les lignes.

**Géométrie.** Jamais découpée : polygones entiers, hors tout rognage. Niveau de simplification fixe : Douglas-Peucker à 0,005° (les données sources sont déjà généralisées, ce qui retire peu de points), puis coordonnées arrondies à 4 décimales (environ 11 m), anneaux de moins de 4 points supprimés, sens RFC 7946 (extérieur anti-horaire, trous horaires). Le levier de taille est l'arrondi, pas la simplification. La sortie est déterministe : un second passage avec le même cache produit des fichiers identiques octet pour octet. `/library/v1/` est la version de la disposition, `0.2.0` celle du jeu de données qu'un Project fige : changer la sortie pour la même version de Cliopatria demanderait `/library/v2/`.

**Taille mesurée** (construction réelle, Linux, Node 24) : 1 633 entités (1 540 polities, 43 agrégats, 50 relations), 13 765 états ; `index.json` 437 Kio, fichiers d'états 64,3 Mio, soit 64,7 Mio de données (22,7 Mio compressées en gzip) et environ 105 Mio occupés sur disque à cause des blocs des 13 765 petits fichiers (`du -sh pipeline/out-geo`) ; l'archive téléchargée dans `pipeline/cache/cliopatria/` pèse 43 Mio. Un état médian pèse environ 2 Kio.

La commande affiche aussi le nombre d'anneaux et de polygones supprimés par la simplification et l'arrondi (anneaux de moins de 4 points ou sans surface) : 98 anneaux et 0 polygone pour cette version. `--vector-only` et `--pin` ne concernent que `pipeline:basemap` et sont refusés ici.

**Limites connues.** Mémoire : le pic mesuré est d'environ 1,3 Go (le JSON de 165 Mo est lu en mémoire). Antiméridien : aucun polygone de cette version ne le franchit (les longitudes restent dans ±180, mesuré), donc rien n'est coupé ni déroulé. La validité topologique des anneaux simplifiés (auto-intersections, trous) n'est pas vérifiée. Les identifiants d'entités sont stables pour une version donnée de Cliopatria ; une version ultérieure peut renommer un identifiant en collision, c'est pourquoi les Projects figent la version.

Sans construction préalable, l'application démarre normalement et les chemins `/library/v1/geo/…` répondent 404 avec une ligne d'aide dans la console. Un identifiant ou une année inconnus répondent 404, et un chemin avec `..` est refusé.

## Recherche de lieux (Natural Earth)

```
npm run pipeline:search
```

Options : `--out <dossier>` (défaut `pipeline/out-search`), `--cache <dossier>` (défaut `pipeline/cache`), `--manifest <fichier>` (défaut `sources-search.json`). La sortie a son propre dossier : la construction du fond de carte ne l'efface jamais (ni celle des frontières). Comme pour les autres pipelines, un dossier de sortie non vide qui n'est pas une sortie de ce pipeline (pas de `library/v1/search/index.json`) n'est jamais remplacé, et la sortie précédente survit à tout échec. `--vector-only` et `--pin` ne concernent que `pipeline:basemap` et sont refusés ici.

**Sources et licence.** Natural Earth `v5.1.2` (domaine public, crédit non obligatoire), quatre fichiers `10m_cultural` de `nvkelso/natural-earth-vector`, SHA-256 figés dans `sources-search.json` : `ne_10m_admin_0_countries` (`.shp` 8,8 Mo, `.dbf` 0,9 Mo ; 258 pays) et `ne_10m_populated_places` (`.shp` 205 Ko, `.dbf` 48 Mo ; 7 342 lieux). Le fichier complet des lieux est nécessaire : seul il porte `NAME_FR` (la variante `_simple` du fond de carte n'a pas de nom français). La licence est vérifiée avant tout téléchargement, avec la même barrière que les autres pipelines (NC, SA et ODbL refusés, code de sortie différent de 0, rien d'écrit). Les téléchargements sont mis en cache dans `pipeline/cache/` (49 Mio de plus, une seule fois).

**Ce qui est produit** (sous `pipeline/out-search/library/v1/search/`, servi par `npm run dev` à `/library/v1/search/index.json`) : un seul fichier JSON compact.

| Champ | Contenu |
| --- | --- |
| `schemaVersion`, `dataset` | `1` ; `{id: "places-search", version: "1", source, licence, attribution, creditRequired}` (`Natural Earth`, `Public-Domain`, `Made with Natural Earth.`, `false`) |
| `countries[]` | `{en, fr, lon, lat, bounds, pop}` : `NAME_EN`, `NAME_FR` (`""` quand il est égal à l'anglais), le point d'étiquette (`LABEL_X`, `LABEL_Y`), l'emprise `[ouest, sud, est, nord]` de la **terre principale** (le polygone de plus grande surface : ni la Guyane ni l'Alaska ne dézooment la caméra), la population estimée (`POP_EST`) ; triés par nom anglais |
| `places[]` | `[en, fr, lon, lat, popMax, pays]` : `NAME_EN`, `NAME_FR` (`""` quand il est égal), les coordonnées, `POP_MAX`, le pays (indice dans `countries` quand `ADM0_A3` ou `ADM0NAME` le désigne, sinon son nom anglais en texte) ; triés par nom, puis coordonnées |

Les coordonnées sont arrondies à 3 décimales (environ 100 m), les emprises à 2 (environ 1 km). Le nom anglais retombe sur `NAME` quand `NAME_EN` est vide ; les champs texte des tables Natural Earth sont complétés par des caractères NUL, retirés ici. Un lieu ou un pays sans nom ou sans géométrie utilisable est écarté et compté, un doublon exact aussi. La sortie est déterministe : les lignes sont triées, et un second passage avec le même cache produit un fichier identique octet pour octet (SHA-256 vérifié).

**Taille mesurée** (construction réelle, Linux, Node 24) : 258 pays, 7 342 lieux dont 1 336 ont un nom français différent de l'anglais, aucun écarté ni en double, 2 lieux dont le pays est hors de la liste (Atafu, Longyearbyen : le nom du pays reste en texte) ; `index.json` 327,9 Kio (141,1 Kio compressés en gzip), construit en 6 s. Le client le charge au premier focus du champ de recherche (jamais à l'ouverture de l'Éditeur) et le garde dans le cache de la Bibliothèque (Dexie), d'où il est relu ensuite, y compris hors ligne.

**Limites connues.** Seuls les noms anglais et français de Natural Earth sont indexés ; les noms historiques (« Constantinople », « Stalingrad ») n'y sont pas (alias de l'Epic 10). Les entités historiques (Cliopatria) ne viennent pas de cet index : le client les cherche dans les données chargées à la date de référence. Sans construction préalable, l'application démarre normalement et `/library/v1/search/index.json` répond 404 avec une ligne d'aide dans la console ; la recherche cherche alors seulement les entités historiques et affiche « La recherche de lieux est indisponible. » quand rien d'autre ne correspond.
