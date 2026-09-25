# Addendum — OPENMAP

Détail technique issu de la session de brainstorming, trop dense pour le brief mais utile comme base directe pour la PRD, l'architecture ou la conception UX. Source : `brainstorm-intent.md` et `.memlog.md` de la session de brainstorming (2026-09-21).

## Spec : Kit de Faction

Bundle réutilisable par camp/faction, appliqué en un clic sur un territoire, une flèche ou une troupe. Modifier le kit après coup met à jour tous les éléments qui lui sont assignés partout sur la carte (single source of truth, façon token de design system).

1. **Identité** : nom auto-affiché, ère associée (pour le classement bibliothèque), kit parent optionnel
2. **Couleurs** : remplissage territoire, contour, état survol/sélection
3. **Emblème** : drapeau/blason (upload SVG/PNG ou bibliothèque) + variante mini pour petites icônes
4. **Typographie** : police des labels de la faction
5. **Style de territoire** : épaisseur de contour, intensité de la texture organique (tremblé), easing/overshoot par défaut
6. **Style de mouvement** : épaisseur/style de flèche, forme de tête, vitesse d'animation par défaut
7. **Icônes d'unités** (optionnel, couche ludique RTS) : infanterie/cavalerie/marine, etc.
8. **Héritage** : référence à un kit parent + liste des champs overridés vs hérités — pour les sous-factions (ex. kit parent "Alliés" définit style de base ; kits enfants "France"/"UK"/"USA" héritent le style mais overrident couleur/emblème ; si le parent change, les enfants suivent sauf ce qu'ils ont explicitement personnalisé)
9. **Métadonnées bibliothèque** : officiel (fourni par OPENMAP) vs perso, tags de recherche (nom/période/région)

Bibliothèque de kits pré-faits pour factions historiques connues, priorisée par grande ère (Antiquité, Moyen Âge, Temps modernes, Ère contemporaine) — pas d'exhaustivité day-1.

## Spec : Système d'animation

1. **Timeline maître** : scrubbable (pas juste play/pause), trame narrative par défaut en 3 actes (avant/pendant/après) modifiable, beats/keyframes personnalisés sur dates ou événements
2. **Animations d'éléments par défaut** (liées au Kit de Faction) : territoire pulse avant de basculer de couleur, flèche de troupe qui se dessine en live (trait de stylo), icônes d'unité en léger overshoot, légendes en kinetic typography calées sur le rythme narratif
3. **Caméra** : zoom motivé automatique (pan/zoom vers ce qui compte à l'instant T), override manuel possible. Modes de caméra prédéfinis repris d'AnimateMyMap et simplifiés : top-down, fly-to, orbit, sweep, bounce — presets à récupérer, pas à réinventer (cf. correction de périmètre dans le brief)
4. **Effets d'ambiance RTS** : brouillard de guerre qui se lève progressivement, barres de progression de territoire façon score de conquête
5. **Règles globales — signature organique** : easing avec overshoot par défaut (jamais linéaire), bordures légèrement tremblées, pulsations façon battement de cœur plutôt que pop/disparition sèche
6. **Contrôle utilisateur** : vitesse de lecture réglable, export image figée à un point de la timeline ou vidéo sur une plage, granularité temporelle (jour/mois/année) réglée **manuellement** par l'utilisateur — pas de détection automatique, que ce soit à partir d'un template ou de zéro

## Spec : Templates de fond de carte

1. **Contenu géographique** : tracé historique d'époque ou fond moderne neutre au choix, thème visuel (parchemin organique par défaut, ou sombre/clair/satellite), échelle et zoom de départ prédéfinis
2. **Structure temporelle pré-remplie** : dates clés pertinentes au sujet déjà positionnées, trame 3 actes pré-remplie façon mad-lib, granularité suggérée mais éditable
3. **Éléments pré-placés, jamais figés** : territoires vierges prêts à assigner à un Kit de Faction, flèches de mouvement suggérées, labels placeholder
4. **Catégorisation bibliothèque** : par ère + type de contenu (bataille ponctuelle / campagne militaire / expansion sur la durée / géopolitique actuelle) + tags de recherche
5. **Rien n'est verrouillé** : ajout/suppression de territoires, changement de fond, ou remplacement complet par une carte personnelle importée

## Spec : Boîte à outils éditeur

**Outils de contenu** : Territoire (dessin à main levée ou point par point, assignation Kit de Faction en 1 clic), Flèche (courbe ajustable, hérite du style du kit), Texte/Légende, Icône/Pion d'unité, Import (glisser-déposer image/SVG/carte perso)

**Outils de style** : sélecteur/éditeur de Kit de Faction, sélecteur de fond de carte/template

**Outils temporels** : Timeline (keyframes/dates/actes), Caméra (points de zoom motivé ou override manuel), Effets d'ambiance (on/off + réglages)

**Outils de production** : Export (image PNG/JPG/SVG, vidéo MP4 multi-résolution, plage de timeline sélectionnable), Historique Undo/Redo

**Organisation** : canvas libre en mode édition (zoom/pan à la Figma) vs mode présentation piloté par la caméra automatique, calques pour organiser territoires/flèches/textes/icônes séparément

## Note : Sourcing de contenu (drapeaux et blasons historiques)

Sources candidates identifiées pour amorcer la bibliothèque, à explorer en phase d'implémentation :
- flaglog.com/historical
- fr.flagsdb.com
- touslesdrapeaux.xyz/empires.html

**Risque à traiter avant toute utilisation** : ces sites n'ont pas été vérifiés côté licence/droits de réutilisation. Le scraping et la réutilisation commerciale de leur contenu nécessitent une revue de licence par site avant intégration au produit — certains agrègent eux-mêmes du contenu dont ils ne détiennent pas forcément les droits de redistribution.
