# Intention produit — OPENMAP

## Concept en une ligne
Un outil web pour créer des cartes historiques/géopolitiques animées (batailles, conquêtes, évolutions de frontières), aussi simple que Canva, avec une esthétique organique inspirée des jeux RTS.

## Utilisateur cible / Job-to-be-Done
Créateurs de contenu historique/géopolitique (YouTubeurs, vulgarisateurs, monteurs, infographistes) — persona repère: **Terrabellum**, YouTubeur géopolitique.

Job déclaré: obtenir une belle carte (animée ou non), personnalisée, informative, faite vite et simplement.
Job réel (insight clé): **avoir l'air pro sans compétences en design/motion**, sans le temps ni le budget d'une suite Adobe (Photoshop/After Effects/Illustrator) ni d'un prestataire. Douleur principale = temps passé + coût des outils pro.

Positionnement marché: le marché est en "haltère" — suite pro exhaustive d'un côté, bricolage amateur/prestataire de l'autre. OPENMAP vise le milieu: résultat pro, vitesse amateur, web-based (pas d'install), pricing accessible. Métrique de valeur: temps jusqu'à la première carte.

Scope contenu élargi: pas seulement l'Histoire — aussi la géopolitique d'actualité (conflits en cours, frontières mouvantes, alliances).

## Contexte concurrentiel
**AnimateMyMap.com** ("Cinematic Map Video Studio") est le concurrent direct (avec Animaps, Easymotion, Mapimator, AnimateMyTravel en périphérie) — marché déjà validé et peuplé, pas un océan bleu.

Ce qu'AnimateMyMap fait: 5 modes caméra (top-down/bounce/fly/orbit/sweep) avec easing auto, 9 animations de frontière + 6 reveals, drapeaux + modèles 3D, flèches bézier, 195 pays + territoires + formes custom (pen tool), export MP4 jusqu'à 4K, 3 tiers Free/Basic/Pro.

Angle mort concurrentiel: positionnement "cinématique/pro" générique, sans Kit de branding par camp, sans style organique/ludique assumé, sans ancrage Canva explicite (simplicité + templates + drag-drop).

**Différenciation choisie**: ne pas rivaliser sur le contrôle technique exhaustif — miser sur la simplicité façon Canva + le Kit de Faction + une signature d'animation organique perçue comme personnalisation, même sur un template brut.

## Différenciateurs clés

**Kit de Faction** (équivalent Brand Kit de Canva, mais multi-kits simultanés sur une même carte, façon couleurs de civilisation dans un RTS). Contenu: couleur territoire/contour/survol, emblème (upload ou bibliothèque) + variante mini, police, style de frontière organique (épaisseur, tremblé, easing/overshoot), style de flèche de mouvement (épaisseur, tête, vitesse), icônes d'unité optionnelles, nom auto-affiché, ère associée. 1 clic applique tout partout (single source of truth, design token).

**Mécanique d'héritage sous-factions**: un kit parent (ex. Alliés) définit le style de base (frontière/police/texture); les kits enfants (France, UK, USA) héritent ce style mais peuvent overrider couleur/emblème. Si le parent change, les enfants suivent sauf ce qu'ils ont explicitement personnalisé.

**Signature d'animation organique**: bordures de territoire légèrement tremblées (carte-parchemin vivante), easing avec overshoot au lieu de linéaire, pulsations façon battement de cœur plutôt que pop/disparition sèche. C'est la réponse concrète à la tension vitesse-vs-personnalisation.

**Simplicité façon Canva**: drag-and-drop, templates prêts à l'emploi, structure guidée façon mad-lib.

## Specs déjà arrêtées

**Système d'animation**: timeline maître scrubbable, trame narrative en 3 actes par défaut (avant/pendant/après) modifiable + keyframes custom sur dates/événements. Animations par défaut liées au Kit de Faction (territoire pulse avant bascule couleur, flèche qui se dessine en live, icônes en overshoot, légendes en kinetic typography). Caméra: zoom motivé automatique (pan/zoom vers ce qui compte) avec override manuel. Effets d'ambiance RTS: brouillard de guerre progressif, barres de progression de territoire. Contrôle utilisateur: vitesse de lecture réglable, export image figée à un point de la timeline ou vidéo sur une plage, granularité temporelle (jour/mois/année) réglée manuellement par l'utilisateur (pas de détection auto).

**Templates de fond de carte**: tracé historique d'époque ou fond moderne neutre, thème visuel (parchemin/sombre/clair/satellite), échelle/zoom de départ prédéfinis. Structure temporelle pré-remplie (dates clés, trame 3 actes, granularité suggérée éditable). Éléments pré-placés modifiables (territoires vierges assignables à un Kit de Faction, flèches suggérées, labels placeholder). Catégorisation par ère + type de contenu (bataille ponctuelle/campagne/expansion/géopolitique actuelle) + tags. Rien n'est verrouillé: ajout/suppression de territoires, changement de fond, import de carte externe perso possible à tout moment.

**Boîte à outils éditeur**: outils de contenu (Territoire à main levée ou point par point + assignation Kit en 1 clic, Flèche courbe ajustable, Texte/Légende, Icône/Pion d'unité, Import image/SVG/carte perso en drag-drop); outils de style (sélecteur Kit de Faction, sélecteur fond/template); outils temporels (Timeline avec keyframes/dates/actes, Caméra avec points de zoom motivé ou override, Effets d'ambiance on/off+réglages); outils de production (Export PNG/JPG/SVG + MP4 multi-résolution avec plage timeline sélectionnable, Undo/Redo); organisation (canvas libre zoom/pan en édition vs mode présentation piloté caméra auto, calques).

## Scope v1 — MoSCoW

**Must**: expérience Canva-like (drag-drop + templates + simplicité); Kit de Faction avec héritage de sous-factions; bibliothèque de kits de factions historiques pré-faits (périmètre priorisé par ère: Antiquité, Moyen Âge, Temps modernes, Ère contemporaine — pas d'exhaustivité day-1); import de visuels propres; export image + vidéo; timeline scrubbable avec micro-animations organiques par défaut.

**Should**: signature organique complète (bordures tremblées + overshoot); zoom motivé caméra automatique; scope géopolitique actualité (pas que du passé).

**Could**: habillage UI façon RTS/ludique; export 4K/multi-formats exhaustif; bibliothèque communautaire de templates.

**Won't (v1)**: rivaliser sur le contrôle technique fin à la AnimateMyMap (9 animations de frontière, flèches bézier avancées, etc.) — stratégie = simplicité plutôt qu'exhaustivité.

## Risque clé à valider
Tension centrale non-négociable des deux côtés: **vitesse (templates prêts à l'emploi) ET profondeur de personnalisation** doivent coexister — un template qui ne se personnalise pas assez fait fuir l'utilisateur. Cas de test concret à surveiller: persona **Terrabellum** — reste si les templates d'animation sont utilisables rapidement, part si la personnalisation s'avère impossible ou trop bridée. À valider avec de vrais utilisateurs avant/pendant le build, en priorité sur la profondeur de personnalisation des templates.

## Note sourcing de contenu
Sources candidates identifiées pour la bibliothèque de drapeaux/blasons historiques (flaglog.com/historical, fr.flagsdb.com, touslesdrapeaux.xyz/empires.html) nécessitent une revue de licence/droits (scraping + réutilisation commerciale) avant toute utilisation dans le produit.
