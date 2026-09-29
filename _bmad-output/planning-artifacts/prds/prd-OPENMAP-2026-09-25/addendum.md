# Addendum PRD — OPENMAP

Matière utile aux étapes suivantes (architecture, UX, epics) mais qui n'a pas sa place dans la PRD : pistes techniques, jeux de données, fournisseur satellite, analyse des références et des concurrents, alternatives écartées. Les spécifications détaillées issues du brainstorming (Kit de Faction, système d'animation, templates, boîte à outils) restent dans l'addendum du brief (`briefs/brief-OPENMAP-2026-09-24/addendum.md`) ; en cas de divergence, la PRD prévaut.

## Pistes techniques (à valider en architecture)

Rien ici n'est une décision ; ce sont des pistes relevées pendant la découverte.

- **Rendu cartographique** — MapLibre GL JS (open source, BSD) est la base utilisée par OpenAnimateMyMaps et convient à un rendu vectoriel animé dans le navigateur.
- **Export vidéo dans le navigateur** — WebCodecs + un multiplexeur MP4 (ex. Mediabunny) permettent d'encoder sans serveur, jusqu'en 4K/60 selon OpenAnimateMyMaps. WebCodecs explique l'hypothèse NFR-4 (Chrome/Edge).
- **Déterminisme** — La Signature organique (tremblé, dépassement) doit être calculée à partir d'une graine fixe par élément, pour que la lecture et l'export soient identiques (FR-42, NFR-1).
- **Stockage local** — IndexedDB ou OPFS pour les Projets et médias importés, avec demande de stockage persistant (FR-53, FR-54).
- **Code de référence** — OpenAnimateMyMaps (github.com/bouclem, licence MIT) : clone open source d'AnimateMyMap, sans backend, avec subdivisions de niveau 1 et export MP4 dans le navigateur. Réutilisable comme référence, ou comme base si la licence le permet (Q1 de la PRD).

## Jeux de données de frontières

| Jeu de données | Couverture | Licence | Statut pour OPENMAP |
|---|---|---|---|
| Cliopatria (Seshat) | 1 800+ entités politiques, 3400 av. J.-C. – 2024, avec plages de validité | CC BY 4.0 | Piste principale pour l'historique |
| Natural Earth | Frontières actuelles, subdivisions | Domaine public | Piste principale pour l'actuel |
| aourednik/historical-basemaps | ~53 instantanés mondiaux, 123000 av. J.-C. – 2010 ; tracés grossiers | GPL-3.0 | Écarté tant que la licence du code n'est pas tranchée |
| OpenHistoricalMap | Participatif | Mixte (CC0, ODbL, CC BY-SA) | Au cas par cas |
| CShapes 2.0 (ETH) | 1886 – 2019 | CC BY-NC-SA 4.0 | Exclu (non commercial) |
| Euratlas | Europe, un instantané par siècle | Commercial (~100–160 € par année-siècle) | Achat possible plus tard |
| GeaCron | Monde, depuis 3000 av. J.-C. | Propriétaire (tuiles) | Exclu |

Cliopatria décrit des entités politiques, pas des provinces : avant l'Ère contemporaine, la conquête se fait surtout par entités entières, par peinture libre (FR-21) ou par découpage (FR-11).

Pour les drapeaux : Wikimedia Commons (souvent domaine public, à vérifier fichier par fichier pour l'historique) et lipis/flag-icons (MIT, drapeaux actuels). Les trois sites repérés pendant le brainstorming restent non vérifiés.

## Fonds satellite : piste Copernicus

Décision utilisateur : explorer Copernicus et ses API pour le satellite, en P0.

- **Licence** — Les données Copernicus Sentinel sont libres, gratuites et ouvertes, y compris pour un usage commercial. Diffuser des données adaptées impose la mention « Contains modified Copernicus Sentinel data [année] » (FR-10).
- **Accès** — Le Copernicus Data Space Ecosystem donne accès aux données Sentinel-2 (résolution ~10 m) et à des API de traitement. Des services tiers proposent aussi des tuiles de fond Sentinel-2 prêtes à l'emploi (ex. SentinelMap, 50 000 tuiles/mois gratuites) : conditions commerciales à vérifier.
- **Travail à prévoir** — Les images brutes ont des nuages : il faut une mosaïque sans nuages, à produire (via les API de traitement) ou à trouver déjà faite sous licence compatible. Attention : certaines mosaïques publiques connues (ex. Sentinel-2 cloudless d'EOX pour les années récentes) sont sous licence non commerciale.
- **Coût** — Hébergement et service des tuiles à chiffrer, avec un plafond mensuel (§8 et Q2 de la PRD). Repli : Fond sombre (FR-5).

Sources : [Terms and conditions — Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/terms-and-conditions), [Copernicus Sentinel data licence](https://cds.climate.copernicus.eu/licences/ec-sentinel), [Sentinel-2 — CDSE](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2), [SentinelMap](https://www.sentinelmap.eu/).

## Analyse des références fournies

**Images**
- **Alliances de la Guerre froide** — pays remplis par bloc, deux teintes par bloc (fondateurs / adhésions), hachures pour le retrait de l'Albanie, pays neutres en blanc, Légende datée, aucune ligne de front. → FR-14, FR-22, FR-23 (front masqué), FR-25, FR-35, UJ-3.
- **Normandie 1944 (carte d'époque)** — Traces de front datées visibles simultanément, Poche de Mortain-Falaise, zone de débarquement, grosses Flèches colorées par phase (percée / réduction de la poche), badges d'unités à drapeau avec étiquette encadrée, étiquettes de commandement, parachutes, échelle graphique. → FR-24, FR-26, FR-27, FR-28, FR-29, FR-30, FR-32, FR-38, UJ-4.
- **Plan de Waterloo 1815 (d'époque)** — échelle tactique : relief, forêts, routes, fermes, blocs d'unités par camp, cartouche de titre. Hors v1, sauf le cartouche de titre (FR-34).
- **Waterloo façon Baz Battles (image d'animation)** — blocs d'unités avec petites flèches, portraits de commandants, écussons et drapeaux, ellipses de mise en évidence, marqueur d'étape numéroté, grosses Flèches blanches, noms de lieux. Terrain et formations : hors v1. Retenus à l'échelle opérationnelle : portraits (FR-32), mise en évidence et numéros (FR-33), Flèches (FR-28), libellés (FR-34).

**Vidéos**
- **Bataille de Kiev 2022** (16:9) — Fond satellite, zones de contrôle semi-transparentes, rangées de mini-drapeaux le long du front qui s'épaississent avec les effectifs, Compteurs par secteur orientés le long du front, avions, explosions, fumée, Horodatage AAAA-MM-JJ qui défile. Des parachutes ont été relevés par la première analyse, sans être confirmés par la seconde. → FR-5, FR-25, FR-31, FR-32, FR-36, FR-37.
- **Siège de Marioupol** (9:16, Short) — satellite étalonné en bleu-vert, Poche qui se déforme et rétrécit jusqu'à disparaître, badges ronds à drapeau, Compteurs par zone, grand Horodatage. → FR-5 (réglages du Fond), FR-19, FR-24, FR-30, FR-31, FR-36, FR-37, FR-50 (9:16), UJ-1.
- **Tutoriel « façon Baz Battles »** (9:16) — carte peinte puis terrain tactique ; Jetons de type OTAN et carrés bicolores qui avancent et pivotent ; territoire qui suit le mouvement des unités, réalisé sous DaVinci Resolve/After Effects. → FR-5 (Fond stylisé), FR-30 (rotation) ; le lien « territoire qui suit les unités » est un non-objectif v1.
- **Démonstration du War Tool d'AnimateMyMap** (9:16) — Fond satellite, pays remplis de leur drapeau à ~70 % d'opacité, bordures lumineuses, gros libellés condensés, conquête province par province de la Hongrie par l'Autriche, transitions rapides avec flou de mouvement, titre avec flèche d'appel, filigrane. → FR-9, FR-17, FR-20, FR-34, FR-46 (flou, P2). Interface détaillée dans la section Concurrence ci-dessous.

L'analyse technique des fichiers a détecté une piste audio dans les quatre vidéos, sans identifier s'il s'agit de musique ou de voix : d'où la Q6 de la PRD.

## Concurrence : compléments depuis le brief

- **AnimateMyMap — War Tool.** Map Studio Lab n'est pas un outil distinct : c'est la chaîne YouTube du fondateur d'AnimateMyMap, qui promeut son War Tool.
  - Conquête province par province au pinceau (attaquant puis cibles, confirmation) et front qui se redessine.
  - Poches, saillants et États fantoches au stylo, remplissage par drapeau.
  - Timeline par cartes d'étapes (durée de maintien, transition, persistance).
  - Panneau de propriétés par groupe : Identity, Fill, Border, Camera, Text, Flag.
  - Formats 16:9 / 9:16.
  - Offre gratuite : 480p avec filigrane.
  - Le produit affiche lui-même « l'aperçu peut différer de l'export », d'où NFR-1.
- **Animaps** — IA + éditeur, frontières historiques 1629–2024 (5 500+ entités), 9,90 à 19,90 $/mois.
- **GEOlayers 3** — extension After Effects, standard des chaînes pro ; licence payante plus abonnement de données.
- **Mappi, Mapimator** — orientés trajets et voyages, avec quelques pages consacrées à la guerre.
- **OpenAnimateMyMaps** — clone gratuit et open source (voir Pistes techniques).

**Conséquence :** la conquête province par province n'est plus un différenciateur ; elle fait partie du socle attendu. La différenciation d'OPENMAP repose sur les Kits de Faction, la Signature organique, les Templates guidés et la qualité des données (R2 et Q9 de la PRD).

## Alternatives écartées

- **Frontières qui évoluent automatiquement avec la Date d'Étape** — écartées pour la v1 : elles dépendent de la qualité des données et se combinent mal avec les modifications de l'utilisateur. Idée gardée pour un futur « mode historique ».
- **Échelle tactique en v1** — écartée : pas de données de terrain détaillé prêtes à l'emploi, et un chantier (terrain, formations, unités orientées) qui doublerait la v1.
- **Comptes et cloud en v1** — écartés : backend, authentification et hébergement à maintenir seul, sans bénéfice pour valider l'utilité. Contrepartie : risque de perte du stockage local (R5), atténué par FR-53 et FR-54.
- **Fonds stylisés seulement** — écartés par l'utilisateur : le satellite est présent dans trois références vidéo sur quatre, surtout pour l'actualité.
- **Aucune télémétrie** — écartée : sans compte, la télémétrie est le seul moyen de mesurer SM-2 à SM-8 ; elle est retenue en opt-in (FR-58).
