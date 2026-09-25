# Addendum PRD — OPENMAP

Matière utile aux étapes suivantes (architecture, UX, epics) mais qui n'a pas sa place dans la PRD : pistes techniques, jeux de données, analyse des références et des concurrents, alternatives écartées. Les spécifications détaillées du Kit de Faction, du système d'animation, des templates et de la boîte à outils restent dans l'addendum du brief (`briefs/brief-OPENMAP-2026-09-24/addendum.md`).

## Pistes techniques (à valider en architecture)

Rien ici n'est une décision ; ce sont des pistes relevées pendant la découverte.

- **Rendu cartographique** — MapLibre GL JS (open source, BSD) est la base utilisée par OpenAnimateMyMaps et convient à un rendu vectoriel animé dans le navigateur.
- **Export vidéo dans le navigateur** — WebCodecs + un multiplexeur MP4 (ex. Mediabunny) permettent d'encoder sans serveur, jusqu'en 4K/60 selon OpenAnimateMyMaps. Cette API explique l'hypothèse NFR-4 (Chrome/Edge).
- **Stockage local** — IndexedDB ou OPFS pour les Projets et médias importés (FR-46, FR-47).
- **Code de référence** — OpenAnimateMyMaps (github.com/bouclem, licence MIT) : clone open source d'AnimateMyMap, sans backend, avec subdivisions de niveau 1 et export MP4 dans le navigateur. Réutilisable comme référence, ou comme base si la licence le permet (voir Question ouverte 1 de la PRD).

## Jeux de données de frontières

| Jeu de données | Couverture | Licence | Statut pour OPENMAP |
|---|---|---|---|
| Cliopatria (Seshat) | 1 800+ entités, 3400 av. J.-C. – 2024 | CC BY 4.0 | Piste principale pour l'historique |
| Natural Earth | Frontières actuelles, subdivisions | Domaine public | Piste principale pour l'actuel |
| aourednik/historical-basemaps | ~53 instantanés mondiaux, 123000 av. J.-C. – 2010 ; tracés grossiers | GPL-3.0 | Écarté tant que la licence du code n'est pas tranchée |
| OpenHistoricalMap | Participatif | Mixte (CC0, ODbL, CC BY-SA) | Au cas par cas |
| CShapes 2.0 (ETH) | 1886 – 2019 | CC BY-NC-SA 4.0 | Exclu (non commercial) |
| Euratlas | Europe, un instantané par siècle | Commercial (~100–160 € par année-siècle) | Achat possible plus tard |
| GeaCron | Monde, depuis 3000 av. J.-C. | Propriétaire (tuiles) | Exclu |

Pour les drapeaux : Wikimedia Commons (souvent domaine public, à vérifier fichier par fichier pour l'historique) et lipis/flag-icons (MIT, drapeaux actuels). Les trois sites repérés pendant le brainstorming restent non vérifiés.

## Fonds satellite

Le choix du fournisseur est ouvert (Question ouverte 2 de la PRD). Point d'attention : l'imagerie satellite gratuite est souvent limitée à un usage non commercial, et la publication de vidéos monétisées sur YouTube peut compter comme usage commercial. Vérifier les conditions de chaque candidat (fournisseurs de tuiles commerciaux, mosaïques Sentinel-2) avant de s'engager.

## Analyse des références fournies

**Images**
- **Alliances de la Guerre froide** — remplissage de pays par bloc, deux teintes par bloc (fondateurs / adhésions), hachures pour un retrait, pays neutres en blanc, légende datée. → FR-23, FR-30, UJ-3.
- **Normandie 1944 (carte d'époque)** — lignes de front datées, Poche de Mortain-Falaise, grosses Flèches de percée, badges d'unités avec drapeau et étiquette, noms de généraux, parachutes, échelle. → FR-21, FR-22, FR-24, FR-25, FR-27, FR-33, UJ-4.
- **Plan de Waterloo 1815** et **Waterloo façon Baz Battles** — échelle tactique : terrain (forêts, relief, routes, fermes), formations en blocs, portraits de commandants, ellipses de mise en évidence, étapes numérotées. L'échelle tactique est repoussée, mais les éléments réutilisables à l'échelle opérationnelle sont retenus (FR-27 portraits, FR-28 mise en évidence).

**Vidéos**
- **Bataille de Kiev 2022** (16:9) — fond satellite, zones de contrôle semi-transparentes, rangées de mini-drapeaux le long du front, compteurs numériques par secteur orientés le long du front, avions, parachutes, explosions, fumée, horodatage AAAA-MM-JJ qui avance. → FR-26, FR-27, FR-31, FR-32.
- **Siège de Marioupol** (9:16, Short) — satellite étalonné, Poche qui rétrécit jusqu'à disparaître, badges ronds à drapeau, compteurs par zone, grand horodatage. → UJ-1.
- **Tutoriel « façon Baz Battles »** (9:16) — carte peinte puis terrain tactique, symboles de type OTAN, front qui suit les unités ; réalisé sous DaVinci Resolve/After Effects, ce qui confirme la difficulté que vise OPENMAP.
- **Map Studio Lab** — voir ci-dessous.

Toutes les vidéos ont une piste audio (musique ou voix) : d'où la Question ouverte 6 de la PRD.

## Concurrence : compléments depuis le brief

- **AnimateMyMap — War Tool.** Map Studio Lab n'est pas un outil distinct : c'est la chaîne YouTube du fondateur d'AnimateMyMap, qui promeut son War Tool.
  - Conquête province par province au pinceau (attaquant puis cibles, confirmation) et front qui se redessine.
  - Poches et saillants au stylo, remplissage par drapeau.
  - Timeline par cartes d'étapes (durée de maintien, transition, persistance).
  - Panneau de propriétés par groupe : Identity, Fill, Border, Camera, Text, Flag.
  - Formats 16:9 / 9:16.
  - Offre gratuite : 480p avec filigrane.
  - Le produit affiche lui-même « l'aperçu peut différer de l'export », d'où NFR-1.
- **Animaps** — IA + éditeur, frontières historiques 1629–2024 (5 500+ entités), 9,90 à 19,90 $/mois.
- **GEOlayers 3** — extension After Effects, standard des chaînes pro ; licence payante plus abonnement de données.
- **Mappi, Mapimator** — orientés trajets et voyages, avec quelques pages consacrées à la guerre.
- **OpenAnimateMyMaps** — clone gratuit et open source (voir Pistes techniques).

**Conséquence :** la conquête province par province n'est plus un différenciateur ; elle fait partie du socle attendu. La différenciation d'OPENMAP repose sur les Kits de Faction, la Signature organique, les Templates guidés et la qualité des données (Question ouverte 9 de la PRD).

## Alternatives écartées

- **Échelle tactique en v1** — écartée : pas de données de terrain détaillé prêtes à l'emploi, et un chantier (terrain, formations, unités orientées) qui doublerait la v1.
- **Comptes et cloud en v1** — écartés : backend, authentification et hébergement à maintenir seul, sans bénéfice pour valider l'utilité.
- **Stylisé seulement** — écarté par l'utilisateur : le satellite est présent dans trois références vidéo sur quatre, surtout pour l'actualité.
