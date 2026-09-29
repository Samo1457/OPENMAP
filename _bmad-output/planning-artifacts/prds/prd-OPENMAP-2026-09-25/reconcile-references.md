# Réconciliation PRD ↔ références visuelles — OPENMAP

*Entrée : références visuelles fournies par l'utilisateur (4 images, 4 vidéos échantillonnées en images fixes). Cibles : `prd.md`, `addendum.md`. Date : 2026-09-29.*

Périmètre de l'analyse : échelles stratégique et opérationnelle. L'échelle tactique (terrain détaillé, formations) est repoussée volontairement et n'est pas signalée en soi ; on relève en revanche les éléments des références tactiques qui servent aussi à l'échelle opérationnelle.

Références examinées :
- **R1** Carte des alliances de la Guerre froide (image 1)
- **R2** Normandie 1944, carte de campagne d'époque (image 2)
- **R3** Plan du champ de bataille de Waterloo 1815 (image 3)
- **R4** Waterloo, image d'animation façon Baz Battles (image 4)
- **V1** Timelapse de la bataille de Kiev 2022 (16:9, satellite)
- **V2** Short sur le siège de Marioupol (9:16, satellite)
- **V3** Tutoriel « façon Baz Battles » (9:16, After Effects / DaVinci Resolve)
- **V4** Démonstration du War Tool d'AnimateMyMap (chaîne Map Studio Lab)

---

## 1. Écarts : éléments non couverts ou couverts de façon trop vague

Classés par importance décroissante.

### É-1. Jetons et drapeaux qui suivent la Ligne de front ou le contour d'une Poche — **majeur**
- **Références :** V1 : des rangées de mini-drapeaux russes et ukrainiens bordent chaque côté du front. Elles avancent et reculent avec lui, et **s'épaississent** (de 1 à 4 rangées environ) à mesure que les effectifs grossissent. V2 : des badges ronds à drapeau entourent la poche de Marioupol et se resserrent avec elle jusqu'à ne plus former qu'un petit anneau autour de « 721 ». D'autres badges sont répartis **à l'intérieur** d'une zone, pas seulement sur une ligne.
- **Couverture actuelle :** FR-26 aligne une série de Jetons « le long d'une Ligne de front ou d'un tracé ». C'est un placement ponctuel : rien ne dit que les Jetons suivent le front quand il bouge à l'Étape suivante, ni qu'ils se placent de part et d'autre, ni que leur nombre varie. Avec FR-25 tel qu'il est écrit, il faudrait replacer des dizaines de Jetons à la main à chaque Étape. C'est incompatible avec l'objectif de 20 minutes de UJ-1.
- **Correction proposée :** compléter FR-26 avec les conséquences suivantes :
  - « Une série alignée sur une Ligne de front ou le contour d'un Territoire y reste **attachée** : quand le front ou le contour change, les Jetons se redistribuent le long du nouveau tracé pendant la transition, sans intervention. »
  - « L'utilisateur choisit le côté (Faction A, Faction B ou les deux) et le nombre de rangées. »
  - « Le nombre de Jetons ou de rangées peut être lié à la valeur d'un Compteur (FR-31). »
  - Ajouter aussi un mode « répartir dans une zone » : N Jetons dispersés dans un Territoire ou une Zone, qui restent à l'intérieur quand elle se réduit.

### É-2. Horodatage qui défile en continu entre deux Étapes — **majeur**
- **Références :** V1 : la date avance jour par jour (2022-02-25 → 2022-04-02 en environ 70 s). V2 : environ 70 jours en 15 s, et la date change à chaque image.
- **Couverture actuelle :** FR-32 synchronise l'Horodatage « avec les Étapes ». Tel qu'il est écrit, la date saute d'une Étape à l'autre. Pour obtenir le rendu des références, il faudrait créer une Étape par jour, soit 40 à 70 Étapes.
- **Correction proposée :** ajouter une conséquence à FR-32 : « Pendant la transition entre deux Étapes datées D1 et D2, l'Horodatage peut défiler de façon continue, par jour, mois ou année selon le format, synchronisé avec l'avancement de la transition. » Préciser aussi que le format est libre (V2 utilise `AAAA/MM/JJ`, avec des barres obliques, que la liste de FR-32 ne prévoit pas).

### É-3. Interpolation de la forme des Zones dessinées et des Poches, et origine de la propagation — **majeur**
- **Références :** V2 : la zone russe grignote la ville et la poche se déforme en continu. V3 (« Moving the front ») : une tête de pont apparaît sur la côte, puis s'étend en suivant les unités.
- **Couverture actuelle :** FR-22 dit que la Poche « peut diminuer ». FR-37 définit la propagation « depuis la Ligne de front ». Rien ne décrit comment une Zone dessinée passe d'une forme à une autre entre deux Étapes, alors que UJ-1 repose justement sur une poche redessinée à chaque date. Rien ne dit non plus d'où part la propagation quand il n'y a pas de front préexistant (débarquement, zone qui surgit, territoire qui entre par le bord du cadre).
- **Correction proposée :**
  - Ajouter à FR-19 et FR-22 : « Entre deux Étapes, une Zone dessinée se transforme continûment de sa forme précédente à sa nouvelle forme (morphing), sans saut ni artefact, même si le nombre de points diffère. »
  - Ajouter à FR-37 : « Sans Ligne de front préexistante, la propagation part d'un point d'origine choisi par l'utilisateur (par défaut : le point le plus proche d'un Territoire de la même Faction, ou le trait de côte). »

### É-4. Flèches et zones stylées par phase ou par opération, pas seulement par Faction ; légende correspondante — **majeur pour UJ-4**
- **Références :** R2 : toutes les Flèches alliées ne sont pas de la même couleur. Le rouge marque le débarquement et la percée, le bleu la réduction de la poche Mortain-Falaise, le noir la retraite allemande, et la légende explique ce code couleur. Les zones alliées sont nuancées par phase : magenta foncé pour la tête de pont du 6 juin, rose pour les gains ultérieurs, les deux visibles en même temps. R3 : la légende « Signes conventionnels » liste les types de troupes et les positions successives.
- **Couverture actuelle :** FR-24 impose que la Flèche « hérite du style de sa Faction ». FR-30 construit la Légende à partir des Factions et des motifs. Il n'existe ni catégorie de Flèche, ni zone d'annotation hors Faction, ni entrée de légende pour les Flèches ou les Jetons.
- **Correction proposée :**
  - Ajouter à FR-24 : « L'utilisateur peut surcharger la couleur ou le style d'une Flèche, ou lui attribuer une **catégorie** nommée (ex. « Percée », « Réduction de la poche »). Une catégorie a son propre style. »
  - Nouvelle FR « Zones d'annotation » : une zone stylée librement (phase, objectif, zone d'opération) qui n'appartient à aucune Faction et n'entre pas dans le calcul des Lignes de front.
  - Ajouter à FR-30 : « Les catégories de Flèches, les types de Jetons et les Zones d'annotation utilisés apparaissent dans la Légende. »

### É-5. Traces datées des fronts et positions antérieurs, et dates posées sur la carte — **important pour UJ-4**
- **Références :** R2 : plusieurs lignes de front successives restent visibles en même temps, chacune avec son cartouche de date posé à l'endroit concerné (« 6 JUN », « 12 JUN », « 25 JUL », « 22 JUN » à Cherbourg, « 12 AUG » à Mortain). R3 : les positions successives des troupes sont distinguées dans la légende.
- **Couverture actuelle :** l'addendum rattache les « lignes de front datées » à FR-21. Or FR-21 ne montre que le front *courant*, recalculé à chaque Étape. UJ-4 (« Il trace les lignes de front datées (6 juin, 12 juin, 25 juillet) ») n'a donc pas de FR qui le réalise vraiment. FR-39 (persistance) ne s'applique pas à un front calculé.
- **Correction proposée :** nouvelle FR « Trace de front » : « L'utilisateur peut figer la Ligne de front d'une Étape en une trace qui persiste sur les Étapes suivantes, dans un style atténué réglable, avec une étiquette de date optionnelle placée sur la trace. » Ajouter à FR-29 un type « étiquette de date », c'est-à-dire un petit cartouche au style de l'Horodatage que l'on pose sur la carte.

### É-6. Orientation des Jetons, et territoire qui suit les Jetons — **important**
- **Références :** V3 : l'angle des Jetons bicolores est animé (l'image clé « Angle » est visible dans DaVinci), et la zone rouge s'étend autour des Jetons qui avancent. R4 : chaque unité porte une petite flèche d'orientation qui indique sa direction d'attaque.
- **Couverture actuelle :** FR-25 permet de déplacer un Jeton entre deux Étapes, pas de le faire pivoter. Le lien entre les Jetons et les Territoires est absent, alors que l'addendum le cite (« front qui suit les unités »).
- **Correction proposée :**
  - Ajouter à FR-25 : « Un Jeton a une orientation réglable, animée entre deux Étapes, et un indicateur de direction optionnel. »
  - Pour le lien Jetons → Territoire, deux options : soit une FR dédiée (« Un Territoire peut être étendu automatiquement autour des Jetons de sa Faction »), soit l'inscrire explicitement en non-objectif v1. Dans les deux cas, l'addendum ne doit plus le présenter comme une simple observation.

### É-7. Étiquette de Territoire automatique et remplissage par drapeau lors d'une conquête — **important**
- **Références :** V4 : de grands noms de pays (« Austria », « Hungary ») sont centrés dans chaque Territoire, dans la police du groupe. Le drapeau est étiré sur tout le Territoire. Pendant une conquête, les provinces prises passent au drapeau du conquérant et se raccordent à son remplissage. Les bordures ont un halo lumineux. R1 : un nom est centré dans chaque pays, avec des coupures de ligne (« Czecho-slovakia »).
- **Couverture actuelle :** FR-9 couvre les noms de lieux du fond, et FR-29 des textes placés à la main. Rien ne prévoit une étiquette attachée à un Territoire qui se recentre quand il change de forme. La police du Kit (FR-12) ne sert donc à aucun élément identifié. FR-17 ne dit pas comment le drapeau se projette sur un Territoire qui s'agrandit.
- **Correction proposée :**
  - Nouvelle FR « Étiquette de Territoire » : un nom affiché dans le Territoire, dans la police du Kit, qui se recentre et se redimensionne pendant les transitions. L'utilisateur peut la masquer, la renommer ou la déplacer.
  - Ajouter à FR-17 : « L'Emblème est projeté sur l'emprise de tout le Territoire. Quand celui-ci s'étend (FR-20), les Entités conquises prennent le remplissage du conquérant sans raccord visible. »
  - Ajouter à FR-12 un style de bordure « halo » parmi les styles de frontière.

### É-8. Compteur lié à une Faction et ancré à un Territoire — **moyen**
- **Références :** V2 : les chiffres ont un contour de la couleur de leur camp (bleu pour l'Ukraine, rouge pour la Russie), et le compteur de la poche suit celle-ci en se déplaçant avec son centre. V1 : un compteur par camp et par secteur.
- **Couverture actuelle :** FR-31 définit un Compteur « attaché à la carte », sans Faction ni ancrage.
- **Correction proposée :** ajouter à FR-31 : « Un Compteur peut être assigné à une Faction (style du Kit) et ancré à un Territoire ou à un tronçon de Ligne de front. Il suit alors son ancre pendant les transitions. »

### É-9. Réglages colorimétriques du Fond — **moyen**
- **Références :** V2 : le satellite est désaturé et teinté de bleu pour faire ressortir le rouge. V4 : le satellite est assombri autour des pays mis en avant.
- **Couverture actuelle :** FR-5 permet de choisir le Fond, pas de le régler. L'addendum note « satellite étalonné » sans aucune FR correspondante.
- **Correction proposée :** ajouter à FR-5 : « L'utilisateur peut régler la luminosité, la saturation et la teinte du Fond, et assombrir ce qui se trouve hors des Territoires des Factions mises en avant. »

### É-10. Animation propre des Icônes d'événement — **moyen**
- **Références :** V1 : les explosions gonflent puis se dissipent, des nuages de fumée restent plusieurs jours puis s'estompent, et des groupes d'avions traversent le cadre. V1 montre aussi des dizaines de petits symboles beiges semés dans la zone ukrainienne, vraisemblablement des tranchées ou des fortifications.
- **Couverture actuelle :** FR-27 place des icônes, et un avion peut suivre un tracé. Rien n'est dit de leur animation d'apparition et de disparition, ni de leur durée de vie sur plusieurs Étapes (FR-39 le permet seulement de façon générique). La Bibliothèque ne contient pas d'icône « fortification ».
- **Correction proposée :** ajouter à FR-27 : « Chaque Icône d'événement a une animation d'entrée et de sortie par défaut (explosion : éclat puis dissipation ; fumée : persistance puis fondu) et peut s'étendre sur une plage d'Étapes. » Ajouter « fortification / tranchée » à la liste des icônes, et permettre de semer une icône en nombre dans une zone (même mécanisme que É-1).

### É-11. Étiquettes encadrées de commandement — **moyen, pour UJ-4**
- **Références :** R2 : des cartouches hiérarchiques « Gal MONTGOMERY – 21 Ar. Gr. », « Gal BRADLEY – 1 Ar. », avec en dessous des cellules « 7 C. / 8 C. / 4 D. / 1-29 D. », ainsi que de grands drapeaux isolés. R4 : un portrait de commandant accompagné d'un écusson aux couleurs du camp et d'un bandeau portant son nom.
- **Couverture actuelle :** FR-25 prévoit une étiquette sur un Jeton, FR-29 des textes libres et FR-27 un portrait importé. Rien ne couvre l'étiquette encadrée aux couleurs d'une Faction, sur plusieurs lignes, éventuellement rattachée à un Jeton ou à un portrait.
- **Correction proposée :** ajouter à FR-29 : « Un texte peut avoir un cadre et un fond au style d'une Faction, sur plusieurs lignes, et être rattaché à un Jeton ou à une Icône qu'il suit. » L'organigramme hiérarchique complet peut rester hors v1, mais il faut le dire.

### É-12. Éléments d'habillage cartographique — **mineur**
- **Texte le long d'un tracé** (R2 : noms des plages et des fleuves, « GOLFE DE ST-MALO » en courbe) : ajouter à FR-29 « un texte peut suivre une courbe ».
- **Indication du Nord et cartouche de titre** (R3) : un élément « rose des vents / Nord » optionnel (FR-33).
- **Échelle** : FR-33 prévoit km et miles, ce qui suffit. Les unités anciennes (toises) de R3 relèvent de la trivia.
- **Flou de mouvement pendant les déplacements de caméra** (V4, fly-to) : ajouter à FR-40 une option « flou de mouvement », à régler dans la Signature organique.

---

## 2. Exactitude de la section « Analyse des références fournies » de l'addendum

- **Waterloo (R3 et R4 fusionnés) :** les « portraits de commandants, ellipses de mise en évidence, étapes numérotées » viennent de R4 (image Baz Battles), pas du plan d'époque R3. R3 montre autre chose, que l'addendum ne mentionne pas : un cartouche de titre, l'indication du Nord, une légende de signes conventionnels qui distingue les positions successives, et plusieurs échelles. Il faut séparer les deux références.
- **Normandie (R2) :** le renvoi « lignes de front datées → FR-21 » est trompeur, car FR-21 ne montre que le front courant (voir É-5). L'analyse omet les Flèches colorées par phase et leur légende (É-4), les zones nuancées par phase, les cartouches de date posés sur la carte, les étiquettes hiérarchiques de commandement (É-11) et les textes courbes.
- **Kiev (V1) :** le renvoi « horodatage qui avance → FR-32 » est incomplet, car FR-32 ne prévoit pas de défilement continu (É-2). Le renvoi « rangées de mini-drapeaux → FR-26 » est incomplet aussi : FR-26 est statique, alors que dans V1 les rangées suivent le front et s'épaississent avec les effectifs (É-1). Les parachutes ne sont pas repérés dans les images extraites ; à vérifier. Deux éléments sont omis : les symboles de fortification semés et le double liseré du front (rouge côté russe, bleu côté ukrainien).
- **Marioupol (V2) :** l'addendum renvoie à UJ-1 seulement, sans FR. Il omet les badges qui ceinturent la poche et se resserrent avec elle (É-1), les compteurs colorés par camp qui suivent la poche (É-8), le format de date `AAAA/MM/JJ` (É-2) et l'étalonnage du satellite, qu'aucune FR ne couvre (É-9).
- **Tutoriel Baz (V3) :** la description est juste (carte peinte, Jetons bicolores et rectangles de type OTAN, front qui suit les unités). En revanche, le « front qui suit les unités » n'a aucune FR (É-6), et l'animation de l'angle des Jetons n'est pas relevée.
- **Map Studio Lab (V4) :** « voir ci-dessous » renvoie à une liste de fonctions concurrentes, pas à une analyse visuelle. Ne sont pas relevés : le drapeau étiré sur le Territoire et prolongé sur les provinces conquises, les grands noms de pays, le halo des bordures, le fond assombri et le flou de mouvement de la caméra (É-7, É-9, É-12).
- **Guerre froide (R1) :** l'analyse est globalement juste. Deux nuances : la légende n'est pas « datée » (ce sont ses entrées qui portent des dates), et les « deux teintes par bloc » relèvent des Sous-factions (FR-14), pas seulement de FR-23 et FR-30. Il manque ce renvoi, ainsi que dans UJ-3.
- **« Satellite dans trois vidéos sur quatre »** (Alternatives écartées) : c'est exact (V1, V2 et V4).
- **« Toutes les vidéos ont une piste audio »** : invérifiable à partir des images extraites. Ce n'est pas faux, mais ce n'est pas étayé par les images.

---

## 3. Ce qui est couvert

- **Fonds :** satellite (V1, V2, V4), parchemin et vintage (R2, R3), carte peinte (V3) → FR-5. Scan d'époque calé à la main → FR-43.
- **Frontières datées et libellés :** Europe de 1968 (RDA/RFA, Yougoslavie, URSS) → FR-6. Villes, fleuves et renommage des libellés → FR-9.
- **Remplissages :** pays par bloc, neutres distincts, hachures de retrait (R1) → FR-23. Deux teintes par bloc → FR-14 (Sous-factions). Légende avec lignes ajoutées → FR-30. Remplissage par drapeau avec opacité (V4) → FR-17.
- **Conquête :** sélection multiple avec Ctrl, conquête province par province au pinceau avec confirmation et nombre de provinces (V4) → FR-18, FR-20. Front recalculé automatiquement → FR-21. Poche (R2 Mortain-Falaise, V2) → FR-22, sous réserve de É-3.
- **Mouvement :** grosses Flèches de percée qui se dessinent (R2, R4) → FR-24. Jetons (badges ronds à drapeau V2, carrés bicolores V3, symboles de type OTAN R4, mini-drapeaux V1) avec étiquette (« 7 C. ») et glissement entre Étapes → FR-25.
- **Événements :** avions sur tracé, explosions, fumée, parachutes (R2), portraits de commandants (R4) → FR-27. Ellipses de mise en évidence et marqueur « 1 » (R4) → FR-28.
- **Lecture à l'écran :** titre (V4) → FR-29. Compteurs animés orientés le long du front (V1, V2) → FR-31. Horodatage par Étape → FR-32. Échelle graphique (R2) → FR-33.
- **Animation et caméra :** maintien, transition et persistance par Étape, comme les cartes d'étapes de V4 → FR-34, FR-39. Transition par fondu → FR-37. Caméra fixe (V1), zoom et fly-to (V4) → FR-40, FR-41.
- **Export :** 16:9 (V1) et 9:16 (V2, V3, V4) → FR-44.
