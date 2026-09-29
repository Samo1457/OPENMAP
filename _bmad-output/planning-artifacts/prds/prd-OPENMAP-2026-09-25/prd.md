---
title: OPENMAP — PRD
status: draft
created: 2026-09-25
updated: 2026-09-29
---

# PRD : OPENMAP
*Nom de travail — à confirmer.*

## 0. Objet du document

Cette PRD définit ce qu'OPENMAP v1 doit permettre de faire, pour servir de base aux étapes suivantes (UX, architecture, epics et stories). Elle s'appuie sur le Product Brief final (`briefs/brief-OPENMAP-2026-09-24/brief.md`), sur son addendum (spécifications détaillées issues du brainstorming) et sur les références visuelles fournies : carte des alliances de la Guerre froide, campagne de Normandie 1944, plans de Waterloo, timelapses Kiev et Marioupol, démonstration du War Tool d'AnimateMyMap.

**Autorité.** En cas de divergence avec l'addendum du brief, la PRD prévaut. Un élément de l'addendum du brief absent de la PRD est hors v1, sauf mention contraire.

**Lecture.** Le vocabulaire est fixé par le Glossaire (§3) et s'emploie tel quel partout. Les exigences fonctionnelles (FR) sont numérotées globalement et portent une priorité **[P0]**, **[P1]** ou **[P2]** (§10). Les hypothèses sont marquées `[HYPOTHÈSE]` et indexées en §14. Le détail technique (pistes de stack, jeux de données, fournisseur satellite, analyse des références) vit dans `addendum.md`.

## 1. Vision

OPENMAP est un éditeur web, sur ordinateur, pour créer des cartes historiques et géopolitiques animées — conquêtes, évolutions de frontières, lignes de front, sièges — aussi simple à prendre en main que Canva. Un créateur de contenu choisit un Template, une date, une Région et des Factions, et obtient en quelques minutes une Carte déjà animée, qu'il affine ensuite autant qu'il veut avant de l'exporter en vidéo ou en image pour son montage.

Le produit vise le milieu d'un marché en « haltère » : entre la suite pro (After Effects + GEOlayers, puissant mais long et coûteux à maîtriser) et le bricolage ou la sous-traitance. Il se distingue des outils existants (AnimateMyMap et son War Tool, Animaps, Mapimator) non par l'exhaustivité des réglages, mais par trois choses : des **Kits de Faction** réutilisables avec héritage de Sous-factions, une **Signature organique** qui rend un Template personnel sans effort, et un parcours guidé façon Canva. Il reprend sans complexe ce que la concurrence a déjà bien simplifié, comme les Presets caméra. L'esprit des jeux de stratégie (RTS) inspire le style : jetons d'unités, brouillard de guerre, conquête visible.

À plus long terme : un usage éducatif assumé, un mode historique qui ferait évoluer les frontières tout seul au fil de la Timeline, et peut-être une couche ludique où l'on rejoue une bataille plutôt que de la raconter. Le véritable actif durable est la **donnée** — frontières, drapeaux et Kits correctement sourcés et vérifiés — mais sa construction n'est pas un objectif de la v1, qui s'appuie sur des jeux de données ouverts (§5).

## 2. Utilisateur cible

### 2.1 Jobs To Be Done

- **Fonctionnel** — produire pour chaque vidéo une carte animée juste et lisible, sans passer des heures dans After Effects ni payer un motion designer. `[HYPOTHÈSE : la douleur « temps + coût des outils » est déduite du marché (concurrents, tutoriels YouTube) et d'un intérêt poli de quelques créateurs ; elle n'est pas encore validée par une recherche utilisateur — voir R1 et le plan de validation, §12.]`
- **Émotionnel** — avoir l'air pro, avec un rendu qui tient la comparaison avec les grandes chaînes (Kings and Generals, Baz Battles), sans compétences en motion design.
- **Contextuel** — enchaîner vite : une vidéo d'actualité géopolitique doit sortir quand le sujet est chaud ; le format vertical (Shorts) impose d'aller encore plus vite.
- **Social** — une identité visuelle cohérente d'une vidéo à l'autre (mêmes couleurs, mêmes emblèmes pour les mêmes camps).

Publics : créateurs de contenu historique et géopolitique (primaire) ; enseignants et passionnés d'histoire ou de wargame (secondaire).

### 2.2 Non-utilisateurs (v1)

- Cartographes et analystes SIG qui ont besoin de précision géodésique, de projections au choix ou d'import de données géographiques brutes.
- Réalisateurs de batailles à l'échelle tactique (terrain détaillé, formations, ordre de bataille façon Waterloo) — échelle repoussée après la v1.
- Utilisateurs sur mobile ou tablette.
- Équipes qui veulent éditer à plusieurs en temps réel.

### 2.3 Parcours utilisateur clés

- **UJ-1. Terrabellum sort un Short sur le siège de Marioupol le soir même.**
  Terrabellum, YouTubeur géopolitique, veut publier un Short vertical pendant que le sujet est chaud. Il ouvre OPENMAP sur son PC, sans compte. Dans l'assistant, il choisit le Template « Conflit contemporain — siège de ville », tape « Marioupol » comme Région, la date de référence 2022 et les Factions Russie et Ukraine, dont les Kits officiels s'appliquent automatiquement. Il passe en Fond satellite, dessine la Poche ukrainienne à main levée, puis crée une Étape par semaine de mars à mai, en resserrant le tracé de la Poche à chaque fois. Il aligne des badges ronds à drapeau le long de la Ligne de front — ils suivront le front à chaque Étape —, ajoute un Compteur d'effectifs par camp et un Horodatage qui défile jour après jour. Il scrubbe la Timeline : la Poche se resserre en se déformant, avec la Signature organique. Il exporte en 9:16. **Climax :** en moins de 20 minutes depuis l'ouverture, il a un MP4 vertical prêt pour son montage. **Cas limite :** il trouve le tracé de la Poche trop grossier à la 3e Étape ; il corrige ses points à cette Étape, et la correction s'applique aux Étapes suivantes qui n'ont pas leur propre tracé, sans toucher aux Étapes 1 et 2.

- **UJ-2. Terrabellum raconte l'expansion ottomane dans les Balkans.**
  Pour une vidéo longue en 16:9, il part du Template « Expansion d'empire » (ère Temps modernes), date de référence 1450. Il applique le Kit officiel « Empire ottoman » — une copie propre au Projet — puis crée une Sous-faction « Vassaux ottomans » qui hérite du style mais change de couleur. Étape après étape (1453, 1459, 1463…), il désigne l'Empire ottoman comme attaquant et peint au pinceau les Entités géographiques conquises ; là où les données n'ont pas le découpage voulu, il peint librement une surface qui s'ajoute au Territoire ottoman. La Ligne de front se redessine seule face aux Factions en conflit, mais pas entre l'Empire et ses vassaux. Il choisit le Preset caméra « fly-to » pour les Étapes clés. **Climax :** en changeant la teinte du Kit parent à la fin, tous les Territoires, Flèches et Jetons ottomans — vassaux compris — se mettent à jour sur toute la Timeline. **Cas limite :** il enregistre sa version du Kit parmi ses Kits personnels pour sa prochaine vidéo ; le Kit officiel de la Bibliothèque reste inchangé.

- **UJ-3. Claire, prof d'histoire-géo, prépare la carte des alliances de la Guerre froide.**
  Claire n'a jamais utilisé d'outil de motion design. Elle part du Template « Alliances », date de référence 1968, et assigne les pays à l'OTAN et au Pacte de Varsovie, avec une teinte plus claire pour les adhésions tardives (Sous-factions). Elle applique des hachures à l'Albanie (retrait en 1968) et laisse la Suède, la Finlande et la Yougoslavie neutres. Le Template désactive la Ligne de front : aucune ligne n'apparaît sur le rideau de fer. La Légende se génère toute seule. Elle exporte une image PNG pour son diaporama, puis une courte vidéo montrant les adhésions de 1949 à 1968 pour lancer son cours. **Climax :** une Carte propre et lisible, comparable aux cartes des manuels, sans rien dessiner. **Cas limite :** les libellés de pays sont en anglais ; elle les renomme sur sa Carte (voir Q4).

- **UJ-4. Hugo, passionné de wargame, reconstitue la percée de Normandie à partir d'une vieille carte.**
  Hugo possède un scan d'une carte d'époque de l'été 1944. Il crée un Projet vierge, importe le scan par glisser-déposer et le cale à la main sur la Normandie (position, échelle, rotation, opacité). Il trace les Territoires alliés aux dates du 6 juin, du 12 juin et du 25 juillet et garde visibles les Traces de front de ces dates, chacune avec sa date. Il trace de grosses Flèches de percée dans la catégorie « Percée » (rouge) et d'autres dans la catégorie « Réduction de la poche » (bleu). Il place des Jetons d'unité à drapeau avec une étiquette encadrée (« 7 C. », « 1 Ar. ») et des étiquettes de commandement (« Gal Bradley »). Il choisit le Fond parchemin. **Climax :** son animation reprend l'esthétique vintage qu'il aime, mais les fronts avancent tout seuls. **Cas limite :** il ferme l'onglet par erreur ; en rouvrant OPENMAP, son Projet est là, dans l'état d'il y a quelques secondes au plus (NFR-5).

## 3. Glossaire

- **Projet** — L'unité de travail : une Carte, sa Timeline, ses Calques, ses Kits de Faction et ses médias importés. Sauvegardé localement ; exportable en Fichier projet.
- **Carte** — Ce que l'utilisateur compose et anime : un Fond de carte, des Territoires et tous les éléments posés dessus. Un Projet contient une seule Carte.
- **Fichier projet** — Export portable d'un Projet (données, Kits et médias importés), réimportable sur une autre machine.
- **Date de référence** — Date fixée pour le Projet, qui détermine les Entités géographiques et le Fond utilisés. Elle ne change pas d'une Étape à l'autre.
- **Date d'Étape** — Date propre à chaque Étape ; elle ordonne la Timeline et alimente l'Horodatage. Elle ne modifie pas les Entités géographiques.
- **Ère** — L'une des quatre grandes périodes de classement de la Bibliothèque : Antiquité, Moyen Âge, Temps modernes, Ère contemporaine.
- **Région** — L'étendue géographique sur laquelle porte une Carte (ex. « Normandie », « Balkans »).
- **Template** — Projet de départ fourni par OPENMAP : Fond, Région, Date de référence, Factions suggérées, Étapes pré-remplies, Flèches suggérées. Rien n'y est verrouillé.
- **Fond de carte** — Couche visuelle de base : stylisé (parchemin par défaut, sombre, clair, relief) ou satellite.
- **Entité géographique** — Polygone issu des données d'OPENMAP : pays, empire, entité politique ou subdivision (province), valide à la Date de référence.
- **Zone dessinée** — Polygone tracé par l'utilisateur, à main levée ou point par point.
- **Territoire** — Surface contrôlée par une Faction à une Étape, constituée d'Entités géographiques et/ou de Zones dessinées. Un Territoire sans Faction est **neutre**.
- **Poche** — Territoire marqué comme encerclé, avec un style distinct.
- **Relation** — Lien entre deux Factions : **en conflit**, **alliées** ou **sans lien**. Détermine où s'affiche la Ligne de front.
- **Ligne de front** — Limite affichée entre les Territoires de deux Factions en conflit, recalculée à chaque Étape.
- **Trace de front** — Ligne de front d'une Étape passée, laissée visible avec sa date aux Étapes suivantes.
- **Faction** — Camp représenté sur la Carte (pays, empire, alliance, armée). Porte exactement un Kit de Faction.
- **Kit de Faction** — Ensemble de styles d'une Faction (couleurs, Emblème, police, style de frontière, de Flèche et de Jeton d'unité, réglages de Signature organique). Dans un Projet, chaque Kit est une copie propre au Projet.
- **Sous-faction** — Faction dont le Kit hérite d'un Kit parent et n'en surcharge que certains champs.
- **Emblème** — Drapeau, blason ou symbole d'une Faction (image), avec une variante réduite pour les petites tailles.
- **Bibliothèque** — Catalogue officiel d'OPENMAP : Templates, Kits de Faction, Emblèmes, Icônes d'événement. En lecture seule pour l'utilisateur.
- **Kits personnels** — Kits enregistrés par l'utilisateur hors de tout Projet, réutilisables d'un Projet à l'autre.
- **Flèche** — Tracé de mouvement animé, rattaché à une Faction ou à une Catégorie de flèche.
- **Catégorie de flèche** — Style de Flèche nommé indépendant des Factions (ex. « Percée », « Réduction de la poche »), qui apparaît dans la Légende.
- **Zone d'annotation** — Surface colorée qui n'appartient à aucune Faction (ex. zone de débarquement, zone de combat), avec son entrée de Légende.
- **Jeton d'unité** — Marqueur d'une force militaire (symbole de type OTAN simplifié, carré bicolore, badge rond à drapeau, mini-drapeau), avec étiquette optionnelle.
- **Série de Jetons** — Groupe de Jetons d'unité attaché à une Ligne de front ou au contour d'un Territoire, qui suit ce tracé d'une Étape à l'autre.
- **Icône d'événement** — Pictogramme ponctuel ou mobile : explosion, avion, parachute, fumée, bataille, siège, ou image importée.
- **Compteur** — Nombre affiché sur la Carte dont la valeur change d'une Étape à l'autre (effectifs, pertes, pourcentage).
- **Horodatage** — Date affichée à l'écran, qui défile entre les Dates d'Étape.
- **Légende** — Encadré listant Factions, motifs, Catégories de flèche et types de Jetons utilisés, généré automatiquement.
- **Étape** — Unité de la Timeline : un état de la Carte à une Date d'Étape, avec une durée de transition et une durée de maintien.
- **Acte** — Groupe nommé d'Étapes (par défaut : avant / pendant / après).
- **Timeline** — Suite ordonnée des Étapes, lisible et scrubbable.
- **Preset caméra** — Mouvement de caméra prédéfini appliqué à une Étape (§4.8).
- **Signature organique** — Style d'animation par défaut d'OPENMAP : easing avec léger dépassement, bordures légèrement tremblées, pulsation avant un changement d'état. Réglée par Kit de Faction, avec une valeur par défaut au niveau du Projet (§4.7).
- **Effet d'ambiance** — Effet d'inspiration RTS appliqué à la Carte : brouillard de guerre, barre de progression de conquête.
- **Calque** — Groupe d'éléments de même nature (Territoires, Flèches, Jetons, textes, médias) qu'on peut masquer, verrouiller et réordonner.
- **Mode édition / Mode présentation** — En édition, la caméra est libre ; en présentation, elle suit la Timeline, exactement comme dans l'export.
- **Format de sortie** — Ratio de la Carte : 16:9, 9:16 ou 1:1. Propriété du Projet.

## 4. Fonctionnalités

### 4.0 Modèle d'état des Étapes

Règles communes à toutes les fonctionnalités animées. `[HYPOTHÈSE : modèle retenu par défaut, à confirmer en UX.]`

- **Héritage vers l'avant.** Une nouvelle Étape part de l'état de l'Étape précédente. Chaque propriété d'un élément (appartenance d'un Territoire, points d'une Zone dessinée, position d'un Jeton, valeur d'un Compteur…) prend la valeur posée à l'Étape la plus récente qui en définit une, à l'Étape courante ou avant.
- **Portée d'une modification.** Modifier une propriété à l'Étape N fixe sa valeur à N ; les Étapes suivantes qui n'ont pas leur propre valeur en héritent ; les Étapes précédentes ne changent pas. L'utilisateur peut aussi choisir d'appliquer une modification « à toutes les Étapes ».
- **Existence.** Un élément existe à partir de l'Étape où il est créé et persiste ensuite, sauf si l'utilisateur le limite à une plage d'Étapes (FR-45).
- **Appartenance.** Une Entité géographique appartient à un seul Territoire par Étape. Une Zone dessinée posée sur une Entité l'emporte sur elle là où elles se recouvrent.

### 4.1 Démarrage et Templates

**Description :** Le premier contact se fait par un assistant qui mène de rien à une Carte animée : Template → Date de référence → Région → Factions. L'utilisateur peut aussi partir d'un Projet vierge. Réalise UJ-1, UJ-2, UJ-3.

#### FR-1 : Créer un Projet [P0]
L'utilisateur peut créer un Projet à partir d'un Template ou d'une Carte vierge, sans compte. Réalise UJ-1, UJ-2, UJ-3, UJ-4.
- Un Projet est créé et ouvert dans l'éditeur sans inscription ni connexion.
- Le Projet apparaît dans la liste des Projets (FR-52).

#### FR-2 : Assistant de démarrage [P0]
L'utilisateur peut suivre un assistant : choix du Template, de la Date de référence, de la Région, puis des Factions à mettre en avant. Réalise UJ-1, UJ-2, UJ-3.
- L'assistant tient en 5 écrans au plus ; chaque écran peut être passé, les valeurs du Template étant alors conservées.
- En sortie, la Carte compte au moins 2 Étapes avec au moins un changement de Territoire, les Kits appliqués et la Légende visible : la lecture de la Timeline produit une animation sans autre action.
- Chaque Faction choisie reçoit une copie du Kit de la Bibliothèque s'il existe, sinon un Kit par défaut de couleur distincte des autres Factions du Projet.

#### FR-3 : Parcourir les Templates [P0]
L'utilisateur peut filtrer les Templates par Ère, par type (bataille ponctuelle, campagne, expansion sur la durée, géopolitique actuelle) et par recherche texte.
- Chaque Template affiche une vignette (ou un aperçu animé), sa Région et sa Date de référence.

#### FR-4 : Templates non verrouillés [P0]
Tout élément issu d'un Template peut être modifié, déplacé ou supprimé.
- Aucun élément d'un Projet créé depuis un Template n'est en lecture seule, y compris les Flèches suggérées et les Étapes pré-remplies.

### 4.2 Fonds de carte et géographie

**Description :** La Carte repose sur un Fond (stylisé ou satellite) et sur les Entités géographiques valides à la Date de référence du Projet. La géographie ne change pas au fil des Étapes : c'est l'utilisateur qui fait évoluer les Territoires. L'échelle v1 couvre le stratégique (pays, empires) et l'opérationnel (provinces, fronts, poches, villes). Réalise UJ-1 à UJ-4.

#### FR-5 : Choisir le Fond de carte [P0]
L'utilisateur peut choisir un Fond stylisé (parchemin par défaut, sombre, clair, relief) ou satellite, et en changer à tout moment.
- Changer de Fond ne modifie ni ne supprime aucun élément du Projet.
- La luminosité, la saturation et une teinte du Fond sont réglables, pour que des Territoires semi-transparents restent lisibles sur le satellite.
- Satellite : piste Copernicus Sentinel-2 (voir addendum et Q2). S'il ne peut être servi, l'outil bascule sur le Fond sombre et le signale.

#### FR-6 : Date de référence [P0]
L'utilisateur fixe la Date de référence du Projet (dans l'assistant ou ensuite) ; la Carte affiche les Entités géographiques valides à cette date.
- La Date de référence accepte les dates avant notre ère et une précision à l'année.
- Si les données n'ont pas d'état exact à cette date, la Carte utilise l'état valide le plus proche et affiche la date réelle des données.
- Changer la Date de référence en cours de Projet demande confirmation : les Territoires construits sur des Entités qui n'existent plus à la nouvelle date sont convertis en Zones dessinées.

#### FR-7 : Subdivisions [P1]
L'utilisateur peut sélectionner des subdivisions (provinces) là où les données en contiennent. `[HYPOTHÈSE : en v1, les subdivisions sont surtout disponibles pour l'Ère contemporaine ; ailleurs, la conquête passe par les entités politiques, la peinture libre (FR-21) ou le découpage (FR-11).]`
- Quand aucune subdivision n'existe pour la Région et la Date de référence, l'outil le signale et propose de peindre librement ou de découper.

#### FR-8 : Rechercher un lieu [P0]
L'utilisateur peut rechercher un pays, une ville ou une Entité géographique par son nom ; la caméra d'édition s'y centre.

#### FR-9 : Couches et libellés géographiques [P1]
L'utilisateur peut afficher ou masquer villes, fleuves et noms de lieux, et renommer tout libellé dans son Projet. Réalise UJ-3.
- Un Territoire peut afficher automatiquement le nom de sa Faction, placé dans sa surface et recentré quand elle change.

#### FR-10 : Attribution des sources [P0]
L'outil affiche la source et la licence des données utilisées par le Projet, et permet d'inclure le crédit dans l'export.
- Chaque Fond et chaque jeu de frontières affiché a une attribution consultable.
- L'option « crédit dans l'export » est activée par défaut quand la licence l'exige (ex. « Contains modified Copernicus Sentinel data [année] »).

#### FR-11 : Corriger les données dans un Projet [P1]
L'utilisateur peut redessiner, découper ou fusionner une Entité géographique dans son Projet. Réalise UJ-2.
- La correction ne s'applique qu'au Projet et ne modifie pas la Bibliothèque.
- Une Entité corrigée est signalée comme telle dans l'éditeur.

### 4.3 Kits de Faction

**Description :** Chaque Faction porte un Kit de Faction : un seul endroit pour son identité visuelle, appliqué partout où la Faction apparaît. Dans un Projet, un Kit est toujours une copie : le modifier n'affecte que ce Projet. Les Kits personnels servent à réutiliser un style d'un Projet à l'autre. Réalise UJ-1, UJ-2, UJ-3.

#### FR-12 : Créer et éditer un Kit [P0]
L'utilisateur peut créer ou éditer un Kit : nom, Ère, couleurs (remplissage, contour, sélection), Emblème et sa variante réduite, police, style de frontière (épaisseur, intensité du tremblé), style de Flèche (épaisseur, forme de tête), forme de Jeton d'unité, réglages de Signature organique (FR-42).
- Chaque champ modifié s'applique immédiatement à tous les éléments de la Faction, sur toutes les Étapes du Projet. Réalise UJ-2.

#### FR-13 : Appliquer un Kit [P0]
L'utilisateur peut assigner une Faction à un Territoire, une Flèche ou un Jeton en un clic ; l'élément prend le style du Kit.
- Appliquer un Kit de la Bibliothèque ou un Kit personnel en crée une copie dans le Projet.
- Une mise à jour ultérieure de la Bibliothèque ne modifie aucun Projet existant.

#### FR-14 : Sous-factions [P0]
L'utilisateur peut créer une Sous-faction dont le Kit hérite d'un Kit parent du Projet. Réalise UJ-2, UJ-3.
- Un champ non surchargé suit le Kit parent quand celui-ci change ; un champ surchargé garde sa valeur.
- L'éditeur indique quels champs sont hérités et lesquels sont surchargés, et permet de revenir à la valeur héritée.
- Par défaut, une Sous-faction et son parent sont alliés (FR-22).

#### FR-15 : Bibliothèque de Kits [P0]
L'utilisateur peut chercher un Kit officiel par nom, Ère ou région du monde, et l'appliquer.
- Les Kits de la Bibliothèque ne sont jamais modifiés par l'utilisateur ; il modifie la copie présente dans son Projet.

#### FR-16 : Kits personnels [P1]
L'utilisateur peut enregistrer un Kit du Projet dans ses Kits personnels, les appliquer dans d'autres Projets, et les exporter ou importer en fichier.
- Modifier un Kit personnel ne change pas les Projets où il a déjà été appliqué ; pousser la mise à jour vers un Projet est une action explicite depuis ce Projet.

#### FR-17 : Remplissage par drapeau [P1]
L'utilisateur peut remplir un Territoire avec l'Emblème de sa Faction, avec une opacité réglable.
- Une Entité conquise prend le remplissage de sa nouvelle Faction, drapeau compris, pendant la transition.

### 4.4 Territoires, Relations et Lignes de front

**Description :** Le cœur du récit : qui contrôle quoi, à chaque Étape. Les Territoires se construisent en sélectionnant des Entités géographiques ou en dessinant, et changent de main d'une Étape à l'autre selon le modèle d'état (§4.0). Réalise UJ-1 à UJ-4.

#### FR-18 : Sélectionner des Entités [P0]
L'utilisateur peut former un Territoire en sélectionnant une ou plusieurs Entités géographiques.

#### FR-19 : Dessiner une Zone [P0]
L'utilisateur peut tracer une Zone dessinée à main levée ou point par point, et modifier ses points à n'importe quelle Étape. Réalise UJ-1, UJ-4.
- Entre deux Étapes où ses points diffèrent, une Zone dessinée se déforme en continu pendant la transition.

#### FR-20 : Conquête au pinceau [P0]
L'utilisateur peut, à une Étape, désigner une Faction attaquante puis peindre au pinceau les Entités géographiques qu'elle prend. Réalise UJ-2.
- Les Entités peintes changent de Faction à cette Étape ; la transition s'anime selon FR-39.
- Le nombre d'Entités sélectionnées est affiché avant validation.

#### FR-21 : Peinture libre [P0]
En mode conquête, l'utilisateur peut peindre librement une surface, indépendamment des Entités géographiques ; elle s'ajoute au Territoire de la Faction attaquante sous forme de Zone dessinée. Réalise UJ-2.

#### FR-22 : Relations entre Factions [P0]
L'utilisateur peut régler la Relation entre deux Factions : en conflit, alliées ou sans lien.
- Par défaut, deux Factions non neutres sans lien de parenté sont en conflit ; une Sous-faction et son parent sont alliés ; un Territoire neutre n'est jamais en conflit.
- Un Template peut fixer d'autres Relations (ex. « Alliances » : aucune Faction en conflit).

#### FR-23 : Ligne de front [P0]
L'outil affiche une Ligne de front entre les Territoires de deux Factions en conflit, avec un style réglable. Réalise UJ-1, UJ-2.
- La Ligne de front est recalculée automatiquement à chaque changement de Territoire, sans tracé manuel.
- L'utilisateur peut la masquer pour tout le Projet ou pour une paire de Factions. Réalise UJ-3.

#### FR-24 : Poches [P1]
L'utilisateur peut marquer un Territoire comme Poche. Réalise UJ-1.
- Sa surface évolue d'une Étape à l'autre selon FR-19 ; la Poche disparaît quand l'utilisateur la supprime à une Étape (elle se résorbe alors pendant la transition) ou quand sa surface devient nulle.

#### FR-25 : Motifs de remplissage [P0]
L'utilisateur peut remplir un Territoire en plein, en semi-transparent, en hachures ou avec l'Emblème (FR-17). Réalise UJ-3.
- Un Territoire neutre a un style par défaut distinct de toute Faction.

#### FR-26 : Zones d'annotation [P2]
L'utilisateur peut tracer une Zone d'annotation (couleur libre, aucune Faction) et lui donner une entrée de Légende.

#### FR-27 : Traces de front [P2]
L'utilisateur peut laisser visible la Ligne de front d'une Étape passée aux Étapes suivantes, sous forme de Trace de front avec sa date. Réalise UJ-4.

### 4.5 Flèches, Jetons d'unité et Icônes d'événement

**Description :** Les éléments qui montrent le mouvement et l'action : Flèches d'offensive, forces en présence, événements ponctuels. Réalise UJ-1, UJ-4.

#### FR-28 : Flèches de mouvement [P0]
L'utilisateur peut tracer une Flèche courbe par points ; elle se dessine le long de son tracé pendant la transition de l'Étape. Réalise UJ-4.
- Par défaut, la Flèche prend le style de sa Faction ; l'épaisseur est réglable, y compris en très large pour les percées.

#### FR-29 : Catégories de flèche [P2]
L'utilisateur peut créer des Catégories de flèche (nom, couleur, style) indépendantes des Factions et les assigner à des Flèches. Réalise UJ-4.
- Chaque Catégorie utilisée apparaît dans la Légende.

#### FR-30 : Jetons d'unité [P0]
L'utilisateur peut placer des Jetons d'unité avec une étiquette optionnelle, les déplacer et les orienter entre deux Étapes. Réalise UJ-1, UJ-4.
- Formes disponibles : symbole de type OTAN simplifié, carré bicolore, badge rond à drapeau, mini-drapeau.
- Un Jeton déplacé ou tourné entre deux Étapes glisse et pivote d'un état à l'autre pendant la transition.
- L'étiquette peut être encadrée (ex. « 7 C. », « Gal Bradley »).

#### FR-31 : Séries de Jetons [P1]
L'utilisateur peut créer une Série de Jetons attachée à une Ligne de front ou au contour d'un Territoire, d'un côté choisi, avec un espacement et un nombre de rangées réglables. Réalise UJ-1.
- Quand la Ligne de front ou le contour change à une Étape, la Série se redistribue le long du nouveau tracé pendant la transition.
- Le nombre de rangées peut être lié à un Compteur (plus d'effectifs, plus de rangées). [P2 pour ce lien]

#### FR-32 : Icônes d'événement [P1]
L'utilisateur peut placer des Icônes d'événement de la Bibliothèque (explosion, avion, parachute, fumée, bataille, siège) ou une image importée (ex. portrait de commandant).
- Chaque Icône a une animation d'apparition et de disparition (par défaut : apparition en léger dépassement, disparition en fondu).
- Un avion peut suivre un tracé pendant une transition.

#### FR-33 : Mise en évidence [P2]
L'utilisateur peut entourer un groupe d'éléments d'une ellipse ou d'un contour de mise en évidence, et placer des marqueurs d'étape numérotés.

### 4.6 Textes, Légende, Compteurs et Horodatage

**Description :** Tout ce qui se lit à l'écran. Réalise UJ-1, UJ-3, UJ-4.

#### FR-34 : Textes [P0]
L'utilisateur peut ajouter titres, libellés et annotations, avec police, taille, contour, cadre et position libres.
- Un texte apparaît par défaut avec une animation de typographie (caractère par caractère ou mot par mot) calée sur la transition de son Étape.
- Texte courbe le long d'un tracé (fleuves, régions) : [P2].

#### FR-35 : Légende automatique [P1]
L'outil génère une Légende à partir des Factions, motifs, Catégories de flèche, Zones d'annotation et types de Jetons présents ; l'utilisateur peut la masquer, la déplacer, renommer ses entrées et y ajouter des lignes. Réalise UJ-3.
- Ajouter une Faction au Projet l'ajoute à la Légende sans action manuelle.

#### FR-36 : Compteurs [P1]
L'utilisateur peut placer un Compteur, lui donner une valeur par Étape, une orientation libre et une Faction ; la valeur s'anime entre deux Étapes. Réalise UJ-1.
- Un Compteur peut être ancré à un Territoire : il reste alors au centre de sa surface quand elle change.

#### FR-37 : Horodatage [P1]
L'utilisateur peut afficher un Horodatage qui défile en continu entre deux Dates d'Étape, à la granularité choisie (jour, mois ou année). Réalise UJ-1.
- Formats : AAAA-MM-JJ, JJ mois AAAA, année seule, ou libellé libre par Étape (ex. « Été 1944 »), qui remplace alors le défilement.
- Les dates avant notre ère s'affichent au format choisi (ex. « 52 av. J.-C. »).

#### FR-38 : Échelle et orientation [P2]
L'utilisateur peut afficher une échelle graphique (km/miles) et une rose des vents.

### 4.7 Timeline et animation

**Description :** L'animation est pilotée par des Étapes plutôt que par des images clés : l'utilisateur décrit l'état de la Carte à chaque Date d'Étape (§4.0), OPENMAP anime les transitions avec la Signature organique. Réalise UJ-1 à UJ-4.

#### FR-39 : Transitions de Territoire [P0]
L'utilisateur peut choisir, par Étape, la transition des Territoires : propagation, fondu ou balayage. Par défaut : propagation.
- La propagation part de la Ligne de front adjacente ; sans Ligne de front adjacente (débarquement, île, nouvelle Zone), elle part d'un point que l'utilisateur peut placer, ou à défaut du centre de la surface.

#### FR-40 : Gérer les Étapes [P0]
L'utilisateur peut ajouter, dupliquer, réordonner et supprimer des Étapes ; chaque Étape a une Date d'Étape, une durée de transition et une durée de maintien.
- Une nouvelle Étape part de l'état de l'Étape précédente (§4.0).
- Supprimer une Étape n'efface pas les valeurs héritées par les Étapes suivantes : elles reprennent la valeur de l'Étape précédente.

#### FR-41 : Lecture et scrubbing [P0]
L'utilisateur peut lire la Timeline, la mettre en pause, se placer à n'importe quel instant et régler la vitesse de lecture.
- Se placer à un instant affiche exactement l'image qui sera exportée à cet instant (NFR-1).

#### FR-42 : Signature organique [P0]
La Signature organique s'applique par défaut à toutes les animations, avec trois niveaux (désactivée, légère, marquée) réglables pour le Projet et surchargeables par Kit de Faction. `[HYPOTHÈSE sur les bornes ci-dessous, à calibrer en UX.]`
- **Dépassement** : au niveau « légère », les mouvements et apparitions dépassent leur position finale de 5 à 15 % de leur amplitude avant de s'y stabiliser ; aucune animation n'est linéaire.
- **Tremblé** : les bordures de Territoire dévient de leur tracé d'au plus 0,3 % de la largeur de l'image (≈ 6 px en 1080p).
- **Pulsation** : un Territoire qui change de Faction pulse pendant 250 à 400 ms avant de basculer.
- **Déterminisme** : un même Projet produit exactement la même animation à chaque lecture et à l'export.
- Au niveau « désactivée », aucun dépassement, tremblé ni pulsation.

#### FR-43 : Actes [P1]
L'utilisateur peut regrouper des Étapes en Actes nommés ; les Templates proposent par défaut « avant / pendant / après ».

#### FR-44 : Effets d'ambiance [P2]
L'utilisateur peut activer des Effets d'ambiance d'inspiration RTS :
- brouillard de guerre qui recouvre la Carte et se lève progressivement sur les zones révélées d'une Étape à l'autre ;
- barre de progression de conquête, affichant la part du territoire contrôlée par chaque Faction.

#### FR-45 : Persistance des éléments [P0]
L'utilisateur peut limiter un élément à une plage d'Étapes ; par défaut, il persiste jusqu'à la fin de la Timeline.

### 4.8 Caméra

**Description :** La caméra raconte autant que la Carte. OPENMAP reprend les presets éprouvés du marché et ajoute un cadrage automatique. Réalise UJ-2.

#### FR-46 : Presets caméra [P0]
L'utilisateur peut choisir un Preset caméra par Étape. Par défaut : cadrage automatique.
- **Vue du dessus (top-down)** — caméra fixe, cadre inchangé.
- **Fly-to** — déplacement et zoom continus du cadre précédent vers le nouveau cadre.
- **Orbit** — rotation lente de la Carte autour du centre du cadre.
- **Sweep** — balayage latéral le long de la Région.
- **Bounce** — dézoom puis zoom vers le nouveau cadre, comme un saut.
- **Cadrage automatique** — le cadre contient les éléments qui changent à cette Étape (Territoires, Flèches, Jetons), avec 10 % de marge ; si rien ne change, la caméra garde le cadre précédent.
- Le mouvement occupe la durée de transition de l'Étape.
- Flou de mouvement optionnel sur les transitions rapides : [P2].

#### FR-47 : Cadrage manuel [P0]
L'utilisateur peut fixer à la main la position, le zoom et la rotation de la caméra pour une Étape, en remplacement du Preset.

### 4.9 Import de visuels

**Description :** L'utilisateur garde la main sur son identité : ses images, ses portraits, ses propres cartes. Réalise UJ-4.

#### FR-48 : Importer des images [P0]
L'utilisateur peut importer des images (PNG, JPG, SVG), par sélection de fichier ou glisser-déposer, comme éléments positionnables, comme Emblème ou comme Icône d'événement.

#### FR-49 : Carte personnelle en fond [P1]
L'utilisateur peut importer une image de carte et la caler à la main (position, échelle, rotation, opacité), par-dessus ou à la place du Fond. Réalise UJ-4. `[HYPOTHÈSE : calage manuel uniquement en v1, pas de géoréférencement automatique.]`

### 4.10 Export

**Description :** Le livrable du créateur, destiné à son logiciel de montage. Réalise UJ-1 à UJ-4.

#### FR-50 : Export vidéo [P0]
L'utilisateur peut exporter la Timeline, ou une plage d'Étapes, en MP4 dans le Format de sortie du Projet, en 1080p à 30 ou 60 images/s. `[HYPOTHÈSE : 1080p maximum en v1, 4K plus tard ; pas de piste audio, le son étant ajouté au montage.]`
- L'export affiche sa progression et peut être annulé.
- Aucun filigrane. `[HYPOTHÈSE]`
- Le Format de sortie se change dans le Projet (16:9, 9:16, 1:1) : textes, Légende et Horodatage restent ancrés au même bord du cadre, et les cadrages de caméra sont recalculés pour contenir les mêmes éléments.

#### FR-51 : Export image [P1]
L'utilisateur peut exporter en PNG ou JPG l'état de la Carte à n'importe quel instant de la Timeline, avec l'option fond transparent en PNG. Réalise UJ-3.

### 4.11 Projets, organisation et mesure

**Description :** Pas de compte en v1 : tout vit dans le navigateur, et le Fichier projet sert de sauvegarde et de moyen de transfert. Réalise UJ-4.

#### FR-52 : Liste des Projets [P0]
L'utilisateur retrouve ses Projets à l'ouverture d'OPENMAP, et peut les renommer, dupliquer ou supprimer.

#### FR-53 : Sauvegarde automatique [P0]
Le Projet est sauvegardé localement en continu, sans action de l'utilisateur, dans le délai fixé par NFR-5. Réalise UJ-4.
- Après fermeture ou plantage de l'onglet, la réouverture restitue le Projet dans cet état.
- L'outil demande au navigateur un stockage persistant ; s'il est refusé, ou si l'espace disponible approche de sa limite, il le signale et invite à exporter un Fichier projet.

#### FR-54 : Fichier projet [P0]
L'utilisateur peut exporter un Projet en Fichier projet (Kits et médias importés inclus) et l'importer sur une autre machine.
- Un Fichier projet réimporté restitue un Projet identique, y compris son animation.

#### FR-55 : Annuler / rétablir [P0]
L'utilisateur peut annuler et rétablir ses actions sur plusieurs niveaux.

#### FR-56 : Calques [P1]
L'utilisateur peut masquer, verrouiller et réordonner les Calques.

#### FR-57 : Modes édition et présentation [P0]
L'utilisateur peut basculer entre Mode édition (caméra libre) et Mode présentation (caméra de la Timeline, rendu identique à l'export).

#### FR-58 : Télémétrie anonyme [P0]
Au premier lancement, l'utilisateur accepte ou refuse l'envoi de statistiques d'usage anonymes ; il peut changer d'avis à tout moment.
- Sans accord, aucune donnée d'usage n'est envoyée.
- Avec accord, seuls des événements d'usage sont envoyés (création de Projet, export, usage de fonctions) ; jamais le contenu d'un Projet ni les médias importés.

## 5. Données historiques et contenu

C'est le chantier le plus risqué du projet ; il mérite ses propres règles.

- **Licences** — Tant que la licence du code n'est pas tranchée (Q1), seules des données à licence permissive (domaine public, CC0, CC BY, MIT, Copernicus) entrent dans la Bibliothèque. Les données non commerciales (NC) sont exclues ; les données copyleft (GPL, ODbL, CC BY-SA) sont écartées jusqu'à décision. Pistes : Cliopatria (CC BY 4.0) pour l'historique, Natural Earth pour l'actuel, Copernicus Sentinel-2 pour le satellite — voir `addendum.md`.
- **Attribution** — Chaque élément de la Bibliothèque porte sa source et sa licence (FR-10).
- **Drapeaux et blasons** — Aucun Emblème n'entre dans la Bibliothèque sans licence vérifiée. Les trois sites repérés pendant le brainstorming ne sont pas vérifiés et ne sont pas utilisables en l'état.
- **Exactitude** — Les frontières historiques sont approximatives par nature ; l'outil n'affiche pas de fausse précision (date réelle des données, FR-6) et laisse l'utilisateur corriger (FR-11).
- **Neutralité** — Pour les territoires contestés, actualité comprise, la Bibliothèque suit sa source sans trancher ; l'utilisateur reste libre de représenter la situation comme il l'entend dans son Projet.
- **Production du contenu** — Les Templates et Kits officiels sont produits avec l'éditeur OPENMAP lui-même. Seuil minimal de lancement : 2 Templates par Ère et les Kits de leurs Factions. Objectif : environ 5 Templates et 10 Kits par Ère. `[HYPOTHÈSE sur ces volumes]` `[NOTE FOR PM : c'est probablement le plus gros poste de travail de la v1 pour un développeur seul ; à estimer avant de fixer une date de lancement.]`

## 6. Exigences non fonctionnelles transverses

- **NFR-1 Fidélité** — L'export reproduit exactement le Mode présentation : mêmes éléments, mêmes positions, mêmes durées, même Signature organique (FR-42, déterminisme).
- **NFR-2 Fluidité** — L'aperçu tourne à 30 images/s au moins sur la machine de référence pour un projet type (200 Territoires et 50 Jetons visibles). Machine de référence : processeur 4 cœurs, 16 Go de RAM, carte graphique intégrée de 2022 (classe Intel Iris Xe). `[HYPOTHÈSE sur la machine et le projet type]`
- **NFR-3 Temps d'export** — Une vidéo de 60 s en 1080p/30 s'exporte en 3 minutes au plus sur la machine de référence. `[HYPOTHÈSE]`
- **NFR-4 Navigateurs** — Chrome et Edge récents sur ordinateur sont pris en charge ; Firefox au mieux. Sur mobile ou tablette, un message explique que l'outil est conçu pour ordinateur. `[HYPOTHÈSE liée aux API d'encodage vidéo du navigateur]`
- **NFR-5 Persistance** — Toute modification est persistée localement en 5 secondes au plus. `[HYPOTHÈSE sur le délai]`
- **NFR-6 Confidentialité** — Aucun contenu de Projet ni média importé ne quitte la machine de l'utilisateur. Sont téléchargées : les tuiles de carte et les données de la Bibliothèque. Sont envoyées : les seules statistiques d'usage anonymes, si l'utilisateur les a acceptées (FR-58).
- **NFR-7 Temps jusqu'à la première animation** — Via l'assistant, la Carte décrite en FR-2 est obtenue en moins de 2 minutes. `[HYPOTHÈSE]` (Les trois cibles de temps s'emboîtent : 2 min pour une première animation, NFR-7 ; 15 min pour un premier export, SM-2 ; 20 min pour un Short fini, UJ-1.)
- **NFR-8 Écran** — Dès 1366×768, aucun panneau essentiel n'est masqué et aucun défilement horizontal n'est nécessaire. `[HYPOTHÈSE]`
- **NFR-9 Divulgation progressive** — Par défaut, chaque panneau n'affiche que les réglages essentiels ; les réglages avancés restent accessibles derrière une action « plus d'options ». Protège la tension vitesse/personnalisation (R1, SM-C1).

## 7. Esthétique et plateforme

- **Esthétique** — La Signature organique et le Fond parchemin donnent le ton par défaut. L'esprit RTS vit sur la Carte dès la v1 : Jetons d'unité, conquête visible, puis Effets d'ambiance (FR-44, P2). Rendus visés : cartes d'alliances lisibles façon manuel (UJ-3), cartes de campagne vintage (UJ-4), timelapses satellite d'actualité (UJ-1). L'interface elle-même reste sobre en v1 ; son habillage façon RTS vient après.
- **Plateforme** — Application web pour ordinateur uniquement (NFR-4). Pas d'application mobile ni de bureau.

## 8. Monétisation

Aucune en v1 : l'outil est gratuit et sans filigrane (`[HYPOTHÈSE]`), la priorité étant de prouver l'utilité et d'obtenir une adoption spontanée (§11). Le modèle économique sera défini après validation. Contrainte dès maintenant : ne rien construire (données, licences, fournisseurs) qui interdirait un usage commercial futur, et ne pas engager de coût récurrent sans plafond décidé. `[NOTE FOR PM : un produit gratuit qui sert des tuiles de carte a un coût d'hébergement qui croît avec l'usage — à chiffrer en architecture.]`

## 9. Non-objectifs

- OPENMAP n'est pas un outil de cartographie généraliste ni un SIG.
- Pas d'échelle tactique en v1 (terrain détaillé, formations, ordres de bataille façon Waterloo), ni de lien automatique « le Territoire suit les unités ».
- Pas de mode historique automatique en v1 : les frontières ne changent pas seules au fil de la Timeline ; c'est l'utilisateur qui les fait évoluer.
- Pas de course à la parité de réglages avec AnimateMyMap (animations de frontière multiples, réglages Bézier avancés).
- Pas d'éditeur vidéo : ni montage, ni voix off, ni musique.
- Pas de génération par IA (« tape ton sujet, obtiens ta carte ») en v1.
- Pas de collaboration, de comptes ni de partage en ligne en v1.
- Pas de 3D.

## 10. Périmètre et priorités

Trois niveaux, pour un développeur seul. La **tranche P0** est la version de validation à montrer aux créateurs avant d'aller plus loin (§12, R1).

### 10.1 P0 — tranche de validation
Couvre UJ-1 et UJ-2 de bout en bout dans une forme simple : assistant et Templates (4.1), Fonds stylisés et satellite, Date de référence, recherche, attribution (FR-5, 6, 8, 10), Kits de Faction avec Sous-factions et Bibliothèque (FR-12 à 15), Territoires, conquête au pinceau, peinture libre, Relations et Ligne de front, motifs (FR-18 à 23, 25), Flèches et Jetons (FR-28, 30), textes (FR-34), transitions, Étapes, lecture, Signature organique, persistance (FR-39 à 42, 45), Presets caméra et cadrage manuel (FR-46, 47), import d'images (FR-48), export vidéo (FR-50), gestion des Projets, sauvegarde, Fichier projet, annulation, modes, télémétrie (FR-52 à 55, 57, 58).

### 10.2 P1 — lancement public
Subdivisions (FR-7), couches et libellés (FR-9), correction des données (FR-11), Kits personnels (FR-16), remplissage par drapeau (FR-17), Poches (FR-24), Séries de Jetons (FR-31), Icônes d'événement (FR-32), Légende (FR-35), Compteurs (FR-36), Horodatage continu (FR-37), Actes (FR-43), carte personnelle en fond (FR-49), export image (FR-51), Calques (FR-56).

### 10.3 P2 — après le lancement
Zones d'annotation (FR-26), Traces de front (FR-27), Catégories de flèche (FR-29), Séries liées aux Compteurs (FR-31), mise en évidence (FR-33), texte courbe (FR-34), échelle et rose des vents (FR-38), Effets d'ambiance (FR-44), flou de mouvement (FR-46).

### 10.4 Hors v1
- Échelle tactique — v2 ; demande du terrain dessiné et des formations, sans données toutes prêtes.
- Mode historique automatique (frontières qui évoluent seules) — idée post-v1.
- Comptes et sauvegarde dans le cloud — v2 ; pas de backend en v1.
- Export 4K, export SVG et piste audio — v2.
- Habillage UI façon RTS — v2.
- Bibliothèque communautaire de Templates et Kits — v2 ; suppose des comptes.
- Couche ludique (rejouer une bataille) — vision long terme.
- Interface mobile — non prévue.

## 11. Indicateurs de succès

SM-1 se mesure par veille manuelle ; SM-2 à SM-7 par la télémétrie anonyme, sur les seuls utilisateurs qui l'ont acceptée (FR-58). « Utilisateur » désigne ici un navigateur. `[HYPOTHÈSE sur toutes les cibles chiffrées ci-dessous]`

**Principal**
- **SM-1 Adoption spontanée** — Nombre de créateurs distincts qui publient un contenu réalisé avec OPENMAP et le mentionnent sans sollicitation. Cible : 10 dans les 6 mois suivant le lancement public.

**Secondaires — usage**
- **SM-2 Temps jusqu'au premier export** — Médiane entre la première ouverture et le premier export : moins de 15 minutes. Valide FR-2, FR-50.
- **SM-3 Taux d'aboutissement** — Part des Projets créés qui aboutissent à au moins un export : 40 % ou plus. Valide FR-2, FR-50.
- **SM-4 Retour** — Part des utilisateurs qui exportent au moins deux fois, sur des jours différents, dans les 30 jours : 25 % ou plus.

**Secondaires — thèse de différenciation**
- **SM-5 Réutilisation des Kits** — Part des Projets exportés qui utilisent un Kit personnel déjà utilisé dans un autre Projet : 20 % ou plus. Valide FR-16.
- **SM-6 Personnalisation des Templates** — Part des exports issus d'un Template où l'utilisateur a modifié au moins un Kit ou ajouté au moins une Étape : 60 % ou plus. Valide R1 (les Templates servent de départ, pas de produit fini).
- **SM-7 Signature organique conservée** — Part des exports où la Signature organique est active : 70 % ou plus. Valide FR-42.
- **SM-8 Signal données** — Part des Projets qui utilisent la correction de données (FR-11) : à suivre sans cible ; révèle les lacunes des jeux de données.

**Contre-indicateurs (ne pas optimiser)**
- **SM-C1 Réglages exposés par défaut** — À contenir, pas à augmenter : la pression concurrentielle pousse à tout copier, au détriment de la simplicité (NFR-9).
- **SM-C2 Visites et Projets créés bruts** — Métrique de vanité ; seule l'adoption réelle compte. Contrebalance SM-1.
- **SM-C3 Durée moyenne des sessions** — Une session longue n'est pas un succès si la promesse est la rapidité. Contrebalance SM-2.

## 12. Risques et plan de validation

- **R1 — Tension vitesse / personnalisation.** Si les Templates sont trop bridés, les créateurs partent (« je pars si je ne peux rien personnaliser ») ; s'ils sont trop ouverts, la promesse de rapidité tombe. Mitigation : Templates entièrement éditables (FR-4), divulgation progressive (NFR-9), SM-6 et SM-C1.
- **R2 — Différenciation face au gratuit.** La conquête province par province existe déjà gratuitement (War Tool d'AnimateMyMap) et un clone open source existe (OpenAnimateMyMaps). Si les Kits, la Signature organique et les Templates ne suffisent pas à faire changer d'outil, le produit n'a pas de raison d'être.
- **R3 — Données historiques.** Couverture inégale selon les Ères, peu de subdivisions avant l'Ère contemporaine, licences à vérifier une par une (§5).
- **R4 — Satellite.** Copernicus est libre y compris en usage commercial, mais produire des tuiles sans nuages et les servir a un coût technique et d'hébergement (Q2).
- **R5 — Perte de données locales.** Le stockage du navigateur peut être purgé ; sans compte, tous les Projets disparaîtraient. Mitigation : FR-53, FR-54.
- **R6 — Charge de travail solo.** 58 FR et la production de contenu (§5) pour une seule personne. Mitigation : priorités P0/P1/P2.

**Plan de validation.** Une fois la tranche P0 prête, la faire utiliser à 3 à 5 créateurs de contenu géopolitique sur un vrai sujet de leur choix, en observant où ils bloquent et ce qu'ils personnalisent. Critère de poursuite : au moins 2 d'entre eux déclarent qu'ils l'utiliseraient pour une vraie vidéo plutôt que leur méthode actuelle. Sinon, revoir la différenciation (R2) avant d'engager P1. `[HYPOTHÈSE sur le seuil]`

## 13. Questions ouvertes

Chaque question indique l'étape qu'elle bloque.

1. **Licence du code** — OPENMAP sera-t-il open source ? Ouvre ou ferme l'accès aux données copyleft et à la réutilisation de code d'OpenAnimateMyMaps (MIT). *Bloque : architecture (choix des données).*
2. **Satellite via Copernicus** — Mosaïque Sentinel-2 sans nuages à produire soi-même via le Copernicus Data Space Ecosystem et ses API, ou service de tuiles existant ? Quel coût d'hébergement, quel plafond mensuel ? Repli : Fond sombre. *Bloque : architecture.*
3. **Outil de télémétrie** — Quel service, respectueux de la vie privée et sans compte, pour FR-58 ? *Bloque : architecture.*
4. **Langues** — Deux questions distinctes : la langue de l'interface (français, anglais, les deux au lancement ?) et la langue des libellés de Carte (les jeux de données sont surtout en anglais ; faut-il des libellés traduits ?). *Bloque : UX et pipeline de données.*
5. **Volume et production de contenu** — Combien de Templates, Kits et Emblèmes au lancement, et en combien de temps (§5) ? *Bloque : date de lancement.*
6. **Audio dans l'export** — Faut-il pouvoir ajouter une musique de fond pour les créateurs qui publient sans monter ? *Bloque : rien en v1 (v2 au plus tôt).*
7. **Monétisation future** — Gratuité totale, freemium, filigrane ? À décider après SM-1. *Bloque : rien en v1.*
8. **Provinces historiques** — Faut-il produire soi-même des subdivisions pour les Ères prioritaires, au-delà de la peinture libre ? *Bloque : P1 (FR-7).*
9. **Validation de la différenciation** — Le plan de validation (§12) confirmera-t-il R2 ? *Bloque : passage de P0 à P1.*

## 14. Index des hypothèses

- §2.1 — La douleur « temps + coût des outils » n'est pas validée.
- §4.0 — Modèle d'état des Étapes (héritage vers l'avant).
- §4.2 FR-7 — Subdivisions surtout disponibles pour l'Ère contemporaine en v1.
- §4.7 FR-42 — Bornes de la Signature organique (dépassement 5–15 %, tremblé ≤ 0,3 %, pulsation 250–400 ms).
- §4.9 FR-49 — Calage manuel de la carte personnelle, sans géoréférencement.
- §4.10 FR-50 — Export plafonné à 1080p ; pas de piste audio.
- §4.10 FR-50 — Pas de filigrane.
- §5 — Seuil de 2 Templates par Ère, objectif de 5 Templates et 10 Kits par Ère.
- §6 NFR-2 — Machine de référence et projet type.
- §6 NFR-3 — 3 minutes pour exporter 60 s en 1080p/30.
- §6 NFR-4 — Chrome et Edge requis, Firefox au mieux.
- §6 NFR-5 — Persistance en 5 secondes.
- §6 NFR-7 — Première animation en moins de 2 minutes.
- §6 NFR-8 — Utilisable dès 1366×768.
- §8 — Gratuit et sans filigrane en v1.
- §11 — Toutes les cibles chiffrées de SM-1 à SM-7.
- §12 — Seuil du plan de validation (2 créateurs sur 3 à 5).
