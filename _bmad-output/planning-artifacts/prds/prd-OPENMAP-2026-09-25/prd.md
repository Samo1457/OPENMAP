---
title: OPENMAP — PRD
status: draft
created: 2026-09-25
updated: 2026-09-25
---

# PRD : OPENMAP
*Nom de travail — à confirmer.*

## 0. Objet du document

Cette PRD définit ce qu'OPENMAP v1 doit permettre de faire, pour servir de base aux étapes suivantes (UX, architecture, epics et stories). Elle s'appuie sur le Product Brief final (`briefs/brief-OPENMAP-2026-09-24/brief.md`) et son addendum (spécifications détaillées du Kit de Faction, du système d'animation, des templates et de la boîte à outils), qu'elle ne duplique pas : elle les traduit en exigences testables. Les références visuelles fournies (carte des alliances de la Guerre froide, campagne de Normandie 1944, plans de Waterloo, timelapses Kiev/Marioupol, démonstration du War Tool d'AnimateMyMap) ont servi à calibrer le périmètre. Le vocabulaire est fixé par le Glossaire (§3) ; les exigences fonctionnelles (FR) sont numérotées globalement ; les hypothèses sont marquées `[HYPOTHÈSE]` et indexées en §13. Le détail technique (piste de stack, jeux de données, fournisseurs) vit dans `addendum.md`.

## 1. Vision

OPENMAP est un éditeur web, sur ordinateur, pour créer des cartes historiques et géopolitiques animées — conquêtes, évolutions de frontières, lignes de front, sièges — aussi simple à prendre en main que Canva. Un créateur de contenu choisit un template, une époque, une zone et des factions, et obtient en quelques minutes une carte déjà présentable, qu'il affine ensuite autant qu'il veut avant de l'exporter en vidéo ou en image pour son montage.

Le produit vise le milieu d'un marché en « haltère » : entre la suite pro (After Effects + GEOlayers, puissant mais long et coûteux à maîtriser) et le bricolage ou la sous-traitance. Il se distingue des outils existants (AnimateMyMap et son War Tool, Animaps, Mapimator) non par l'exhaustivité des réglages, mais par trois choses : des **Kits de Faction** réutilisables avec héritage de sous-factions, une **signature organique** qui rend un template personnel sans effort, et un parcours guidé façon Canva. Il reprend sans complexe ce que la concurrence a déjà bien simplifié, comme les presets de caméra.

Le véritable actif à long terme est la **donnée** : frontières historiques, drapeaux et kits de factions correctement sourcés, vérifiés et aux licences propres.

## 2. Utilisateur cible

### 2.1 Jobs To Be Done

- **Fonctionnel** — produire pour chaque vidéo une carte animée juste et lisible, sans passer des heures dans After Effects ni payer un motion designer.
- **Émotionnel** — avoir l'air pro, avec un rendu qui tient la comparaison avec les grandes chaînes (Kings and Generals, Baz Battles), sans compétences en motion design.
- **Contextuel** — enchaîner vite : une vidéo d'actualité géopolitique doit sortir quand le sujet est chaud ; le format vertical (Shorts) impose d'aller encore plus vite.
- **Social** — une identité visuelle cohérente d'une vidéo à l'autre (mêmes couleurs, mêmes emblèmes pour les mêmes camps).

Publics : créateurs de contenu historique et géopolitique (primaire) ; enseignants et passionnés d'histoire/wargame (secondaire).

### 2.2 Non-utilisateurs (v1)

- Cartographes et analystes SIG qui ont besoin de précision géodésique, de projections au choix ou d'import de données géographiques brutes.
- Réalisateurs de batailles à l'échelle tactique (terrain, formations, ordre de bataille détaillé façon Waterloo) — échelle repoussée après la v1.
- Utilisateurs sur mobile ou tablette.
- Équipes qui veulent éditer à plusieurs en temps réel.

### 2.3 Parcours utilisateur clés

- **UJ-1. Terrabellum sort un Short sur le siège de Marioupol le soir même.**
  Terrabellum, YouTubeur géopolitique, veut publier un Short vertical pendant que le sujet est chaud. Il ouvre OPENMAP sur son PC (aucun compte), choisit le template « Conflit contemporain — siège de ville », tape « Marioupol », choisit mars–mai 2022 et les factions Russie et Ukraine, dont les kits officiels s'appliquent automatiquement. Il passe en fond satellite, dessine la poche ukrainienne à main levée, puis crée une étape par date où la poche rétrécit. Il ajoute un compteur d'effectifs par zone et l'horodatage en haut de l'écran. Il scrubbe la timeline, la poche se resserre avec la signature organique, il exporte en 9:16. **Climax :** en moins de 20 minutes, il a un MP4 vertical prêt pour son montage. **Cas limite :** le tracé de la poche dessiné à l'étape 1 est trop grossier ; il édite ses points à l'étape 3 sans refaire les étapes intermédiaires.

- **UJ-2. Terrabellum raconte l'expansion ottomane dans les Balkans.**
  Pour une vidéo longue en 16:9, il part du template « Expansion d'empire » à l'ère Temps modernes. Il applique le kit officiel « Empire ottoman », puis crée une sous-faction « Vassaux ottomans » qui hérite du style mais change de couleur. Étape après étape, il sélectionne l'attaquant, puis peint les provinces conquises au pinceau ; la ligne de front se redessine seule. Il choisit le preset caméra « fly-to » pour les étapes clés. **Climax :** en changeant la teinte du kit parent à la fin, tous les territoires, flèches et jetons ottomans — vassaux compris — se mettent à jour sur toute la timeline. **Cas limite :** les données ne contiennent pas les provinces de l'époque ; il dessine les zones à la main ou découpe une entité existante (voir FR-10).

- **UJ-3. Claire, prof d'histoire-géo, prépare la carte des alliances de la Guerre froide.**
  Claire n'a jamais utilisé d'outil de motion design. Elle part du template « Alliances » à la date 1968, assigne les pays à l'OTAN et au Pacte de Varsovie, applique des hachures à l'Albanie (retrait en 1968) et laisse la Suède, la Finlande et la Yougoslavie neutres. La légende se génère toute seule. Elle exporte une image PNG pour son diaporama, puis une courte vidéo montrant les adhésions de 1949 à 1968 pour lancer le cours. **Climax :** une carte propre et lisible, comparable aux cartes des manuels, sans rien dessiner. **Cas limite :** elle veut les libellés en français ; elle renomme les pays directement sur sa carte.

- **UJ-4. Hugo, passionné de wargame, reconstitue la percée de Normandie à partir d'une vieille carte.**
  Hugo possède un scan d'une carte d'époque de l'été 1944. Il l'importe en fond au-dessus de la carte de Normandie et la cale à la main (position, échelle, rotation, opacité). Il trace les lignes de front datées (6 juin, 12 juin, 25 juillet), les grosses flèches de percée, et place des jetons d'unité avec drapeau et étiquette (« 7 C. », « 1 Ar. »). Il choisit le fond parchemin. **Climax :** son animation reprend l'esthétique vintage qu'il aime, mais les fronts avancent tout seuls. **Cas limite :** il ferme l'onglet par erreur ; en rouvrant OPENMAP, son projet est là, à la dernière modification près.

## 3. Glossaire

- **Projet** — L'unité de travail de l'utilisateur : une Carte, sa Timeline, ses Calques et ses médias importés. Sauvegardé localement ; exportable en Fichier projet.
- **Carte** — Ce que l'utilisateur compose et anime : un Fond de carte, des Territoires et tous les éléments posés dessus. Un Projet contient une seule Carte.
- **Fichier projet** — Export portable d'un Projet (données + médias importés), réimportable sur une autre machine.
- **Template** — Projet de départ fourni par OPENMAP : Fond de carte, zone, date, Factions suggérées, Étapes pré-remplies. Rien n'y est verrouillé.
- **Fond de carte** — Couche visuelle de base : stylisé (parchemin par défaut, sombre, clair, relief) ou satellite.
- **Entité géographique** — Polygone issu des données d'OPENMAP : pays, empire ou subdivision (province) valide à une date donnée.
- **Zone dessinée** — Polygone tracé par l'utilisateur (main levée ou points).
- **Territoire** — Surface contrôlée par une Faction à une Étape, constituée d'Entités géographiques et/ou de Zones dessinées. Un Territoire sans Faction est **neutre**.
- **Poche** — Territoire marqué comme encerclé, avec un style distinct.
- **Ligne de front** — Limite affichée entre Territoires de Factions opposées, recalculée quand les Territoires changent.
- **Faction** — Camp représenté sur la carte (pays, empire, alliance, armée). Porte exactement un Kit de Faction.
- **Kit de Faction** — Ensemble de styles réutilisable d'une Faction (couleurs, Emblème, police, style de frontière, de Flèche et de Jeton d'unité). Modifier un Kit met à jour tous les éléments qui l'utilisent. Détail : addendum du brief.
- **Sous-faction** — Faction dont le Kit hérite d'un Kit parent et n'en surcharge que certains champs.
- **Emblème** — Drapeau, blason ou symbole d'une Faction (image).
- **Bibliothèque** — Catalogue officiel d'OPENMAP : Templates, Kits de Faction, Emblèmes, Icônes d'événement.
- **Flèche** — Tracé de mouvement animé, rattaché à une Faction.
- **Jeton d'unité** — Marqueur d'une force militaire (symbole de type OTAN simplifié, carré bicolore, badge rond à drapeau, mini-drapeau), avec étiquette optionnelle.
- **Icône d'événement** — Pictogramme ponctuel ou mobile : explosion, avion, parachute, fumée, bataille, siège, ou image importée.
- **Compteur** — Nombre attaché à la carte dont la valeur change d'une Étape à l'autre (effectifs, pertes, pourcentage).
- **Horodatage** — Date affichée à l'écran, synchronisée avec les Étapes.
- **Légende** — Encadré listant les Factions et les motifs utilisés, généré automatiquement.
- **Étape** — Unité de la Timeline : un état de la Carte à une date, avec une durée de transition et une durée de maintien.
- **Acte** — Groupe nommé d'Étapes (par défaut : avant / pendant / après).
- **Timeline** — Suite ordonnée des Étapes, lisible et scrubbable.
- **Preset caméra** — Mouvement de caméra prédéfini appliqué à une Étape : fixe, fly-to, orbit, sweep, bounce, ou cadrage automatique.
- **Signature organique** — Style d'animation par défaut d'OPENMAP : easing avec léger dépassement, bordures légèrement tremblées, pulsation avant changement d'état.
- **Calque** — Groupe d'éléments de même nature (Territoires, Flèches, Jetons, textes, médias) qu'on peut masquer, verrouiller et réordonner.
- **Mode édition / Mode présentation** — En édition, la caméra est libre (zoom, déplacement) ; en présentation, elle suit la Timeline, comme dans l'export.
- **Format de sortie** — Ratio d'export : 16:9, 9:16 ou 1:1.

## 4. Fonctionnalités

### 4.1 Démarrage et Templates

**Description :** Le premier contact se fait par un assistant qui mène de rien à une carte présentable : Template → époque ou date précise → zone → Factions. En sortie, la carte a son Fond, ses Territoires assignés, ses Kits appliqués et au moins une Étape. L'utilisateur peut aussi partir d'un Projet vierge. Réalise UJ-1, UJ-2, UJ-3.

#### FR-1 : Créer un Projet
L'utilisateur peut créer un Projet à partir d'un Template ou d'une carte vierge, sans compte. Réalise UJ-1, UJ-3.
- Un Projet est créé et ouvert dans l'éditeur sans inscription ni connexion.
- Le Projet apparaît dans la liste des Projets récents (FR-49).

#### FR-2 : Assistant de démarrage
L'utilisateur peut suivre un assistant : choix du Template, de l'époque ou d'une date précise, de la zone, puis des Factions à mettre en avant. Réalise UJ-1, UJ-2, UJ-3.
- L'assistant tient en 5 écrans au plus et chaque étape peut être passée (valeurs du Template conservées).
- À la fin, la lecture de la Timeline produit une animation sans autre action.
- Les Factions choisies reçoivent un Kit de Faction de la Bibliothèque s'il existe, sinon un Kit par défaut aux couleurs distinctes.

#### FR-3 : Parcourir les Templates
L'utilisateur peut filtrer les Templates par ère (Antiquité, Moyen Âge, Temps modernes, Contemporain), par type (bataille ponctuelle, campagne, expansion sur la durée, géopolitique actuelle) et par recherche texte.
- Chaque Template affiche un aperçu animé ou une vignette, sa zone et sa période.

#### FR-4 : Templates non verrouillés
Tout élément issu d'un Template peut être modifié, déplacé ou supprimé.
- Aucun élément d'un Projet créé depuis un Template n'est en lecture seule.

### 4.2 Fonds de carte et géographie

**Description :** La carte repose sur un Fond (stylisé ou satellite) et sur les Entités géographiques valides à la date du Projet. L'échelle v1 couvre le stratégique (pays, empires) et l'opérationnel (provinces, fronts, poches, villes). Les données historiques sont imparfaites par nature : l'utilisateur doit pouvoir les corriger dans son Projet. Réalise UJ-1 à UJ-4.

#### FR-5 : Choisir le Fond de carte
L'utilisateur peut choisir un Fond stylisé (parchemin par défaut, sombre, clair, relief) ou satellite, et en changer à tout moment.
- Changer de Fond ne modifie ni ne supprime aucun élément du Projet.
- Le Fond satellite reste lisible sous des Territoires semi-transparents.

#### FR-6 : Frontières à une date
L'utilisateur peut afficher les Entités géographiques valides à une date donnée.
- Pour une date D, la carte affiche les frontières du jeu de données le plus proche de D, et indique la date réelle de ces données quand elle diffère de D.
- Sans date choisie, les frontières actuelles sont utilisées.

#### FR-7 : Subdivisions
L'utilisateur peut sélectionner des provinces (subdivisions) là où les données en contiennent. `[HYPOTHÈSE : en v1, les subdivisions sont surtout disponibles pour la période contemporaine ; ailleurs, l'utilisateur passe par les Zones dessinées ou FR-10.]`
- Quand aucune subdivision n'existe pour la zone et la date, l'outil le signale et propose de dessiner ou de découper.

#### FR-8 : Rechercher un lieu
L'utilisateur peut rechercher un pays, une ville ou une Entité géographique par son nom ; la caméra d'édition s'y centre.

#### FR-9 : Couches géographiques
L'utilisateur peut afficher ou masquer les villes, fleuves et noms de lieux, et renommer tout libellé dans son Projet. Réalise UJ-3.

#### FR-10 : Corriger les données dans un Projet
L'utilisateur peut redessiner, découper ou fusionner une Entité géographique dans son Projet. Réalise UJ-2.
- La correction ne s'applique qu'au Projet et ne modifie pas la Bibliothèque.
- Une Entité corrigée est signalée comme telle dans l'éditeur.

#### FR-11 : Attribution des sources
L'outil affiche la source et la licence des données utilisées par le Projet, et permet d'inclure le crédit dans l'export.
- Chaque Fond et chaque jeu de frontières affiché a une attribution consultable.
- L'option « crédit dans l'export » est activée par défaut quand la licence l'exige.

### 4.3 Kits de Faction

**Description :** Chaque Faction porte un Kit de Faction : un seul endroit pour son identité visuelle, appliqué partout où la Faction apparaît. Les Kits se réutilisent d'un Projet à l'autre et peuvent hériter les uns des autres. Contenu détaillé : addendum du brief, section « Spec : Kit de Faction ». Réalise UJ-1, UJ-2, UJ-3.

#### FR-12 : Créer et éditer un Kit
L'utilisateur peut créer ou éditer un Kit : nom, couleurs (remplissage, contour, sélection), Emblème, police, style de frontière, style de Flèche, forme de Jeton d'unité, ère.

#### FR-13 : Appliquer un Kit
L'utilisateur peut assigner une Faction à un Territoire, une Flèche ou un Jeton en un clic ; l'élément prend le style du Kit.
- Modifier un champ du Kit met à jour immédiatement tous les éléments de la Faction, sur toutes les Étapes. Réalise UJ-2.

#### FR-14 : Sous-factions
L'utilisateur peut créer une Sous-faction dont le Kit hérite d'un Kit parent. Réalise UJ-2.
- Un champ non surchargé suit le parent quand celui-ci change ; un champ surchargé garde sa valeur.
- L'éditeur indique quels champs sont hérités et lesquels sont surchargés, et permet de revenir à la valeur héritée.

#### FR-15 : Bibliothèque de Kits
L'utilisateur peut chercher un Kit officiel par nom, ère ou région, et le dupliquer pour le personnaliser.

#### FR-16 : Kits personnels réutilisables
L'utilisateur peut enregistrer ses Kits et les réutiliser dans tous ses Projets, et les exporter/importer en fichier.

#### FR-17 : Remplissage par drapeau
L'utilisateur peut remplir un Territoire avec l'Emblème de sa Faction, avec une opacité réglable.

### 4.4 Territoires, Lignes de front et Poches

**Description :** Le cœur du récit : qui contrôle quoi, à chaque Étape. Les Territoires se construisent en sélectionnant des Entités géographiques ou en dessinant des Zones, et changent de main d'une Étape à l'autre. Réalise UJ-1 à UJ-4.

#### FR-18 : Sélectionner des Entités
L'utilisateur peut former un Territoire en cliquant sur des Entités géographiques (sélection multiple avec Ctrl).

#### FR-19 : Dessiner une Zone
L'utilisateur peut tracer une Zone dessinée à main levée ou point par point, et modifier ses points ensuite. Réalise UJ-1, UJ-4.
- Les points d'une Zone restent éditables à n'importe quelle Étape.

#### FR-20 : Conquête province par province
L'utilisateur peut, pour une Étape, désigner une Faction attaquante puis peindre au pinceau les Entités qu'elle prend. Réalise UJ-2.
- Les Entités peintes changent de Faction à cette Étape et la transition s'anime selon FR-37.
- Le nombre d'Entités sélectionnées est affiché avant validation.

#### FR-21 : Ligne de front
L'outil affiche une Ligne de front entre Territoires de Factions opposées, avec un style réglable.
- La Ligne de front est recalculée automatiquement à chaque changement de Territoire, sans tracé manuel.

#### FR-22 : Poches
L'utilisateur peut marquer un Territoire comme Poche ; sa surface peut diminuer d'une Étape à l'autre jusqu'à disparaître. Réalise UJ-1.

#### FR-23 : Motifs de remplissage
L'utilisateur peut remplir un Territoire en plein, en semi-transparent, en hachures ou avec l'Emblème (FR-17). Réalise UJ-3.
- Un Territoire neutre a un style par défaut distinct de toute Faction.

### 4.5 Flèches, Jetons d'unité et Icônes d'événement

**Description :** Les éléments qui montrent le mouvement et l'action : Flèches d'offensive, forces en présence, événements ponctuels. Réalise UJ-1, UJ-4.

#### FR-24 : Flèches de mouvement
L'utilisateur peut tracer une Flèche courbe par points ; elle hérite du style de sa Faction et « se dessine » le long de son tracé pendant la transition de l'Étape. Réalise UJ-4.
- L'épaisseur est réglable, y compris en très large pour les percées.

#### FR-25 : Jetons d'unité
L'utilisateur peut placer des Jetons d'unité (symbole de type OTAN simplifié, carré bicolore, badge rond à drapeau, mini-drapeau) avec une étiquette, et les déplacer entre deux Étapes. Réalise UJ-4.
- Un Jeton déplacé entre deux Étapes glisse d'une position à l'autre pendant la transition.

#### FR-26 : Placement en série
L'utilisateur peut aligner une série de Jetons le long d'une Ligne de front ou d'un tracé, avec un espacement réglable.

#### FR-27 : Icônes d'événement
L'utilisateur peut placer des Icônes d'événement de la Bibliothèque (explosion, avion, parachute, fumée, bataille, siège) ou une image importée (portrait de commandant) ; un avion peut suivre un tracé.

#### FR-28 : Mise en évidence
L'utilisateur peut entourer un groupe d'éléments d'une ellipse ou d'un contour de mise en évidence, et placer des marqueurs d'étape numérotés.

### 4.6 Textes, Légende, Compteurs et Horodatage

**Description :** Tout ce qui se lit à l'écran. Réalise UJ-1, UJ-3.

#### FR-29 : Textes
L'utilisateur peut ajouter des titres, libellés et annotations, avec police, taille, contour et position libres.

#### FR-30 : Légende automatique
L'outil génère une Légende à partir des Factions et motifs présents ; l'utilisateur peut la masquer, la déplacer, renommer ses entrées et y ajouter des lignes (ex. « Retrait : Albanie 1968 »). Réalise UJ-3.
- Ajouter une Faction au Projet l'ajoute à la Légende sans action manuelle.

#### FR-31 : Compteurs
L'utilisateur peut placer un Compteur, lui donner une valeur par Étape et l'orienter librement ; la valeur s'anime entre deux Étapes. Réalise UJ-1.

#### FR-32 : Horodatage
L'utilisateur peut afficher un Horodatage synchronisé avec les Étapes, dans plusieurs formats (AAAA-MM-JJ, JJ mois AAAA, année seule, libellé libre comme « Été 1944 »). Réalise UJ-1.

#### FR-33 : Échelle graphique
L'utilisateur peut afficher une échelle graphique (km/miles).

### 4.7 Timeline et animation

**Description :** L'animation est pilotée par des Étapes plutôt que par des images clés : l'utilisateur décrit l'état de la carte à chaque date, OPENMAP anime les transitions avec la Signature organique. Détail : addendum du brief, « Spec : Système d'animation ». Réalise UJ-1 à UJ-4.

#### FR-34 : Gérer les Étapes
L'utilisateur peut ajouter, dupliquer, réordonner et supprimer des Étapes ; chaque Étape a une date, une durée de transition et une durée de maintien.
- Une nouvelle Étape part de l'état de l'Étape précédente.

#### FR-35 : Lecture et scrubbing
L'utilisateur peut lire la Timeline, la mettre en pause, se placer à n'importe quel instant et régler la vitesse de lecture.

#### FR-36 : Actes
L'utilisateur peut regrouper des Étapes en Actes nommés ; les Templates proposent par défaut « avant / pendant / après ».

#### FR-37 : Transitions de Territoire
L'utilisateur peut choisir, par Étape, la transition des Territoires : propagation (le Territoire s'étend depuis la Ligne de front), fondu ou balayage. Par défaut : propagation.

#### FR-38 : Signature organique
La Signature organique s'applique par défaut à toutes les animations ; son intensité est réglable, jusqu'à désactivation complète.

#### FR-39 : Persistance des éléments
L'utilisateur peut faire persister un élément sur toutes les Étapes suivantes ou le limiter à une plage d'Étapes.

### 4.8 Caméra

**Description :** La caméra raconte autant que la carte. OPENMAP reprend les presets éprouvés du marché et ajoute un cadrage automatique. Réalise UJ-2.

#### FR-40 : Presets caméra
L'utilisateur peut choisir un Preset caméra par Étape : fixe, fly-to, orbit, sweep, bounce, ou cadrage automatique (la caméra cadre ce qui change à cette Étape). Le cadrage automatique est le réglage par défaut.

#### FR-41 : Cadrage manuel
L'utilisateur peut fixer à la main la position, le zoom et la rotation de la caméra pour une Étape, en remplacement du Preset.

### 4.9 Import de visuels

**Description :** L'utilisateur garde la main sur son identité : ses images, ses portraits, ses propres cartes. Réalise UJ-4.

#### FR-42 : Importer des images
L'utilisateur peut importer des images (PNG, JPG, SVG) comme éléments positionnables, ou comme Emblème ou Icône d'événement.

#### FR-43 : Carte personnelle en fond
L'utilisateur peut importer une image de carte et la caler à la main (position, échelle, rotation, opacité), par-dessus ou à la place du Fond. `[HYPOTHÈSE : calage manuel uniquement en v1, pas de géoréférencement automatique.]`

### 4.10 Export

**Description :** Le livrable du créateur, destiné à son logiciel de montage. Réalise UJ-1 à UJ-4.

#### FR-44 : Export vidéo
L'utilisateur peut exporter la Timeline, ou une plage d'Étapes, en MP4 dans les Formats de sortie 16:9, 9:16 et 1:1, en 1080p à 30 ou 60 images/s. `[HYPOTHÈSE : 1080p maximum en v1, 4K plus tard ; pas de piste audio, le son étant ajouté au montage.]`
- L'export affiche sa progression et peut être annulé.
- Aucun filigrane en v1. `[HYPOTHÈSE]`

#### FR-45 : Export image
L'utilisateur peut exporter en PNG ou JPG l'état de la carte à n'importe quel instant de la Timeline, avec l'option fond transparent en PNG. Réalise UJ-3.

### 4.11 Projets et organisation

**Description :** Pas de compte en v1 : tout vit dans le navigateur, et le Fichier projet sert de sauvegarde et de moyen de transfert. Réalise UJ-4.

#### FR-46 : Sauvegarde automatique
Le Projet est sauvegardé localement à chaque modification, sans action de l'utilisateur. Réalise UJ-4.
- Après fermeture ou plantage de l'onglet, la réouverture restitue le Projet dans son dernier état.

#### FR-47 : Fichier projet
L'utilisateur peut exporter un Projet en Fichier projet (médias importés inclus) et l'importer sur une autre machine.

#### FR-48 : Annuler / rétablir
L'utilisateur peut annuler et rétablir ses actions sur plusieurs niveaux (Ctrl+Z / Ctrl+Y).

#### FR-49 : Projets récents
L'utilisateur retrouve la liste de ses Projets à l'ouverture d'OPENMAP, et peut les renommer, dupliquer ou supprimer.

#### FR-50 : Calques
L'utilisateur peut masquer, verrouiller et réordonner les Calques.

#### FR-51 : Modes édition et présentation
L'utilisateur peut basculer entre Mode édition (caméra libre) et Mode présentation (caméra de la Timeline, rendu identique à l'export).

## 5. Données historiques et contenu

C'est le chantier le plus risqué et le plus défendable du projet ; il mérite ses propres règles.

- **Licences** — Tant que la licence du code d'OPENMAP n'est pas tranchée, seules des données à licence permissive (domaine public, CC0, CC BY, MIT) entrent dans la Bibliothèque. Les données non commerciales (NC) sont exclues ; les données copyleft (GPL, ODbL, CC BY-SA) sont écartées jusqu'à décision. Piste privilégiée : Cliopatria (CC BY 4.0) pour l'historique et Natural Earth pour l'actuel — voir `addendum.md`.
- **Attribution** — Chaque élément de la Bibliothèque porte sa source et sa licence (FR-11).
- **Drapeaux et blasons** — Aucun Emblème n'entre dans la Bibliothèque sans licence vérifiée. Les trois sites repérés (flaglog.com, fr.flagsdb.com, touslesdrapeaux.xyz) ne sont pas vérifiés et ne sont pas utilisables en l'état.
- **Exactitude** — Les frontières historiques sont approximatives par nature ; l'outil n'affiche pas une fausse précision (date réelle des données, FR-6) et laisse l'utilisateur corriger (FR-10).
- **Neutralité** — Pour les territoires contestés (actualité comprise), la Bibliothèque suit sa source sans trancher, et l'utilisateur reste libre de représenter la situation comme il l'entend dans son Projet.
- **Volume au lancement** — Couverture priorisée par ère, sans exhaustivité. `[HYPOTHÈSE : environ 5 Templates et 10 Kits de Faction par ère au lancement, soit ~20 Templates et ~40 Kits.]`

## 6. Exigences non fonctionnelles transverses

- **NFR-1 Fidélité** — L'export reproduit exactement le Mode présentation : mêmes éléments, mêmes positions, mêmes durées. Contrairement au concurrent principal, aucun « l'aperçu peut différer de l'export ».
- **NFR-2 Fluidité** — L'aperçu tourne à 30 images/s au moins sur un PC de milieu de gamme pour un projet type (jusqu'à 200 Territoires et 50 Jetons visibles). `[HYPOTHÈSE sur la machine de référence et la taille de projet type.]`
- **NFR-3 Temps d'export** — Une vidéo de 60 s en 1080p/30 s'exporte en 3 minutes au plus sur la même machine. `[HYPOTHÈSE]`
- **NFR-4 Navigateurs** — Chrome et Edge récents sur ordinateur sont pris en charge en v1 ; Firefox au mieux. Sur mobile ou tablette, un message explique que l'outil est conçu pour ordinateur. `[HYPOTHÈSE liée aux API d'encodage vidéo du navigateur.]`
- **NFR-5 Aucune perte de travail** — Toute modification est persistée en 5 secondes au plus (FR-46).
- **NFR-6 Confidentialité** — Aucun contenu de Projet ne quitte la machine de l'utilisateur ; seules les tuiles de carte et les données de la Bibliothèque sont téléchargées.
- **NFR-7 Temps jusqu'à la première carte** — Via l'assistant, une carte animée présentable est obtenue en moins de 2 minutes.
- **NFR-8 Écran** — L'interface est utilisable dès une résolution de 1366×768.

## 7. Esthétique et plateforme

- **Esthétique** — La Signature organique et le Fond parchemin donnent le ton par défaut. Les rendus visés sont ceux des références fournies : cartes d'alliances lisibles façon manuel (UJ-3), cartes de campagne vintage (UJ-4), timelapses satellite d'actualité (UJ-1). L'interface elle-même reste sobre en v1 ; l'habillage façon RTS vient après.
- **Plateforme** — Application web pour ordinateur uniquement en v1 (voir NFR-4). Pas d'application mobile ni de bureau.

## 8. Monétisation

Aucune en v1 : l'outil est gratuit et sans filigrane (`[HYPOTHÈSE]`), la priorité étant de prouver l'utilité et d'obtenir une adoption spontanée (§11). Le modèle économique sera défini après validation. Contrainte à respecter dès maintenant : ne rien construire (données, licences, fournisseurs) qui interdirait un usage commercial futur.

## 9. Non-objectifs

- OPENMAP n'est pas un outil de cartographie généraliste ni un SIG.
- Pas d'échelle tactique en v1 (terrain détaillé, formations, ordres de bataille façon Waterloo).
- Pas de course à la parité de réglages avec AnimateMyMap (animations de frontière multiples, réglages Bézier avancés).
- Pas d'éditeur vidéo : ni montage, ni voix off, ni musique.
- Pas de génération par IA (« tape ton sujet, obtiens ta carte ») en v1.
- Pas de collaboration, de comptes, ni de partage en ligne en v1.
- Pas de 3D.

## 10. Périmètre MVP

### 10.1 Dans le périmètre
- Assistant de démarrage et Bibliothèque de Templates par ère (4.1)
- Fonds stylisés et satellite, frontières à une date, correction locale des données, attribution (4.2)
- Kits de Faction avec héritage, Bibliothèque de Kits, remplissage par drapeau (4.3)
- Territoires, conquête province par province, Lignes de front automatiques, Poches, motifs (4.4)
- Flèches, Jetons d'unité, Icônes d'événement, mise en évidence (4.5)
- Textes, Légende automatique, Compteurs, Horodatage, échelle (4.6)
- Timeline par Étapes, transitions, Signature organique (4.7)
- Presets caméra et cadrage automatique (4.8)
- Import d'images et de carte personnelle (4.9)
- Export MP4 16:9 / 9:16 / 1:1 en 1080p et export image (4.10)
- Sauvegarde locale, Fichier projet, Calques, annuler/rétablir (4.11)

### 10.2 Hors périmètre MVP
- Échelle tactique — v2 ; demande du terrain dessiné et des formations, sans données toutes prêtes.
- Comptes et sauvegarde dans le cloud — v2 ; pas de backend en v1.
- Export 4K et piste audio — v2.
- Habillage UI façon RTS — v2.
- Bibliothèque communautaire de Templates et Kits — v2 ; suppose des comptes.
- Couche ludique (rejouer une bataille) — vision long terme.
- Interface mobile — non prévue.

## 11. Indicateurs de succès

La mesure suppose une télémétrie anonyme et respectueuse de la vie privée, sans compte (voir Question ouverte 3).

**Principal**
- **SM-1 Adoption spontanée** — Nombre de créateurs distincts qui publient un contenu réalisé avec OPENMAP et le mentionnent sans sollicitation. Cible : 10 dans les 6 mois suivant le lancement. `[HYPOTHÈSE sur la cible]` Valide l'ensemble du produit.

**Secondaires**
- **SM-2 Temps jusqu'au premier export** — Médiane entre l'ouverture d'OPENMAP par un nouvel utilisateur et son premier export : moins de 15 minutes. Valide FR-2, FR-44.
- **SM-3 Taux de complétion** — Part des Projets créés qui aboutissent à au moins un export : 40 % ou plus. Valide 4.1 à 4.10.
- **SM-4 Retour** — Part des utilisateurs qui exportent au moins deux fois, sur des jours différents, dans les 30 jours : 25 % ou plus. Valide FR-16, FR-46.

**Contre-indicateurs (ne pas optimiser)**
- **SM-C1 Nombre de réglages exposés par défaut** — À contenir, pas à augmenter : la pression de la concurrence pousse à tout copier, au détriment de la simplicité. Contrebalance la tentation de parité.
- **SM-C2 Visites et installations brutes** — Métrique de vanité ; seule l'adoption réelle compte. Contrebalance SM-1.
- **SM-C3 Durée moyenne des sessions** — Une session plus longue n'est pas un succès si la promesse est la rapidité. Contrebalance SM-2.

## 12. Questions ouvertes

1. **Licence du code** — OPENMAP sera-t-il open source ? La réponse ouvre ou ferme l'accès aux données copyleft et à la réutilisation de code de projets comme OpenAnimateMyMaps (MIT).
2. **Fournisseur satellite** — Lequel, à quel coût et sous quelle licence pour un usage dans des vidéos publiées ? À trancher en architecture.
3. **Mesure** — Quelle télémétrie anonyme, sans compte, pour suivre SM-2 à SM-4 ? SM-1 se mesure par veille manuelle.
4. **Langues de l'interface** — Français, anglais, les deux au lancement ? L'audience des créateurs est largement anglophone.
5. **Volume de contenu au lancement** — Combien de Templates, de Kits et d'Emblèmes par ère, et qui les produit ?
6. **Audio dans l'export** — Faut-il pouvoir ajouter une musique de fond pour les créateurs qui publient sans monter ?
7. **Monétisation future** — Gratuité totale, freemium, filigrane ? À décider après SM-1.
8. **Provinces historiques** — Les jeux de données permissifs ont peu de subdivisions avant l'époque contemporaine ; faut-il produire ce contenu soi-même pour les ères prioritaires ?
9. **Face au War Tool gratuit et à OpenAnimateMyMaps** — La conquête province par province existe déjà gratuitement ; la différenciation (Kits, Signature organique, Templates, données) suffit-elle ? À tester auprès des créateurs avant de coder l'essentiel.

## 13. Index des hypothèses

- §4.2 FR-7 — Subdivisions surtout disponibles pour la période contemporaine en v1.
- §4.9 FR-43 — Calage manuel de la carte personnelle, sans géoréférencement automatique.
- §4.10 FR-44 — Export plafonné à 1080p en v1 ; pas de piste audio.
- §4.10 FR-44 — Pas de filigrane en v1.
- §5 — Environ 5 Templates et 10 Kits par ère au lancement.
- §6 NFR-2 — Machine de référence et taille de projet type pour la fluidité.
- §6 NFR-3 — 3 minutes pour exporter 60 s en 1080p/30.
- §6 NFR-4 — Chrome et Edge requis, Firefox au mieux.
- §8 — Gratuit et sans filigrane en v1.
- §11 SM-1 — Cible de 10 créateurs en 6 mois.
