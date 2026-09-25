---
title: OPENMAP
status: draft
created: 2026-09-24
updated: 2026-09-24
---

## Résumé Exécutif

OPENMAP est un éditeur web pour créer des cartes historiques et géopolitiques animées — batailles, conquêtes, évolutions de frontières — aussi simple à utiliser que Canva. Il vise les créateurs de contenu historique/géopolitique (YouTubeurs, vulgarisateurs) qui aujourd'hui bricolent avec Photoshop/After Effects sans les compétences motion design, ou paient un prestataire, pour produire une carte qui a l'air pro.

Le marché existe déjà (AnimateMyMap en tête) — pas d'océan bleu à trouver — mais un angle mort net : personne ne propose de Kit de Faction réutilisable (branding par camp, avec héritage de sous-factions), de signature d'animation organique, ni une expérience aussi guidée façon Canva. OPENMAP reprend par ailleurs ce que ces outils ont déjà bien simplifié (comme leurs modes de caméra), plutôt que de tout réinventer.

Le vrai risque n'est ni technique ni de design — il est double : la profondeur de personnalisation des templates doit tenir la promesse de rapidité sans frustrer l'utilisateur (persona repère Terrabellum : reste si les templates sont vite utilisables, part si trop bridés), et la constitution d'une bibliothèque de données historiques (frontières par époque, drapeaux, blasons) fiable et aux droits propres — le véritable chantier défendable du projet. Le projet est en phase d'exploration solo, sans deadline ni modèle de monétisation arrêté : la priorité est de prouver l'utilité avant de chercher à monétiser.

## Le Problème

Les créateurs de contenu historique et géopolitique qui veulent illustrer leurs vidéos avec des cartes animées — batailles, conquêtes, évolutions de frontières — n'ont aujourd'hui que deux options : bricoler eux-mêmes avec une suite pro (Photoshop, After Effects, Illustrator) sans avoir les compétences ni le temps design/motion, ou payer un motion designer, ce qui coûte cher et crée une dépendance à chaque nouvelle vidéo.

**Hypothèse de travail (non encore validée par une recherche utilisateur formelle)** : la douleur centrale est double — le temps passé à produire une carte correcte, et le coût des outils/prestataires professionnels. Le job réel recherché n'est pas "faire une carte" mais "avoir l'air pro sans le budget ni les compétences design/motion".

Ce qu'on sait avec plus de certitude : le marché existe déjà (AnimateMyMap et consorts en sont la preuve vivante), un écosystème de tutoriels YouTube ("comment créer telle carte de bataille" en Photoshop/After Effects) existe et suggère que la production manuelle est assez technique/pénible pour générer sa propre demande de contenu pédagogique, et un petit groupe informel de créateurs de contenu géopolitique a réagi favorablement au concept sans toutefois confirmer précisément cette douleur dans leurs propres mots. À valider avant ou pendant le build.

## La Solution

OPENMAP est un éditeur web pour créer des cartes historiques et géopolitiques animées, aussi simple que Canva. Un nouvel utilisateur choisit un template, précise l'époque ou une date exacte, la zone géographique et les forces/pays/empires à mettre en avant — puis passe directement à l'animation. Grâce aux Kits de Faction et au style organique appliqués par défaut, la carte est déjà présentable dès cette étape ; l'utilisateur affine ensuite (territoires, flèches, timeline) autant qu'il le souhaite. Le résultat s'exporte en image ou en vidéo, prêt à être intégré dans un montage.

## Ce Qui Différencie OPENMAP

Face à AnimateMyMap et aux autres outils d'animation de cartes, qui misent sur le contrôle technique exhaustif (9 animations de frontière, réglages bézier fins pour les flèches...), OPENMAP mise sur l'inverse : la simplicité guidée façon Canva ; un Kit de Faction réutilisable — avec héritage de sous-factions — qu'aucun concurrent identifié ne propose ; et une signature visuelle organique qui donne une impression de personnalisation même sur un template généré en quelques clics. Ça n'empêche pas de reprendre ce qu'AnimateMyMap a déjà bien simplifié — ses modes de caméra prédéfinis (top-down, fly-to, orbit, sweep, bounce) en sont un bon exemple, et seront repris comme presets plutôt que réinventés.

**Honnêteté sur la défensibilité** : le Kit de Faction et le style organique sont des choix de design réplicables par n'importe quel concurrent qui constate que ça marche — ce n'est pas là qu'est le vrai moat. Le chantier réellement défendable, c'est la **donnée** elle-même : un jeu de données historique et graphique (frontières précises par époque, drapeaux, blasons, kits de factions) correctement sourcé, vérifié et aux droits propres. C'est long à construire, difficile à répliquer rapidement une fois bien fait — et c'est aussi le plus gros risque d'exécution du projet (voir note sourcing de contenu).

## Qui Ça Sert

**Utilisateur primaire** : créateurs de contenu historique et géopolitique (YouTubeurs, vulgarisateurs, monteurs) qui publient régulièrement et ont besoin de cartes animées pour illustrer leurs vidéos, sans budget ni compétences motion design. Persona repère : Terrabellum — reste si les templates sont rapides à utiliser, part si la personnalisation est trop bridée.

Succès pour eux : produire une carte perçue comme "pro" en quelques minutes plutôt qu'en plusieurs heures, sans sortir de leur flux de production vidéo habituel.

**Utilisateurs secondaires** : profs/enseignants (support pédagogique en histoire/géopolitique) et amateurs passionnés d'histoire/wargame qui veulent visualiser une bataille ou une campagne sans compétences techniques.

## Critères de Succès

**Signal principal** : des créateurs de contenu adoptent OPENMAP et en parlent spontanément — mention dans une vidéo, partage organique, recommandation à un pair — sans sollicitation ni promotion payante de notre part. C'est la preuve que l'utilité dépasse la simple curiosité.

**Monétisation volontairement non définie à ce stade.** Priorité assumée : prouver l'utilité et obtenir une adoption organique avant de se poser la question du modèle économique.

## Périmètre (v1)

**Dans le périmètre** :

- Expérience façon Canva (drag-and-drop, templates, simplicité)
- Kit de Faction avec héritage de sous-factions
- Bibliothèque de kits de factions et de fonds de carte historiques pré-faits, priorisée par grande ère (Antiquité, Moyen Âge, Temps modernes, Contemporain — pas d'exhaustivité dès le lancement)
- Import de visuels/cartes personnels
- Export image et vidéo
- Timeline scrubbable avec micro-animations organiques par défaut
- Modes de caméra prédéfinis simples repris d'AnimateMyMap (top-down, fly-to, orbit, sweep, bounce) — leurs bonnes idées déjà simplifiées sont à récupérer, pas à éviter

**Volontairement hors périmètre v1** : le contrôle technique *granulaire* et exhaustif à la AnimateMyMap — multiples animations de frontière fines, réglages bézier avancés, personnalisation poussée de chaque paramètre. La nuance : on pique leurs fonctionnalités déjà simplifiées (comme les modes de caméra), mais sans chercher à égaler leur profondeur de réglage — le pari reste la simplicité, pas l'exhaustivité.

Repoussés après la v1 :

- Habillage UI complet façon RTS
- Export 4K/formats exhaustifs
- Bibliothèque communautaire de templates
- Modèle de monétisation

## Vision

OPENMAP reste centré sur les cartes historiques et géopolitiques — pas de dérive vers la cartographie généraliste. Deux extensions naturelles si le noyau fonctionne : un usage éducatif assumé (au-delà des enseignants en public secondaire actuel — support pédagogique reconnu en établissement), et potentiellement une couche ludique où l'utilisateur ne se contente plus de raconter une bataille passée mais peut la rejouer ou la simuler, dans l'esprit RTS qui inspire déjà le style visuel.
