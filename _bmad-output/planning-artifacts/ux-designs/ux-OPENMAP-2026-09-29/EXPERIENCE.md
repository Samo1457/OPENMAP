---
title: OPENMAP — EXPERIENCE
status: draft
created: 2026-09-29
updated: 2026-09-29
sources:
  - ../../prds/prd-OPENMAP-2026-09-25/prd.md
  - ../../prds/prd-OPENMAP-2026-09-25/addendum.md
  - ../../briefs/brief-OPENMAP-2026-09-24/brief.md
  - ../../briefs/brief-OPENMAP-2026-09-24/addendum.md
name: OPENMAP
---

# OPENMAP — Experience Spine

Ce fichier définit *comment ça marche*. Pour *à quoi ça ressemble*, voir `DESIGN.md`, référencé par tokens `{path.to.token}`. Les exigences produit (FR, NFR, UJ) restent dans la PRD : elles sont citées ici, pas recopiées. Le vocabulaire est celui du Glossaire de la PRD (§3), employé tel quel. Planches de composition : `.working/directions-1.html` (hybride 01 + Timeline 03) et `.working/color-themes-1.html` (variation 02). En cas de conflit avec une planche, **ce spine l'emporte**.

## Foundation

- **Form factor** : application web **desktop PC uniquement**. Écran minimal 1366 × 768 (NFR-8). Chrome et Edge récents pris en charge, Firefox au mieux (NFR-4). Pas de mobile, pas de tablette, pas d'application de bureau (PRD §7).
- **Posture** : produit grand public destiné aux créateurs, avec un lancement public possible. Sans compte : tout reste dans le navigateur (NFR-6).
- **UI system** : shadcn/ui fortement personnalisé `[ASSUMPTION: retenu ; le log le dit « envisagé »]`. Ce spine ne décrit que l'écart de comportement par rapport à shadcn. Dialog, Popover, DropdownMenu, Tabs, Tooltip et Sonner gardent leur comportement par défaut (focus trap, Échap, navigation aux flèches).
- **Identité visuelle** : `DESIGN.md`.
- **Thèmes** : clair et sombre. `[ASSUMPTION: au premier lancement, OPENMAP suit la préférence système ; l'utilisateur peut ensuite choisir dans Réglages.]` Le thème ne touche que le chrome, jamais la Carte (voir « Carte vs chrome »).
- **Langues de l'interface** : français et anglais en v1. La langue des libellés de Carte reste ouverte (PRD Q4).
- **Direction d'expérience** : « façon Canva, voire CapCut » : dense mais simple à prendre en main, aérée, rassurante. Divulgation progressive par défaut (NFR-9).

## Information Architecture

| Surface | Atteinte depuis | Rôle | FR livrées |
|---|---|---|---|
| **Accueil** | Ouverture d'OPENMAP ; « Projets » dans la barre haute | Liste des Projets, Nouveau projet, import de Fichier projet, consentement télémétrie au 1er lancement, bandeau de stockage | FR-1, FR-52, FR-53 (signal), FR-54, FR-58 |
| **Assistant** (4 écrans) | Accueil → « Nouveau projet » | 1 Template · 2 Date de référence · 3 Région · 4 Factions | FR-1, FR-2, FR-3, FR-6, FR-8 (Région), FR-13, FR-15 (Kits auto) |
| **Éditeur** | Fin de l'Assistant ; ouverture d'un Projet | Composer et animer la Carte | voir le détail des zones ci-dessous |
| **Mode présentation** | Barre haute → « Présentation » ; `P` | Plein écran, caméra de la Timeline, rendu identique à l'export | FR-41, FR-57, NFR-1 |
| **Modale Export** | Barre haute → « Exporter » ; `Ctrl+E` | Vidéo ou image, plage, fps, crédit, progression, annulation | FR-10, FR-50, FR-51 |
| **Réglages** | Menu de la barre haute (Accueil et Éditeur) | Thème, langue, télémétrie, Kits personnels, stockage | FR-16, FR-53, FR-58 |
| **Message « conçu pour ordinateur »** | Toute URL ouverte sur mobile ou tablette | Explique la limite de plateforme | NFR-4 |

**Zones de l'Éditeur**

| Zone | Contenu | FR livrées |
|---|---|---|
| Barre haute | Fil « Projets / {nom} », statut de sauvegarde, Format de sortie, annuler/rétablir, recherche de lieu, Présentation, Exporter, menu (Fichier projet, Réglages) | FR-8, FR-50 (format), FR-53, FR-54, FR-55, FR-57 |
| Rail d'outils (libellé) | Sélection · Territoire · Conquête · Flèche · Jeton · Texte · Import, puis Bibliothèque · Calques | FR-18, FR-19, FR-20, FR-21, FR-28, FR-30, FR-31, FR-34, FR-36, FR-37, FR-48, FR-49, FR-56 |
| Tiroir Bibliothèque | Templates · Kits (Bibliothèque / Mes Kits) · Emblèmes · Icônes d'événement | FR-3, FR-15, FR-16, FR-32 |
| Carte (scène) | Canevas, barre d'options de l'outil, masque hors cadre, zoom, toasts | FR-5, FR-9, FR-18 à FR-25, FR-28 à FR-37, FR-47 |
| Panneau de propriétés (contextuel) | Rien de sélectionné : **paramètres du Projet**. Sinon : l'élément, la Faction (Kit), l'Étape ou la sélection multiple | FR-5, FR-6, FR-9 à FR-14, FR-16, FR-17, FR-22 à FR-25, FR-35, FR-39, FR-42, FR-45 à FR-47, FR-49 |
| Timeline (à pistes, repliable) | Actes, vignettes d'Étape, transitions, pistes Flèches / Jetons / Texte, tête de lecture | FR-39 à FR-41, FR-43, FR-45 |

Emplacements non tranchés par le log, posés par défaut :
- Recherche de lieu (FR-8) dans la barre haute. `[ASSUMPTION]`
- Compteur (FR-36) et Horodatage (FR-37) créés depuis l'outil Texte, par un sous-menu Texte · Compteur · Horodatage. `[ASSUMPTION]`
- Icônes d'événement (FR-32) posées depuis la Bibliothèque. `[ASSUMPTION]`
- Légende (FR-35) : visibilité réglée dans les paramètres du Projet, édition en sélectionnant la Légende sur la Carte. `[ASSUMPTION]`
- Relations (FR-22) dans la section Factions des paramètres du Projet. `[ASSUMPTION]`
- Correction de données (FR-11) accessible en sélectionnant une Entité géographique, puis « Plus d'options ». `[ASSUMPTION]`
- Carte personnelle en fond (FR-49) par l'outil Import, action « Utiliser comme fond ». `[ASSUMPTION]`
- Calques (FR-56) ouverts dans l'emplacement du tiroir. `[ASSUMPTION]`
- Import et export de Fichier projet (FR-54) sur l'Accueil (import, et export par Projet) et dans le menu de l'Éditeur (export). `[ASSUMPTION]`

Profondeur des modales : un seul niveau. Seule exception, une confirmation au-dessus de Réglages ou de l'Export.

→ Composition : `.working/directions-1.html` (planche 01 pour la barre haute, le rail et le panneau ; planche 03 pour la Timeline).

## Carte vs chrome

La Carte, c'est le contenu exporté. Le chrome, c'est l'outil. Six règles les séparent.

1. **La Carte ne suit pas le thème.** En clair comme en sombre, la Carte, ses Fonds, ses Factions et ses libellés sont identiques pixel pour pixel. Seul le chrome change.
2. **L'accent UI n'entre jamais sur la Carte.** Sélection, poignées, curseur de pinceau, sélection en attente de la conquête et point d'origine de propagation s'affichent en `{colors.canvas-ink}` + `{colors.canvas-halo}` (voir `DESIGN.md` → Canevas).
3. **Pas de cadre décoratif.** La limite du cadre d'export se lit uniquement à l'assombrissement de la Carte hors cadre (`export-frame-mask`). En Mode édition, la caméra est libre et la Carte continue au-delà du cadre.
4. **Ce que montre le cadre, c'est l'export.** À tout instant de la Timeline, l'intérieur du cadre montre l'image exportée à cet instant (FR-41, NFR-1). Seules les surimpressions d'édition s'y ajoutent, et elles disparaissent en Mode présentation et à l'export.
5. **Le chrome ne recouvre pas le cadre.** Toasts en bas à droite de la scène, barre d'options en haut, zoom en bas à gauche. Le tiroir peut recouvrir la partie gauche de la scène, mais la Carte n'est pas recadrée pour autant. `[ASSUMPTION]`
6. **Les couleurs de Faction sont du contenu.** Le chrome ne les réutilise jamais. Elles n'apparaissent dans le chrome que sous forme de pastilles nommées. Un garde-fou prévient quand une couleur de Kit s'approche de l'accent UI (`DESIGN.md` → Garde-fou).

## Modèle d'Étapes dans l'UI

La PRD pose le modèle au §4.0 : héritage vers l'avant, portée d'une modification, existence, appartenance. Voici comment il se voit et se manipule dans l'interface.

| Règle §4.0 | Traduction dans l'interface |
|---|---|
| **Étape courante** | C'est l'Étape dont la vignette porte `etape-thumbnail-current`. La barre d'options de l'outil la rappelle en permanence (« Étape 1463 · Conquête de la Bosnie »). Toute modification sur la Carte s'applique à l'Étape courante. |
| Tête de lecture au milieu d'une transition | La Carte montre l'image interpolée, en lecture seule. Au premier geste d'édition, la tête de lecture se cale au début du maintien de l'Étape d'arrivée, avec un toast « Placé sur l'Étape 1463 pour modifier ». `[ASSUMPTION]` `[NOTE FOR UX]` |
| **Héritage vers l'avant** | Dans le panneau, chaque propriété d'un élément indique son origine en légende : « Défini à cette Étape » (`field-overridden`) ou « Hérité de 1459 » (`field-inherited`). Le vocabulaire visuel des images clés (losanges) est proscrit, pour ne pas suggérer un modèle à keyframes. `[ASSUMPTION]` |
| **Portée : cette Étape et les suivantes** | C'est le comportement par défaut, sans rien demander. Après une modification, le lien « Appliquer à toutes les Étapes » apparaît sous le champ modifié tant que l'élément reste sélectionné. Sur la Carte (déplacer un Jeton, redessiner une Zone), le même lien apparaît dans la barre d'options. `[ASSUMPTION]` |
| **Appliquer à toutes les Étapes** | Cette action fixe la valeur sur l'Étape où l'élément existe en premier et efface les valeurs propres des Étapes suivantes. Elle s'annule en un seul `Ctrl+Z`, et un toast le rappelle : « Appliqué aux 5 Étapes · Annuler ». |
| **Rétablir l'héritage** | Le lien « Rétablir » d'un champ défini à cette Étape supprime la valeur propre ; la valeur de l'Étape précédente reprend. |
| Repères sur la Timeline | Quand un élément est sélectionné, les Étapes où il a une valeur propre portent un petit trait d'encre sous leur vignette. `[ASSUMPTION]` |
| **Existence / persistance** (FR-45) | Un élément de piste est un clip qui court de son Étape de création à la fin de la Timeline. On limite sa plage en tirant la fin du clip, ou avec le champ « Visible de … à … » du panneau. Les Territoires n'ont pas de clip : ils vivent dans la rangée des vignettes. |
| **Nouvelle Étape** (FR-40) | « + Étape » à la fin des vignettes, ou `Ctrl+D` sur une Étape pour la dupliquer. La nouvelle Étape part de l'état de l'Étape précédente et devient l'Étape courante. Date proposée : la précédente, plus le même intervalle. `[ASSUMPTION]` |
| **Supprimer une Étape** | Pas de dialogue. Toast « Étape 1463 supprimée · Annuler ». Les Étapes suivantes reprennent la valeur de l'Étape précédente (FR-40). |
| **Kit de Faction** (FR-12) | Il n'est pas soumis aux Étapes. L'éditeur de Kit l'annonce en tête : « S'applique à toute la Timeline ». |
| **Date de référence** vs **Date d'Étape** | La Date de référence vit dans les paramètres du Projet, et la changer demande confirmation (FR-6). La Date d'Étape se règle dans le panneau d'une Étape et sur sa vignette. Leurs libellés restent toujours distincts, pour qu'on ne confonde jamais les deux. |

## Voice and Tone

La voix de marque vit dans `DESIGN.md` → Brand & Style. Ici, les règles de microcopie :

- **Glossaire verbatim**, avec la majuscule : Étape, Territoire, Kit de Faction, Timeline, Fond de carte, Région, Date de référence… Jamais de synonyme : on n'écrit pas « scène », « keyframe » ou « thème de faction ».
- **Français** : vouvoiement, impératif pour les consignes (« Glissez sur la carte pour peindre la conquête. »), phrases courtes et complètes, typographie française (guillemets « », espace insécable avant « : ; ? ! », virgule décimale : `1,5 s`, `00:08,4`).
- **Anglais** : même structure, ton direct, *sentence case*. `[ASSUMPTION: équivalents EN du Glossaire à valider : Step, Territory, Faction Kit, Sub-faction, Timeline, Basemap, Region, Reference date, Step date, Library, Act, Front line, Pocket, Unit token, Event icon, Counter, Timestamp, Legend, Camera preset, Organic signature, Output format, Project file.]`
- Les messages d'état disent **où en sont les données de l'utilisateur**, jamais « Erreur » tout court. Pas de point d'exclamation, pas d'emoji, pas d'encouragement.
- Les boutons portent un verbe, plus un objet si besoin : « Exporter », « Valider la conquête », « Ajouter une sous-faction ».
- Dates avant notre ère : « 52 av. J.-C. » / « 52 BC ».

| Contexte | FR | EN | À éviter |
|---|---|---|---|
| Sauvegarde | « Enregistré » · « Projet sauvegardé — Sur cet appareil · à l'instant » | "Saved" · "Project saved — On this device · just now" | « Sauvegarde réussie ! ✓ » |
| Conquête | « Glissez sur la carte pour peindre la conquête. La Faction active est « Empire ottoman ». » | "Drag on the map to paint the conquest. Active Faction: Ottoman Empire." | « Mode pinceau activé » |
| Compte avant validation | « 12 Entités sélectionnées » | "12 entities selected" | « 12 items » |
| Kit | « Copie propre au Projet » · « Hérite · couleur surchargée » | "Project copy" · "Inherits · colour overridden" | « Kit cloné » |
| Garde-fou Faction | « Cette couleur est proche de celle de l'interface. Elle restera lisible sur la Carte, mais peut prêter à confusion dans les listes. » | "This colour is close to the interface accent…" | « Couleur invalide » |
| Stockage | « Stockage presque plein. Exportez un Fichier projet pour ne rien perdre. » | "Storage almost full. Export a project file to keep your work safe." | « Quota exceeded » |
| Satellite indisponible | « Le Fond satellite est indisponible. La Carte utilise le Fond sombre. » | "Satellite basemap unavailable. Using the dark basemap." | « Erreur 503 » |
| Export annulé | « Export annulé. Rien n'a été enregistré. » | "Export cancelled. Nothing was saved." | — |
| Suppression | « Supprimer l'Étape » → toast « Étape 1463 supprimée · Annuler » | "Delete step" → "Step 1463 deleted · Undo" | « Êtes-vous sûr ? » |
| Données approximatives | « Données les plus proches : 1454 » | "Nearest available data: 1454" | — |
| Télémétrie | « Aider à améliorer OPENMAP en envoyant des statistiques d'usage anonymes ? Le contenu de vos Projets ne quitte jamais votre ordinateur. » | "Help improve OPENMAP with anonymous usage statistics? Your project content never leaves your computer." | Case précochée, formulations culpabilisantes |

## Component Patterns

Comportements. Les specs visuelles sont dans `DESIGN.md` → Components.

| Composant | Où | Règles de comportement |
|---|---|---|
| **Rail d'outils** | Éditeur, à gauche | Un seul outil actif. Clic ou raccourci pour l'activer ; `Échap` revient à Sélection. Chaque item a une icône et un libellé visible, et son infobulle donne le nom complet et le raccourci (« Jeton d'unité · J »). L'outil actif configure la barre d'options et, s'il y a lieu, le panneau. Bibliothèque et Calques ne sont pas des outils : ce sont des bascules de tiroir, marquées actives tant que le tiroir est ouvert. |
| **Barre d'options de l'outil** | Haut de la scène | Rappelle l'Étape courante, puis les réglages essentiels de l'outil actif : Faction, taille de pinceau, forme de Jeton… Porte aussi les liens contextuels (« Appliquer à toutes les Étapes », « Valider la conquête »). |
| **Panneau de propriétés** | Éditeur, à droite | Toujours visible. Rien de sélectionné : paramètres du Projet (Nom, Format de sortie, Date de référence, Région, Fond de carte, Factions et Relations, Ligne de front, Signature organique du Projet, Légende, Couches et libellés, Sources et licences). Un élément sélectionné : ses propriétés. Une Faction : son Kit. Une vignette d'Étape : Date d'Étape, transition (propagation, fondu, balayage, avec le point d'origine), durées de transition et de maintien, Preset caméra, cadrage manuel, Acte. Sélection multiple : « 3 éléments » et les seuls champs communs. Les modifications s'appliquent en direct, sans bouton « Appliquer ». |
| **« Plus d'options »** | Bas de chaque section et du panneau | Tout panneau n'expose d'abord que l'essentiel (NFR-9). La rangée résume ce qu'elle cache (« Frontière, Flèche, Jeton ») et se déplie sur place, en accordéon, sans ouvrir de dialogue. L'état déplié est mémorisé par type de panneau pendant la session. `[ASSUMPTION]` Tout nouveau réglage entre par défaut derrière « Plus d'options » (SM-C1). |
| **Éditeur de Kit de Faction** | Panneau, dès qu'une Faction est sélectionnée (pastille d'un Territoire, liste des Factions) | En-tête : Emblème, nom, origine (« Copie propre au Projet · depuis la Bibliothèque »), mention « S'applique à toute la Timeline ». Sections essentielles : Couleurs (remplissage, contour, sélection), Emblème & police, Signature organique (Désactivée · Légère · Marquée · Par défaut du Projet), Sous-factions (liste avec leur état « hérite · couleur surchargée » ; « Ajouter une sous-faction »). Derrière « Plus d'options » : Frontière, Flèche, Jeton, remplissage par drapeau (P1). Chaque champ s'applique immédiatement partout (FR-12). Menu du Kit : « Enregistrer dans mes Kits » et « Mettre à jour depuis mes Kits » (P1, FR-16). |
| **Affichage de l'héritage** (Sous-faction) | Éditeur de Kit d'une Sous-faction | Chaque champ montre son état. Hérité : `field-inherited`, avec « Hérité de Empire ottoman » et la valeur du parent. Surchargé : `field-overridden`, avec « Rétablir ». Modifier un champ hérité le surcharge. « Rétablir » le fait suivre de nouveau le parent (FR-14). Un résumé en tête du panneau compte les surcharges : « 1 champ surchargé ». |
| **Garde-fou couleur de Faction** | Champ couleur du Kit | Recalculé à chaque changement. Sous ΔE 10 face à l'accent de l'un ou l'autre mode, un avertissement non bloquant s'affiche sous le champ. Il ne s'affiche jamais en toast. |
| **Mode conquête au pinceau** | Outil Conquête | 1) La barre d'options demande la **Faction attaquante** : dernière utilisée, sinon la première Faction non neutre. 2) Mode Entités (défaut) ou Peinture libre (FR-21). Taille de pinceau réglable avec `[` et `]`. 3) Glisser peint une sélection *en attente* : Entités hachurées en encre + halo, compteur « 12 Entités sélectionnées » (FR-20). `Alt` + glisser retire des Entités. 4) « Valider la conquête » (`Entrée`) applique le changement à l'Étape courante. `Échap` abandonne la sélection en attente. 5) Après validation, rien ne se lance tout seul : la transition se voit en scrubbant ou en lisant. Si la Région n'a pas de subdivisions, la barre d'options le signale et propose la Peinture libre (FR-7, P1). |
| **Timeline** | Bas de l'Éditeur | **En-tête** : lecture/pause (`Espace`), Étape précédente/suivante, minutage « 00:08,4 / 00:20,5 », vitesse (0,5× · 1× · 2×), zoom horizontal, bouton replier/déplier. **Règle** en secondes : cliquer ou glisser place la tête de lecture. **Actes** (P1) : blocs nommés au-dessus des vignettes, renommables par double-clic ; on sélectionne des vignettes, puis « Grouper en Acte ». **Vignettes d'Étape** : leur largeur est proportionnelle à la durée de maintien. Un clic place la tête au début du maintien et sélectionne l'Étape (panneau Étape). Double-clic sur le titre pour le renommer. Glisser pour réordonner (FR-40). Menu contextuel : Dupliquer, Insérer après, Supprimer. **Transitions hachurées** : leur largeur est proportionnelle à la durée. Tirer le bord règle la durée. `[ASSUMPTION]` **Pistes** Flèches / Jetons / Texte : un clip par élément. Cliquer sur un clip sélectionne l'élément sur la Carte, et inversement. Tirer la fin d'un clip limite sa plage (FR-45). Les Icônes d'événement vont sur la piste Jetons. `[ASSUMPTION]` |
| **Tiroir Bibliothèque** | Rail → Bibliothèque ; `B` | S'ouvre contre le rail, sans quitter l'Éditeur ni recadrer la Carte. Onglets : Templates · Kits · Emblèmes · Icônes d'événement. Recherche avec filtres Ère, région du monde et type (FR-3, FR-15). Kits : clic sur un Kit → « Appliquer à {Faction sélectionnée} » ou « Ajouter comme nouvelle Faction ». L'une ou l'autre crée une copie propre au Projet (FR-13). Section « Mes Kits » en P1. Emblèmes et Icônes : glisser sur la Carte, ou clic pour poser au centre du cadre. Templates dans l'Éditeur : « Nouveau Projet depuis ce Template » ouvre l'Assistant prérempli. `[ASSUMPTION]` Se ferme avec `Échap`, le bouton du rail ou la croix. |
| **Recherche de lieu** | Barre haute ; `/` | Champ avec suggestions (pays, ville, Entité géographique). `Entrée` centre la caméra d'édition sur le lieu choisi, sans toucher aux Presets caméra (FR-8). |
| **Format de sortie** | Barre haute | Menu 16:9 · 9:16 · 1:1. Un changement recalcule les cadrages (FR-50). Toast : « Cadrages recalculés pour 9:16 · Annuler ». |
| **Modale Export** | Barre haute → Exporter | Onglets **Vidéo** / **Image** (P1). Vidéo : plage (Toute la Timeline · Étapes de … à …), 30 ou 60 images/s, rappel du Format de sortie et de la résolution 1080p, option « Crédit dans l'export », cochée d'office quand la licence l'exige (FR-10). Image : instant (tête de lecture courante par défaut), PNG ou JPG, « Fond transparent » (PNG seulement). « Exporter » lance le rendu **dans la modale** : barre de progression, pourcentage, temps restant estimé, « Annuler ». L'Éditeur reste bloqué pendant le rendu. `[ASSUMPTION]` Succès : le fichier est téléchargé (nom : `{projet}-{format}-{date}.mp4`), toast « Export terminé ». `[ASSUMPTION]` |
| **Toasts** | Bas droite de la scène | Un seul visible à la fois, les suivants en file. Les informations disparaissent après 4 s ; un toast qui porte une action (« Annuler ») reste 8 s ; une erreur reste jusqu'à fermeture. `[ASSUMPTION]` Jamais au-dessus du cadre d'export. Pas de toast à chaque sauvegarde automatique : le statut vit dans la barre haute, et le toast « Projet sauvegardé » ne paraît qu'après `Ctrl+S` ou à la première sauvegarde d'un nouveau Projet. `[ASSUMPTION]` |
| **Bandeaux** | Sous la barre haute (Accueil, Éditeur) | Pour les états durables : stockage non persistant ou presque plein, hors ligne, navigateur non pris en charge. Une action au plus, et on peut les masquer pour la session. |
| **Assistant** | Dialogue plein cadre depuis l'Accueil | 4 écrans, avec « 1 / 4 », Retour, Passer, Suivant, et « Créer la Carte » au dernier. « Passer » garde les valeurs du Template (FR-2). Écran 1 : « Carte vierge » en premier, puis la grille de Templates filtrable, avec vignette animée au survol. Écran 2 : année, bascule « av. J.-C. », et la mention « Données les plus proches : … » si la date n'est pas exacte. Écran 3 : recherche de Région, avec un aperçu qui la cadre. Écran 4 : Factions suggérées avec leur Kit (Emblème, couleur), ajout par recherche dans les Kits de la Bibliothèque ; une Faction sans Kit officiel reçoit une couleur distincte. |
| **Liste des Projets** | Accueil | Projets triés du plus récent au plus ancien. Chaque carte montre une vignette, le nom, la date de modification et le Format de sortie. Clic : ouvrir dans l'Éditeur. Menu : Renommer (sur place), Dupliquer, Exporter le Fichier projet, Supprimer (toast « Projet supprimé · Annuler » ; suppression définitive quand le toast se ferme). `[ASSUMPTION]` Déposer un Fichier projet n'importe où sur l'Accueil l'importe (FR-52, FR-54). |
| **Réglages** | Menu de la barre haute | Dialogue à onglets : Apparence (Système · Clair · Sombre), Langue (Français · English, appliquée sans rechargement), Confidentialité (bascule de télémétrie avec l'explication de ce qui est envoyé ou non, FR-58), Mes Kits (liste, renommer, supprimer, importer ou exporter en fichier, P1), Stockage (espace utilisé, état du stockage persistant, rappel d'exporter les Fichiers projet). Chaque changement est immédiat, sans bouton « Enregistrer ». `[ASSUMPTION: Réglages en dialogue plutôt qu'en page]` |
| **Calques** (P1) | Rail → Calques | Liste par nature (Territoires, Flèches, Jetons, textes, médias) avec œil (masquer), cadenas (verrouiller) et glisser pour réordonner (FR-56). |
| **Mode présentation** | `P` ; bouton « Présentation » | Plein écran, lecture depuis la tête de lecture. Contrôles minimaux (lecture/pause, barre de progression, sortie) qui s'effacent 2 s après le dernier mouvement de souris ; ils n'apparaissent jamais à l'export. `Échap` ramène à l'Éditeur, à l'instant atteint. |

## State Patterns

| État | Surface | Traitement |
|---|---|---|
| Premier lancement | Accueil | Dialogue de consentement télémétrie (FR-58) : « Accepter » et « Refuser », de même poids, rien de présélectionné. Tant que l'utilisateur n'a pas répondu, rien n'est envoyé. |
| Aucun Projet | Accueil | « Aucun Projet pour l'instant. » + « Nouveau projet » (primaire) + « Importer un Fichier projet ». |
| Projet rouvert après fermeture ou plantage | Accueil → Éditeur | Le Projet s'ouvre dans son dernier état sauvegardé (FR-53, NFR-5). Pas de dialogue de récupération. |
| Enregistrement | Barre haute | « Enregistrement… », puis « Enregistré ». Échec d'écriture : « Non enregistré », en `{colors.danger}` avec son icône, et un bandeau « Exportez un Fichier projet pour ne rien perdre ». |
| Stockage persistant refusé / presque plein | Accueil et Éditeur | Bandeau `{colors.warning}` avec l'action « Exporter le Fichier projet » (FR-53). Il revient à chaque session tant que la condition dure. |
| Chargement des tuiles | Carte | Les tuiles arrivent progressivement ; en attendant, le fond est `{colors.map-land-neutral}` uni. L'édition n'est jamais bloquée. La lecture continue avec les tuiles déjà disponibles. |
| Chargement des données (Bibliothèque, Entités) | Tiroir, Assistant | Squelettes de vignettes. Échec : « Impossible de charger la Bibliothèque. » + « Réessayer ». |
| Données approximatives | Barre d'options, paramètres du Projet | Pastille « Données les plus proches : 1454 » (FR-6). |
| Satellite indisponible | Carte, sélecteur de Fond | Bascule automatique sur le Fond sombre. Toast avertissement, et le Fond satellite marqué « indisponible » dans le sélecteur, avec « Réessayer ». Aucun élément du Projet n'est touché (FR-5). |
| Hors ligne | Global | Bandeau « Hors ligne. Vos modifications sont enregistrées sur cet appareil ; les fonds de carte et la Bibliothèque non encore chargés ne s'afficheront pas. » L'édition continue. L'export prévient si des tuiles manquent. `[ASSUMPTION]` |
| Export en cours | Modale Export | Progression, temps restant, « Annuler ». Fermer l'onglet affiche l'alerte native du navigateur. |
| Export annulé | Modale Export | Retour aux réglages de la modale, avec « Export annulé. Rien n'a été enregistré. » |
| Export échoué | Modale Export | Message en `{colors.danger}` : « L'export a échoué. » + cause lisible (mémoire, encodeur du navigateur) + « Réessayer » + conseil (« Essayez 30 images/s ou une plage plus courte »). `[ASSUMPTION]` |
| Navigateur non pris en charge (Firefox) | Accueil | Bandeau « OPENMAP est conçu pour Chrome et Edge. L'export vidéo peut ne pas fonctionner ici. » `[ASSUMPTION]` |
| Timeline vide (Projet vierge) | Timeline | Une seule Étape. Dans la rangée de vignettes : « Ajoutez une Étape pour animer la Carte. » + « + Étape ». |
| Aucune Faction | Panneau (paramètres du Projet), outil Conquête | « Ajoutez une Faction pour colorer des Territoires. » + « Ajouter une Faction », qui ouvre la Bibliothèque sur l'onglet Kits. |
| Aucune subdivision (P1) | Barre d'options de Conquête | « Pas de subdivisions pour cette Région à cette date. Peignez librement ou découpez une Entité. » (FR-7) |
| Entité corrigée (P1) | Carte, panneau | Mention « Corrigée dans ce Projet » dans le panneau (FR-11). |
| Import d'image refusé | Carte | Toast : « Format non pris en charge. Utilisez PNG, JPG ou SVG. » |
| Fichier projet invalide | Accueil | Dialogue : « Ce fichier n'est pas un Fichier projet OPENMAP lisible. » Aucun Projet existant n'est modifié. |
| Changement de Date de référence | Paramètres du Projet | Confirmation : « Les Territoires construits sur des Entités qui n'existent plus en {date} deviendront des Zones dessinées. » (FR-6) |
| Focus | Partout | Anneau `focus-ring` visible au clavier seulement (`:focus-visible`). |

## Interaction Primitives

- **Sélection** : clic sur un élément ou une Entité géographique (outil Sélection). Le panneau bascule sur cet élément. Clic dans le vide : retour aux paramètres du Projet.
- **Sélection multiple** : `Maj` + clic pour ajouter ou retirer, glisser un rectangle dans le vide pour sélectionner par zone (outil Sélection), `Ctrl+A` pour tous les éléments du Calque actif. `[ASSUMPTION]`
- **Glisser** : déplacer un élément à l'Étape courante (portée §4.0), glisser-déposer des fichiers images sur la Carte (FR-48) ou d'un Fichier projet sur l'Accueil, réordonner les Étapes et les Calques, tirer les bords de clip et de transition.
- **Pinceau** : outil Conquête. Glisser peint, `Alt` + glisser efface la sélection en attente, `[` et `]` règlent la taille, `Entrée` valide, `Échap` abandonne.
- **Tracé** : Territoire / Zone dessinée et Flèche. Clic pour poser un point, glisser pour la main levée, double-clic ou `Entrée` pour terminer, `Retour arrière` pour retirer le dernier point.
- **Scrub** : glisser la tête de lecture ou cliquer sur la règle. La Carte affiche l'image exacte de l'export (FR-41). `←` et `→` passent à l'Étape précédente ou suivante. `Maj` + `←` / `→` avance d'une image.
- **Zoom et panoramique** (caméra d'édition) : molette pour zoomer autour du curseur, pincement au pavé tactile, `Espace` + glisser ou bouton du milieu pour se déplacer, `Maj+1` pour recentrer sur le cadre d'export (évite `Ctrl+0`, réservé au zoom du navigateur). La caméra d'édition ne modifie jamais les Presets ni le cadrage manuel d'une Étape.
- **Annuler / rétablir** (FR-55) : `Ctrl+Z` / `Ctrl+Maj+Z` (et `Ctrl+Y`). Plusieurs niveaux, sur la Carte, la Timeline, les Kits et les paramètres du Projet. L'annulation ne couvre pas l'export, les Réglages ni l'import de Fichier projet. L'historique ne survit pas au rechargement. `[ASSUMPTION]`
- **Proscrit** : images clés et courbes de Bézier exposées (PRD §9), modales empilées, action destructive sans « Annuler », survol comme seul accès à une fonction, lecture automatique à l'ouverture d'un Projet.

Raccourcis proposés `[ASSUMPTION: liste à valider ; les raccourcis à une lettre suivent le caractère tapé, pour AZERTY comme pour QWERTY, et sont inactifs dans un champ texte]` :

| Touche | Action | Touche | Action |
|---|---|---|---|
| `V` | Sélection | `Espace` | Lecture / pause |
| `T` | Territoire | `←` / `→` | Étape précédente / suivante |
| `C` | Conquête | `Ctrl+D` | Dupliquer (élément ou Étape) |
| `F` | Flèche | `Suppr` | Supprimer la sélection |
| `J` | Jeton d'unité (vu sur la planche 01) | `Ctrl+Z` / `Ctrl+Maj+Z` | Annuler / rétablir |
| `X` | Texte | `Ctrl+S` | Confirmer la sauvegarde (toast) |
| `I` | Import | `Ctrl+E` | Exporter |
| `B` | Bibliothèque | `P` | Mode présentation |
| `L` | Calques | `/` | Rechercher un lieu |
| `Échap` | Fermer, abandonner, revenir à Sélection | `?` | Aide des raccourcis |

## Accessibility Floor

Comportements. Le contraste visuel est défini dans `DESIGN.md` (tous les textes courants ≥ 4,5:1 ; `{colors.focus-ring}` et `{colors.playhead}` ≥ 3:1 ; `{colors.text-muted}` est le plancher et ne s'éclaircit pas).

- **Cible** : WCAG 2.2 AA pour tout le chrome. Le contenu de la Carte appartient à l'utilisateur : OPENMAP ne l'audite pas, mais garantit par défaut des libellés sur halo et un style neutre distinct.
- **Accès clavier** : tout est atteignable au clavier, y compris la barre haute, le rail, le tiroir, le panneau, la Timeline et les dialogues. L'ordre de tabulation suit l'ordre visuel : barre haute → rail → barre d'options → Carte → panneau → Timeline. `F6` passe d'une zone à l'autre. `[ASSUMPTION]` Dans la Timeline, `←` / `→` se déplacent entre les vignettes, `Entrée` sélectionne, `Alt` + `←` / `→` réordonne.
- **Alternatives au pointeur** : dessiner et peindre restent des gestes de pointeur. Chaque résultat a toutefois un chemin clavier : sélectionner une Entité par la recherche de lieu (FR-8) puis « Ajouter au Territoire de … » ; déplacer un élément sélectionné aux flèches (`Maj` pour un pas de 10) ; régler les valeurs numériques dans le panneau. `[ASSUMPTION]`
- **Focus visible** : anneau `focus-ring` (2 px, décalé de 2 px) sur tout élément focalisable. Sur la Carte, l'élément focalisé prend le contour `canvas-selection`, jamais l'accent.
- **Lecteurs d'écran** : chaque outil du rail est un bouton nommé par son libellé visible, avec `aria-pressed` pour l'outil actif et `aria-keyshortcuts` pour son raccourci. La Carte est une région nommée (« Carte, Étape 1463 ») ; une zone `aria-live` polie annonce la sélection (« Territoire Empire ottoman sélectionné, 12 Entités »), le compteur de conquête et la validation. La tête de lecture est un `slider` avec `aria-valuetext` (« 00:08,4, Étape 1463, Conquête de la Bosnie »). Les vignettes forment une liste (« Étape 3 sur 5, 1463, Conquête de la Bosnie, transition 2 s, maintien 2,5 s »). Les pastilles de Faction portent toujours le nom. Les toasts sont annoncés, poliment pour une information, de façon assertive pour une erreur.
- **Mouvement réduit** (`prefers-reduced-motion`) :
  - *Chrome* : tiroir, toasts, accordéons et changements de panneau passent en fondu court ou en instantané. La Signature organique ne s'applique jamais aux éléments d'interface, quel que soit le réglage.
  - *Carte dans l'Éditeur* : c'est du contenu, et l'aperçu doit égaler l'export (NFR-1). La lecture montre donc la Signature organique telle que réglée, mais elle ne démarre jamais seule : pas de lecture automatique après l'Assistant ni à l'ouverture. Les vignettes animées des Templates restent statiques. Dans ce cas, le panneau Signature organique rappelle : « L'animation de la Carte est votre contenu ; réglez-la sur Désactivée pour supprimer dépassement, tremblé et pulsation. »
  - *Export* : il n'est jamais affecté par la préférence système. Seul le réglage Signature organique du Projet ou du Kit compte.
- **Couleur** : aucune information portée par la seule couleur. Les pistes ont leur libellé, les états leur icône et leur texte, les Factions leur nom.
- **Cibles** : 24 × 24 px minimum (WCAG 2.2, 2.5.8) ; 28 px pour les contrôles du chrome.

## Responsive & Platform

| Condition | Comportement |
|---|---|
| Desktop ≥ 1366 × 768, Chrome ou Edge | Expérience complète. Aucun panneau essentiel masqué, aucun défilement horizontal (NFR-8). |
| Fenêtre < 1366 px de large | La Carte rétrécit en premier. Sous 1280 px, le panneau se réduit à 260 px et le tiroir recouvre davantage la scène. Un bandeau signale : « OPENMAP est conçu pour un écran d'au moins 1366 × 768. » `[ASSUMPTION]` |
| Faible hauteur | La Timeline se replie à `{spacing.timeline-collapsed-height}` (en-tête seul : lecture, minutage, Étape précédente/suivante). Un bouton de l'en-tête la déplie. `[ASSUMPTION]` |
| Redimensionner la Timeline | Poignée sur le bord supérieur, de 180 px à 50 % de la hauteur. Hauteur et état replié mémorisés localement. `[ASSUMPTION]` |
| Firefox | Fonctionne au mieux, avec un bandeau d'avertissement (NFR-4). |
| Mobile ou tablette (pointeur grossier et largeur < 1024 px) | Pas d'éditeur. Page explicative : « OPENMAP est conçu pour un ordinateur. Ouvrez ce lien sur votre PC avec Chrome ou Edge. » + « Copier le lien ». `[ASSUMPTION: message bloquant]` |
| Plein écran | Réservé au Mode présentation (API Fullscreen). |

## Inspiration & Anti-patterns

- **Repris de Canva** : l'Assistant guidé qui mène de rien à un résultat, le tiroir Bibliothèque qui s'ouvre contre le rail sans quitter l'éditeur, le rail d'outils libellé, le panneau contextuel qui ne montre que l'essentiel, « Appliquer à toutes les pages » (ici : « Appliquer à toutes les Étapes »), l'impression qu'on ne peut rien casser.
- **Repris de CapCut** : la Timeline à pistes proéminente, avec règle, tête de lecture, vignettes et blocs de transition. Les vidéastes la lisent sans apprentissage.
- **Repris de la concurrence** (PRD §1) : les Presets caméra, sans complexe.
- **Rejeté — After Effects** : trop dense, trop technique. Pas d'images clés exposées, pas de courbes, pas de panneaux flottants empilés, pas de réglage avancé visible par défaut (SM-C1).
- **Rejeté — esthétique « IA slop » et « vibecoder »** : template shadcn laissé par défaut, dégradés violets, cartes arrondies partout, emojis (voir `DESIGN.md` → Do's and Don'ts).
- **Rejeté — habillage RTS du chrome en v1** : l'esprit RTS vit sur la Carte ; le chrome reste sobre (PRD §7, §10.4).
- **Risque identifié (planche 03)** : la ressemblance avec un éditeur vidéo peut laisser croire à un modèle à images clés. D'où la section « Modèle d'Étapes dans l'UI », qui l'écarte explicitement.

## Key Flows

Noms repris tels quels de la PRD §2.3. Entre crochets, la surface concernée.

### UJ-1. Terrabellum sort un Short sur le siège de Marioupol le soir même.

1. [Accueil] Terrabellum ouvre OPENMAP sur son PC, sans compte, puis « Nouveau projet ».
2. [Assistant 1/4] Il filtre « géopolitique actuelle » et choisit « Conflit contemporain — siège de ville ».
3. [Assistant 2/4] Il saisit la Date de référence 2022.
4. [Assistant 3/4] Il tape « Marioupol » ; l'aperçu cadre la ville.
5. [Assistant 4/4] Il choisit Russie et Ukraine, dont les Kits officiels s'appliquent d'eux-mêmes, puis « Créer la Carte ».
6. [Éditeur · panneau Projet] Format de sortie 9:16, Fond de carte satellite.
7. [Éditeur · outil Territoire] Il dessine la Poche ukrainienne à main levée et la marque « Poche » dans le panneau (P1).
8. [Timeline] « + Étape » pour chaque semaine, de mars à mai. À chaque Étape, il resserre les points de la Poche.
9. [Outil Jeton] Il pose des badges ronds à drapeau en Série de Jetons attachée à la Ligne de front (P1), puis [outil Texte] un Compteur d'effectifs par camp et un Horodatage au jour.
10. [Timeline] Il scrubbe : la Poche se resserre en se déformant, avec la Signature organique.
11. [Modale Export] Vidéo, toute la Timeline, 30 images/s, « Exporter ».
12. **Climax :** la barre atteint 100 %, le MP4 vertical se télécharge. Moins de 20 minutes depuis l'ouverture.

**Cas limite :** à la 3e Étape, le tracé est trop grossier. Il corrige les points ; le panneau affiche « Défini à cette Étape ». Les Étapes 4 et suivantes sans tracé propre héritent de la correction ; les Étapes 1 et 2 ne changent pas.
**Échec :** le satellite est indisponible. La Carte passe au Fond sombre, un toast le dit, et le reste du parcours ne change pas.

### UJ-2. Terrabellum raconte l'expansion ottomane dans les Balkans.

1. [Assistant] Template « Expansion d'empire » (Ère Temps modernes), Date de référence 1450, Région Balkans, Faction Empire ottoman.
2. [Éditeur · éditeur de Kit] Le Kit officiel devient une « Copie propre au Projet ». Il clique sur « Ajouter une sous-faction » et crée « Vassaux ottomans », puis surcharge la couleur. Le panneau montre « Hérite · couleur surchargée ».
3. [Timeline] Il crée les Étapes 1453, 1459, 1463…
4. [Outil Conquête] Pour chaque Étape : Faction attaquante « Empire ottoman », peinture au pinceau des Entités (« 12 Entités sélectionnées »), « Valider la conquête ». Là où le découpage manque, il passe en Peinture libre.
5. [Carte] La Ligne de front se redessine seule face aux Factions en conflit, mais pas entre l'Empire et ses vassaux, alliés par défaut.
6. [Panneau Étape] Preset caméra « Fly-to » sur les Étapes clés.
7. [Éditeur de Kit parent] Il change la teinte de l'Empire ottoman.
8. **Climax :** tous les Territoires, Flèches et Jetons ottomans, vassaux compris, se mettent à jour sur toute la Timeline. Les vignettes d'Étape se recolorent sous ses yeux.

**Cas limite :** [menu du Kit] « Enregistrer dans mes Kits » (P1). Le Kit officiel de la Bibliothèque ne bouge pas.
**Garde-fou :** si la nouvelle teinte tombe sous ΔE 10 face à l'accent, un avertissement non bloquant s'affiche sous le champ.

### UJ-3. Claire, prof d'histoire-géo, prépare la carte des alliances de la Guerre froide.

1. [Assistant] Template « Alliances », Date de référence 1968. Factions OTAN et Pacte de Varsovie.
2. [Outil Sélection + panneau] Elle assigne les pays en un clic sur leur pastille de Faction (FR-13). Pour les adhésions tardives, elle crée des Sous-factions à teinte plus claire.
3. [Panneau Territoire] Motif « Hachures » pour l'Albanie. La Suède, la Finlande et la Yougoslavie restent neutres, au style neutre par défaut.
4. [Carte] Le Template a désactivé la Ligne de front : rien ne s'affiche sur le rideau de fer. La section Relations du panneau Projet indique « aucune Faction en conflit ».
5. [Carte] La Légende s'est générée toute seule (P1).
6. [Modale Export · Image] PNG de l'instant courant, pour son diaporama (P1).
7. [Modale Export · Vidéo] Plage des Étapes 1949 → 1968.
8. **Climax :** une Carte propre et lisible, comparable à celles des manuels (`imports/ref-guerre-froide-alliances.png`), sans rien dessiner.

**Cas limite :** les libellés de pays sont en anglais. Elle sélectionne un libellé et le renomme dans le panneau (FR-9, P1). La langue des libellés reste ouverte (Q4).

### UJ-4. Hugo, passionné de wargame, reconstitue la percée de Normandie à partir d'une vieille carte.

1. [Accueil → Assistant] « Carte vierge », Région Normandie, Date de référence 1944.
2. [Carte] Il glisse-dépose son scan. Dans le panneau de l'image, « Utiliser comme fond » (P1), puis il la cale à la main : position, échelle, rotation, opacité.
3. [Outil Territoire + Timeline] Il trace les Territoires alliés aux Étapes du 6 juin, du 12 juin et du 25 juillet.
4. [Panneau Ligne de front] « Garder la trace » : les Traces de front restent visibles avec leur date (P2 ; place réservée).
5. [Outil Flèche] Grosses Flèches de percée. [Panneau Flèche] Catégorie de flèche « Percée » (rouge) ou « Réduction de la poche » (bleu) (P2 ; en P0/P1, la Flèche prend le style de sa Faction).
6. [Outil Jeton] Jetons d'unité à drapeau avec étiquette encadrée (« 7 C. », « 1 Ar. ») ; [outil Texte] étiquettes de commandement (« Gal Bradley »).
7. [Panneau Projet] Fond parchemin.
8. **Climax :** en Mode présentation, l'animation a l'esthétique vintage qu'il aime (`imports/ref-normandie-1944-vintage.webp`), et les fronts avancent tout seuls.

**Cas limite :** il ferme l'onglet par erreur. En rouvrant OPENMAP, l'Accueil montre son Projet en tête. Il l'ouvre dans l'état d'il y a quelques secondes au plus (NFR-5), sans dialogue de récupération.

## Open Questions & Assumptions

**Hypothèses posées dans ce fichier**
- `[ASSUMPTION]` shadcn/ui retenu comme UI system.
- `[ASSUMPTION]` Thème par défaut : préférence système.
- `[ASSUMPTION]` Emplacements : recherche de lieu dans la barre haute ; Compteur et Horodatage sous l'outil Texte ; Icônes par la Bibliothèque ; Légende dans les paramètres du Projet ; Relations dans la section Factions ; FR-11 derrière « Plus d'options » d'une Entité ; FR-49 par Import ; Calques dans l'emplacement du tiroir ; Fichier projet sur l'Accueil et dans le menu de l'Éditeur.
- `[ASSUMPTION]` Le tiroir recouvre la scène sans recadrer la Carte.
- `[ASSUMPTION]` Éditer avec la tête de lecture en pleine transition la cale sur l'Étape d'arrivée.
- `[ASSUMPTION]` Affichage de l'héritage d'Étape en texte (« Défini à cette Étape » / « Hérité de … »), sans losanges d'images clés.
- `[ASSUMPTION]` « Appliquer à toutes les Étapes » est un lien qui suit la modification, pas un sélecteur de portée permanent.
- `[ASSUMPTION]` Repères de valeurs propres sous les vignettes pour l'élément sélectionné.
- `[ASSUMPTION]` Date proposée pour une nouvelle Étape ; suppression d'Étape sans dialogue, avec « Annuler ».
- `[ASSUMPTION]` Durées de transition réglables en tirant le bord du bloc hachuré.
- `[ASSUMPTION]` Icônes d'événement sur la piste Jetons.
- `[ASSUMPTION]` Templates du tiroir dans l'Éditeur : ils ouvrent un nouveau Projet via l'Assistant.
- `[ASSUMPTION]` Export bloquant dans la modale ; nom de fichier ; messages d'échec.
- `[ASSUMPTION]` Durées et file d'attente des toasts ; pas de toast à chaque sauvegarde automatique.
- `[ASSUMPTION]` Mémorisation de l'état « Plus d'options » par type de panneau.
- `[ASSUMPTION]` Comportement hors ligne et avertissement de tuiles manquantes à l'export.
- `[ASSUMPTION]` Bandeau Firefox ; message mobile bloquant ; comportement sous 1366 px ; poignée et repli de la Timeline.
- `[ASSUMPTION]` Liste des raccourcis, historique d'annulation non persistant, `F6` entre zones, alternatives clavier au dessin.
- `[ASSUMPTION]` Libellé « Présentation » au lieu d'« Aperçu » (planches), pour coller au Glossaire.
- `[ASSUMPTION]` Équivalents anglais du Glossaire.
- `[ASSUMPTION]` « Carte vierge » passe quand même par les écrans 2 à 4 de l'Assistant, tous passables.
- `[ASSUMPTION]` Suppression d'un Projet avec « Annuler » plutôt qu'un dialogue ; Réglages en dialogue à onglets.
- `[ASSUMPTION]` Consentement télémétrie en dialogue au premier lancement, avec deux boutons de même poids.

**Notes pour l'UX**
- `[NOTE FOR UX]` Comportement exact quand on édite avec la tête de lecture en pleine transition.
- `[NOTE FOR UX]` Découvrabilité d'« Appliquer à toutes les Étapes » : lien contextuel ou sélecteur de portée ? À tester avec 3 à 5 créateurs (PRD §12).
- `[NOTE FOR UX]` Hauteur de Timeline par défaut (280 px) à 1366 × 768 (voir DESIGN.md).
- `[NOTE FOR UX]` Peut-on décocher « Crédit dans l'export » quand la licence l'exige (FR-10) ?

**Contrôle de fermeture de l'IA**
- Toutes les FR P0 et P1 ont une surface (voir les tableaux de l'IA). Plusieurs emplacements ne viennent pas du log mais d'hypothèses (liste ci-dessus) : ils sont à confirmer.
- **Lacune** : le rôle de l'onglet Templates du tiroir *dans l'Éditeur* n'est pas défini. Un Projet contient une seule Carte, et FR-3 ne dit rien de l'application d'un Template à un Projet existant.
- **Lacune** : la PRD ne prévoit aucune entrée de création dédiée pour la Légende, le Compteur, l'Horodatage et les Icônes d'événement, et le rail validé n'en montre pas. Les emplacements retenus sont des hypothèses.
- **Surfaces sans parcours** : aucun UJ n'atterrit sur Réglages, le Mode présentation (hormis le climax d'UJ-4) ou l'import de Fichier projet. Ces surfaces se justifient par des besoins énoncés (FR-58, FR-16, FR-57, FR-54, décisions de thème et de langue du log).
- **Parcours qui dépendent du P2** : UJ-4 s'appuie sur FR-27 (Traces de front) et FR-29 (Catégories de flèche). Leurs surfaces sont réservées dans le panneau, mais il n'y a rien à livrer avant P2.
- **Questions produit ouvertes** : langue des libellés de Carte (PRD Q4) ; confirmation de shadcn/ui ; palettes des Fonds autres que parchemin (DESIGN.md).
