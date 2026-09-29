# Réconciliation PRD ↔ Brief — OPENMAP

- **Date** : 2026-09-29
- **Cible** : `prds/prd-OPENMAP-2026-09-25/prd.md` et `addendum.md`
- **Sources** : `briefs/brief-OPENMAP-2026-09-24/brief.md`, `briefs/brief-OPENMAP-2026-09-24/addendum.md`, `brainstorming/brainstorm-carte-historique-en-ligne-2026-09-21/brainstorm-intent.md`
- **Écarts volontaires exclus** (décisions postérieures au brief, non signalés) : échelle tactique repoussée après la v1, sauvegarde locale sans compte, fonds stylisé + satellite, licence du code non tranchée (données permissives uniquement), reprise des presets caméra d'AnimateMyMap.

---

## A. Écarts, par ordre d'importance

### G1. Le risque central « vitesse ET profondeur de personnalisation » n'est porté qu'à moitié, et la PRD le déséquilibre

**Sources**
- Brief, Résumé exécutif (l. 14) : « Le vrai risque […] est double : la profondeur de personnalisation des templates doit tenir la promesse de rapidité sans frustrer l'utilisateur (persona repère Terrabellum : reste si les templates sont vite utilisables, part si trop bridés), et la constitution d'une bibliothèque de données historiques […] ».
- Brief, Qui ça sert (l. 36) : « Terrabellum — reste si les templates sont rapides à utiliser, part si la personnalisation est trop bridée ».
- Brainstorm, Risque clé (l. 54) : « Tension centrale non-négociable des deux côtés […] À valider avec de vrais utilisateurs avant/pendant le build, en priorité sur la profondeur de personnalisation des templates. »

**Constat dans la PRD**
- Il n'y a pas de section Risques. Seul le risque « données » est repris (§1, §5 : « le chantier le plus risqué »). Le risque « personnalisation vs rapidité », que le brief place au même rang, n'apparaît nulle part.
- Terrabellum est devenu un simple personnage de parcours (UJ-1, UJ-2). Son critère de départ (« part si trop bridé ») a disparu.
- Les indicateurs ne tirent que dans un sens. SM-C1 (« nombre de réglages exposés par défaut, à contenir ») et SM-C3 protègent la simplicité, mais aucun indicateur ni garde-fou ne protège la profondeur de personnalisation. Or le brief dit explicitement que l'utilisateur part si elle manque.
- La Question ouverte 9 prévoit bien un test auprès des créateurs, mais sur la différenciation face au War Tool, pas sur la profondeur de personnalisation des templates.

**Correctifs proposés**
1. Ajouter une section **« Risques et hypothèses à valider »** (entre §11 et §12) avec R1 « profondeur de personnalisation vs rapidité » (cas test Terrabellum : reste/part) et R2 « données » (reprise de §5). Pour chacun, indiquer comment et quand le valider : tests avec 3 à 5 créateurs sur un Template avant le code de 4.3–4.7.
2. Ajouter un principe produit ou une NFR **« NFR-9 Divulgation progressive »** : réglages minimaux par défaut, mais tout paramètre d'un élément issu d'un Template reste accessible en profondeur (panneau avancé). C'est cette NFR qui réconcilie SM-C1 avec le risque R1.
3. Ajouter un contre-indicateur ou un signal d'alerte symétrique à SM-C1, par exemple **SM-C4 « abandons après personnalisation »** : part des Projets créés depuis un Template abandonnés après plus de N modifications sans export, ou demandes « impossible de faire X ».
4. Dans §2.3, écrire explicitement la condition reste/part de Terrabellum, par exemple en ajoutant un cas limite à UJ-1 ou UJ-2 : « il veut modifier X que le Template ne prévoit pas ».

### G2. Le ton « inspiré des RTS » a disparu de la carte : brouillard de guerre et barres de conquête retirés sans le dire

**Sources**
- Brainstorm, Concept (l. 4) : « aussi simple que Canva, avec une esthétique organique inspirée des jeux RTS ».
- Brainstorm, Angle mort concurrentiel (l. 21) : les concurrents sont « sans style organique/ludique assumé ».
- Brief, Vision (l. 71) : « dans l'esprit RTS qui inspire déjà le style visuel ».
- Addendum du brief, Système d'animation §4 (l. 26) : « Effets d'ambiance RTS : brouillard de guerre qui se lève progressivement, barres de progression de territoire façon score de conquête ».
- Addendum du brief, Boîte à outils (l. 44) : « Effets d'ambiance (on/off + réglages) ».
- Brainstorm (l. 37 et 41) : ces effets figurent dans les « Specs déjà arrêtées ».

**Constat dans la PRD**
- Aucune FR ne couvre le brouillard de guerre, les barres de progression de territoire ou l'outil « Effets d'ambiance ». Ils ne figurent pas non plus dans le Hors périmètre (§10.2) ni dans les Alternatives écartées de l'addendum. C'est une suppression silencieuse.
- La PRD réduit l'inspiration RTS à « l'habillage façon RTS » de l'interface, repoussé après la v1 (§7, §10.2). Or le brief ne reportait que l'**habillage UI** (l. 64), pas le style de la carte.
- §7 fixe comme rendus visés les références « manuel », « vintage » et « satellite ». Le registre « ludique / carte-parchemin vivante / couleurs de civilisation » du brainstorm n'y figure plus. Le ton passe de « ludique assumé » à « réaliste/documentaire » sans que ce soit décidé explicitement.

**Correctifs proposés**
1. Trancher explicitement. Deux options :
   - soit ajouter en 4.7 une **FR-52 « Effets d'ambiance »** : brouillard de guerre qui se lève selon les Étapes, et barre de progression de conquête par Faction, chacun activable ou désactivable et réglable ;
   - soit les inscrire en §10.2 avec une justification, et dans les Alternatives écartées de l'addendum.
2. Réécrire le point « Esthétique » de §7 pour distinguer (a) le ton de la **carte** : organique, ludique, inspiré des RTS (couleurs de civilisation, parchemin vivant), qui est l'identité par défaut ; (b) le ton de l'**interface**, sobre en v1. Les références réalistes (manuel, satellite) deviennent alors des variantes, pas la cible unique.

### G3. La Signature organique, principal différenciateur, n'est ni testable ni rattachée au Kit

**Sources**
- Addendum du brief, Kit de Faction §5–6 (l. 13–14) : « Style de territoire : épaisseur de contour, intensité de la texture organique (tremblé), easing/overshoot par défaut » ; « Style de mouvement : […] vitesse d'animation par défaut ».
- Addendum du brief, Système d'animation §2 (l. 24) : « Animations d'éléments par défaut (liées au Kit de Faction) : territoire pulse avant de basculer de couleur, flèche […] se dessine en live, icônes d'unité en léger overshoot, **légendes en kinetic typography calées sur le rythme narratif** ».
- Addendum du brief §5 (l. 27) : « easing avec overshoot par défaut (**jamais linéaire**), bordures légèrement tremblées, pulsations façon battement de cœur plutôt que pop/disparition sèche ».
- Brainstorm (l. 31) : « C'est la réponse concrète à la tension vitesse-vs-personnalisation ».

**Constat dans la PRD**
- FR-38 est la seule FR sans aucun critère d'acceptation. Il est impossible de vérifier qu'une animation est « organique ». La définition n'existe que dans le Glossaire.
- FR-12 (champs du Kit) ne reprend ni l'intensité du tremblé, ni l'easing/overshoot, ni la vitesse d'animation par défaut. De plus, FR-38 rend l'intensité **globale** (« réglable, jusqu'à désactivation »), alors que le brief la rattache **au Kit**. Cela contredit le modèle du brief, où chaque Faction porte son propre style de mouvement.
- La kinetic typography des légendes et textes est absente (FR-29, FR-30 et FR-32 ne prévoient aucune animation de texte).
- Le « jamais linéaire » et les pulsations « battement de cœur plutôt que pop sec » ne sont pas exigés. FR-37 (propagation, fondu, balayage) ne dit pas si la pulsation précède la bascule.

**Correctifs proposés**
1. Ajouter des critères d'acceptation à FR-38 :
   - aucune transition par défaut n'utilise un easing linéaire ;
   - les bordures de Territoire présentent un tremblé visible à l'intensité par défaut ;
   - un Territoire qui change de Faction pulse avant la bascule ;
   - l'apparition et la disparition d'un élément se font par pulsation ou overshoot, jamais par pop sec ;
   - à l'intensité 0, les animations sont nettes et linéaires.
2. Amender FR-12 pour ajouter au Kit l'intensité du tremblé, l'easing/overshoot par défaut et la vitesse d'animation par défaut. Préciser ensuite dans FR-38 que le réglage global **module** les valeurs des Kits sans les remplacer.
3. Ajouter à FR-29, FR-30 et FR-32 un critère « les textes, la Légende et l'Horodatage apparaissent et changent avec une animation typographique par défaut, calée sur les transitions d'Étape ». Autre option : une FR dédiée, « FR-53 Kinetic typography ».
4. §0 dit que la PRD « ne duplique pas » l'addendum du brief. Préciser que les champs de la section « Spec : Kit de Faction » de l'addendum sont **normatifs**, ou reprendre la liste complète dans FR-12. Aujourd'hui les deux listes divergent et on ne sait pas laquelle fait foi.

### G4. La priorisation MoSCoW et le contexte « solo, exploration, sans deadline » sont perdus, alors que le périmètre a beaucoup grossi

**Sources**
- Brief, Résumé exécutif (l. 14) : « Le projet est en phase d'exploration solo, sans deadline ni modèle de monétisation arrêté : la priorité est de prouver l'utilité avant de chercher à monétiser. »
- Brainstorm, Scope v1 MoSCoW (l. 43–51) : Must (Canva-like, Kit + héritage, bibliothèque de kits, import, export, timeline + micro-animations) ; **Should** (signature organique complète, zoom motivé automatique, actualité) ; Could ; Won't.
- Brief, Hors périmètre (l. 60) : « le pari reste la simplicité, pas l'exhaustivité ».

**Constat dans la PRD**
- La contrainte « solo » n'apparaît pas dans la PRD elle-même (seulement dans l'addendum, Alternatives écartées : « à maintenir seul »). Le fait que l'exploration n'a pas de deadline n'est mentionné nulle part.
- §10.1 est une liste plate de 11 blocs et 51 FR, sans priorité. Les « Should » du brainstorm, comme le cadrage automatique (qui devient même le réglage par défaut en FR-40), sont implicitement devenus des « Must ».
- Le périmètre v1 dépasse nettement celui du brief : Compteurs, Poches, Lignes de front automatiques, conquête au pinceau, placement en série, Icônes d'événement, mise en évidence, échelle graphique, Horodatage multi-format, remplissage par drapeau, motifs. Chaque ajout est justifié par les références, mais cette croissance n'est confrontée ni à la contrainte « solo » ni au pari « simplicité plutôt qu'exhaustivité ». Ce n'est pas une contradiction formelle, mais c'est une dérive par rapport à la priorité du brief.

**Correctifs proposés**
1. Ajouter dans §0 ou dans une section « Contraintes » : « Projet solo, en exploration, sans deadline ; objectif v1 = prouver l'utilité (SM-1). »
2. Classer chaque bloc de §10.1 (ou chaque FR) en Must / Should / Could. Proposition :
   - Must : 4.1, 4.3, FR-5/6, FR-18/19, FR-24, FR-29/30, 4.7, FR-40 presets, 4.9, 4.10, 4.11 ;
   - Should : FR-20–22, FR-31/32, cadrage automatique ;
   - Could : FR-26–28, FR-33.
   Ce classement donne un chemin de découpe si la validation (G1) l'exige.
3. Ajouter à la Question ouverte 9 ou au risque R1 que chaque ajout issu des références est à vérifier contre SM-C1.

### G5. Les hypothèses sur le problème sont devenues des faits

**Sources**
- Brief, Le Problème (l. 20) : « **Hypothèse de travail (non encore validée par une recherche utilisateur formelle)** : la douleur centrale est double — le temps […] et le coût […] ».
- Brief (l. 22) : « un petit groupe informel de créateurs […] a réagi favorablement au concept sans toutefois confirmer précisément cette douleur dans leurs propres mots. À valider avant ou pendant le build. »

**Constat dans la PRD**
- §2.1 (JTBD) présente la douleur comme acquise. La PRD ajoute même des JTBD qui ne sont pas dans le brief : « Contextuel » (Shorts, actualité à chaud), « Social » (identité visuelle cohérente), ainsi que les références Kings and Generals et Baz Battles. Aucun n'est marqué `[HYPOTHÈSE]`, alors que la PRD utilise ce marqueur partout ailleurs.
- L'index des hypothèses (§13) ne contient aucune hypothèse sur le problème ou l'utilisateur, seulement des hypothèses techniques et de cibles.

**Correctifs proposés**
1. Marquer §2.1 `[HYPOTHÈSE : douleur temps + coût non validée par recherche utilisateur ; retour informel favorable d'un petit groupe]` et l'ajouter à §13.
2. Ajouter une question ouverte ou une entrée du risque R1 (voir G1) : « Valider la douleur dans les mots des créateurs (entretiens) avant ou pendant le build. »

### G6. Éléments de la boîte à outils et des templates supprimés en silence (écarts mineurs)

| Source | Élément | Constat PRD | Correctif proposé |
|---|---|---|---|
| Addendum brief l. 46 : « Export (image PNG/JPG/**SVG**, vidéo MP4 **multi-résolution** […]) » | Export SVG ; plusieurs résolutions | FR-45 : PNG/JPG seulement ; FR-44 : 1080p seulement | Ajouter le SVG à FR-45 ou le reporter explicitement en §10.2 et §13. Préciser dans FR-44 si 720p est proposé (multi-résolution ≤ 1080p). |
| Addendum brief l. 40, brainstorm l. 33 : « Import (**glisser-déposer** image/SVG/carte perso) » ; « drag-and-drop » comme pilier de Canva | Glisser-déposer | Aucune FR ne le mentionne, alors que c'est le premier pilier de « l'expérience Canva » (brief l. 52) | Ajouter à FR-42 et FR-43 le critère « import par glisser-déposer sur le canvas ». Ajouter le glisser-déposer au principe NFR-9 proposé en G1. |
| Addendum brief l. 11 : « Emblème […] + **variante mini** pour petites icônes » ; l. 10 : « état **survol**/sélection » ; l. 9 : « nom **auto-affiché** » | Champs du Kit | FR-12 : pas de variante mini, pas d'état survol, pas d'affichage automatique du nom | Voir G3, correctif 2 et 4 (FR-12 complet ou addendum normatif). |
| Addendum brief l. 34 : « Éléments pré-placés : territoires vierges […], **flèches de mouvement suggérées, labels placeholder** » ; l. 33 : trame 3 actes « **façon mad-lib** » ; « dates clés […] déjà positionnées » | Contenu d'un Template | Le Glossaire (Template) cite les Factions suggérées et les Étapes pré-remplies, mais pas les flèches suggérées, les labels placeholder ni le remplissage guidé façon mad-lib | Ajouter à FR-2 et FR-4 un critère : « un Template fournit des Territoires assignables, des Flèches suggérées et des libellés à remplir ». |
| Addendum brief l. 28 : « granularité temporelle (jour/mois/année) réglée **manuellement** […] pas de détection automatique » ; l. 33 : « granularité suggérée mais éditable » | Granularité | Les Étapes ont une date, et FR-32 gère le format de l'Horodatage, mais aucune granularité de Projet et aucune règle « pas d'auto-détection » | Ajouter à FR-34 : « l'utilisateur règle la granularité (jour/mois/année) ; le Template en suggère une ; aucune détection automatique ». |
| Addendum brief l. 23 : « beats/keyframes personnalisés sur dates **ou événements** » | Étape sur un événement sans date | FR-34 impose une date à chaque Étape | Autoriser une Étape libellée par un événement (date facultative ou approximative). FR-32 accepte déjà un « libellé libre ». |
| Brief l. 30, addendum l. 25 : preset « **top-down** » | Nom du preset | FR-40 dit « fixe » | Aligner le vocabulaire (« top-down (fixe) ») pour garder la traçabilité avec AnimateMyMap. |
| Brief, Vision l. 71 : « usage éducatif assumé […] support pédagogique reconnu en établissement » | Extension éducative | §10.2 ne reprend que la couche ludique. L'extension éducative n'apparaît pas, même si l'on trouve des enseignants en secondaire et UJ-3 | Ajouter une ligne « Usage éducatif institutionnel — vision long terme » en §10.2, ou un paragraphe Vision long terme en §1. |

---

## B. Contradictions avec le brief (hors écarts volontaires)

- **Signature organique globale ou par Kit** (voir G3) : FR-38 rend l'intensité globale, alors que l'addendum du brief la définit comme un champ du Kit (style de territoire et de mouvement). C'est une contradiction de modèle à trancher.
- **Inspiration RTS** (voir G2) : le brief situe l'esprit RTS dans le **style visuel** (Vision) et ne repousse que « l'habillage UI ». La PRD réduit cette inspiration à l'UI et la repousse en v2.
- Aucune autre contradiction relevée. L'ajout de FR-37 (3 transitions de Territoire) reste compatible avec le rejet des « 9 animations de frontière » : c'est un choix simplifié.

---

## C. Éléments vérifiés et couverts

- Éditeur web « aussi simple que Canva », parcours guidé Template → époque ou date → zone → Factions, carte présentable dès la fin de l'assistant : §1, FR-1, FR-2, NFR-7.
- Marché en « haltère », pas d'installation, métrique « temps jusqu'à la première carte » : §1, NFR-7, SM-2.
- Concurrence (AnimateMyMap, Animaps, Mapimator) et « pas d'océan bleu » : §1, addendum PRD (enrichi : War Tool, OpenAnimateMyMaps, GEOlayers).
- Honnêteté sur la défensibilité (le Kit et le style sont réplicables, la donnée est le vrai actif) : §1 dernier paragraphe, §5, Question ouverte 9, addendum « Conséquence ».
- Kit de Faction réutilisable, application en un clic, source unique de vérité : FR-12, FR-13, FR-15, FR-16. Héritage de sous-factions avec champs surchargés ou hérités : FR-14.
- Kits officiels et personnels, recherche par nom, ère ou région : FR-15, FR-16.
- Bibliothèque priorisée par ère sans exhaustivité : FR-3, §5 (Volume au lancement).
- Catégorisation des Templates par ère, type de contenu et tags : FR-3. Rien n'est verrouillé : FR-4, FR-43.
- Fonds parchemin (par défaut), sombre, clair, satellite ; tracé d'époque ou fond moderne : FR-5, FR-6.
- Timeline scrubbable, vitesse de lecture, trame en 3 actes modifiable : FR-35, FR-36.
- Flèche qui se dessine en direct : FR-24. Pulsation avant bascule : Glossaire (Signature organique).
- Zoom motivé automatique avec reprise manuelle : FR-40 (cadrage automatique par défaut), FR-41. Presets repris d'AnimateMyMap : FR-40.
- Export image à un instant et vidéo sur une plage d'Étapes : FR-44, FR-45. Annuler/rétablir : FR-48. Calques : FR-50. Canvas libre ou mode présentation : FR-51.
- Outils Territoire (main levée ou point par point), Flèche courbe, Texte, Jetons, Import d'images et de carte personnelle : FR-19, FR-24, FR-25, FR-29, FR-42, FR-43.
- Géopolitique d'actualité (pas seulement l'Histoire) : UJ-1, FR-3 (type « géopolitique actuelle »), §5 Neutralité.
- Revue de licence des 3 sites de drapeaux avant usage : §5 (Drapeaux et blasons), addendum PRD.
- Signal principal = adoption spontanée non sollicitée : SM-1, SM-C2.
- Monétisation non définie, priorité à la preuve d'utilité : §8, Question ouverte 7.
- Hors périmètre : contrôle granulaire façon AnimateMyMap (§9, SM-C1) ; habillage UI RTS, 4K et bibliothèque communautaire repoussés (§10.2) ; couche ludique (rejouer une bataille) en vision long terme (§10.2).
- Rester centré sur l'historique et le géopolitique, sans dérive vers la cartographie généraliste : §9.
- Publics : primaire (créateurs) et secondaires (enseignants, passionnés de wargame) : §2.1, UJ-3, UJ-4.
