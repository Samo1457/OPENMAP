---
title: OPENMAP — EXPERIENCE
status: final
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

Ce fichier définit *comment ça marche*. Pour *à quoi ça ressemble*, voir `DESIGN.md`, référencé par tokens `{path.to.token}`. Les exigences produit (FR, NFR, UJ) restent dans la PRD : elles sont citées ici, pas recopiées. Le vocabulaire est celui du Glossaire de la PRD (§3), employé tel quel. **Ce spine l'emporte** en cas de conflit avec les maquettes de `mockups/`, les planches de `.working/` ou les images de `imports/`.

Maquettes clés : [`mockups/editeur.html`](mockups/editeur.html) (Éditeur, UJ-2), [`mockups/assistant.html`](mockups/assistant.html) (Assistant, écran Factions, UJ-1) et [`mockups/export.html`](mockups/export.html) (modale Export, UJ-1). Planches d'exploration : `.working/directions-1.html` (hybride 01 + Timeline 03) et `.working/color-themes-1.html` (variation 02) ; `.working/key-*.html` ne sont que les sources d'origine des maquettes.

## Foundation

- **Form factor** : application web **desktop PC uniquement**, dans les limites de NFR-4 et NFR-8 (voir Responsive & Platform). Pas de mobile, pas de tablette, pas d'application de bureau (PRD §7).
- **Posture** : produit grand public destiné aux créateurs, avec un lancement public possible. Sans compte : tout reste dans le navigateur (NFR-6).
- **UI system** : shadcn/ui fortement personnalisé (confirmé par l'utilisateur). Ce spine ne décrit que l'écart de comportement par rapport à shadcn. Dialog, Popover, DropdownMenu, ContextMenu, Tabs, Tooltip et Sonner gardent leur comportement par défaut (focus trap, navigation aux flèches), sous réserve des priorités clavier d'Interaction Primitives.
- **Identité visuelle** : `DESIGN.md`.
- **Thèmes** : clair et sombre. `[ASSUMPTION: au premier lancement, OPENMAP suit la préférence système ; l'utilisateur peut ensuite choisir dans Réglages.]` Le thème ne touche que le chrome, jamais la Carte (voir « Carte vs chrome »).
- **Langues de l'interface** : français et anglais en v1. La langue des libellés de Carte reste ouverte (PRD Q4).
- **Direction d'expérience** : « façon Canva, voire CapCut » : dense mais simple à prendre en main, aérée, rassurante. Divulgation progressive par défaut (NFR-9).

## Information Architecture

| Surface | Atteinte depuis | Rôle | FR livrées |
|---|---|---|---|
| **Accueil** | Ouverture d'OPENMAP ; « Projets » dans la barre haute | Liste des Projets, Nouveau Projet, import de Fichier projet, consentement télémétrie au 1er lancement, bandeau de stockage | FR-1, FR-52, FR-53 (signal), FR-54, FR-58 |
| **Assistant** (4 écrans) | Accueil → « Nouveau Projet » | 1 Template · 2 Date de référence · 3 Région · 4 Factions | FR-1, FR-2, FR-3, FR-6, FR-8 (Région), FR-13, FR-15 (Kits auto) |
| **Éditeur** | Fin de l'Assistant ; ouverture d'un Projet | Composer et animer la Carte | voir le détail des zones ci-dessous |
| **Mode présentation** | Barre haute → « Présentation » ; `P` | Plein écran, caméra de la Timeline, rendu identique à l'export | FR-41, FR-57, NFR-1 |
| **Modale Export** | Barre haute → « Exporter » ; `Ctrl+E` | Vidéo ou image, plage, fps, crédit, progression, annulation | FR-10, FR-50, FR-51 |
| **Réglages** | Menu de la barre haute (Accueil et Éditeur) | Thème, langue, télémétrie, Kits personnels, stockage | FR-16, FR-53, FR-58 |
| **Message « conçu pour ordinateur »** | Toute URL ouverte sur mobile ou tablette | Explique la limite de plateforme | NFR-4 |

**Zones de l'Éditeur**

| Zone | Contenu | FR livrées |
|---|---|---|
| Barre haute | Fil « Projets / {nom} », statut de sauvegarde, Format de sortie, annuler/rétablir, recherche de lieu, Présentation, Exporter, menu (Fichier projet, Réglages) | FR-8, FR-50 (format), FR-53, FR-54, FR-55, FR-57 |
| Rail d'outils (libellé) | Sélection · Territoire · Conquête · Flèche · Jeton · Texte · Import, puis Bibliothèque · Calques | FR-13, FR-18 à FR-21, FR-28, FR-30, FR-31, FR-34, FR-36, FR-37, FR-48, FR-49, FR-56 |
| Tiroir Bibliothèque | Templates · Kits (Bibliothèque / Kits personnels) · Emblèmes · Icônes d'événement | FR-3, FR-15, FR-16, FR-32 |
| Carte (scène) | Canevas, barre d'options de l'outil, masque hors cadre, zoom, toasts, menu contextuel | FR-5, FR-7, FR-9, FR-13, FR-18 à FR-25, FR-28 à FR-37, FR-47 |
| Panneau de propriétés (contextuel) | Rien de sélectionné : **paramètres du Projet**. Sinon : l'élément, la Faction (Kit), l'Étape ou la sélection multiple | FR-5, FR-6, FR-9 à FR-14, FR-16, FR-17, FR-22 à FR-25, FR-35, FR-39, FR-42, FR-45 à FR-47, FR-49 |
| Timeline (à pistes, repliable) | Actes, vignettes d'Étape, transitions, pistes Flèches / Jetons / Texte, tête de lecture | FR-39 à FR-41, FR-43, FR-45 |

Emplacements non tranchés par le log, posés par défaut `[ASSUMPTION]` :
- Recherche de lieu (FR-8) dans la barre haute. Relations (FR-22) dans la section Factions des paramètres du Projet.
- Assignation d'une Entité géographique à une Faction hors Conquête (FR-13, FR-18) : outil Territoire, ou Sélection + sélecteur de Faction du panneau, ou menu contextuel de la Carte.
- Compteur (FR-36) et Horodatage (FR-37) créés depuis l'outil Texte ; Série de Jetons (FR-31) depuis l'outil Jeton ; Icônes d'événement (FR-32) depuis la Bibliothèque.
- Légende (FR-35) : visibilité dans les paramètres du Projet, édition en la sélectionnant sur la Carte.
- Correction de données (FR-11) : Entité géographique sélectionnée, puis « Plus d'options ». Carte personnelle en fond (FR-49) : panneau de l'image importée, « Utiliser comme fond ».
- Calques (FR-56) dans l'emplacement du tiroir. Fichier projet (FR-54) : import et export sur l'Accueil, export dans le menu de l'Éditeur.
- Templates du tiroir dans l'Éditeur : « Nouveau Projet depuis ce Template » ouvre l'Assistant prérempli (un Projet contient une seule Carte).

Profondeur des modales : un seul niveau. Seule exception, une confirmation au-dessus de Réglages ou de l'Export.

**Couverture des maquettes.** Maquettées : l'Éditeur ([`mockups/editeur.html`](mockups/editeur.html) : sombre, clair, tiroir Bibliothèque, et **état (d), hauteur de Timeline retenue**), l'Assistant écran 4 « Factions » ([`mockups/assistant.html`](mockups/assistant.html)) et la modale Export, rendu en cours et terminé ([`mockups/export.html`](mockups/export.html)). Construites à partir des spines seuls (choix de l'utilisateur) : Accueil et consentement télémétrie, Mode présentation, Réglages, mode conquête au pinceau, panneau de Sous-faction, paramètres du Projet, et les outils de Carte ci-dessous.

## Carte vs chrome

La Carte, c'est le contenu exporté. Le chrome, c'est l'outil. Six règles les séparent.

1. **La Carte ne suit pas le thème.** En clair comme en sombre, la Carte, ses Fonds, ses Factions et ses libellés sont identiques pixel pour pixel. Seul le chrome change. Un Fond sombre n'est pas le mode sombre : c'est un choix de contenu.
2. **L'accent UI n'entre jamais sur la Carte.** Sélection, survol, poignées, curseur de pinceau, sélection en attente de la conquête et point d'origine de propagation s'affichent en `{colors.canvas-ink}` + `{colors.canvas-halo}` (voir `DESIGN.md` → Canevas).
3. **Pas de cadre décoratif.** La limite du cadre d'export se lit uniquement à l'assombrissement de la Carte hors cadre (`export-frame-mask`). En Mode édition, la caméra est libre et la Carte continue au-delà du cadre.
4. **Ce que montre le cadre, c'est l'export.** À tout instant de la Timeline, l'intérieur du cadre montre l'image exportée à cet instant (FR-41, NFR-1). Seules les surimpressions d'édition s'y ajoutent, et elles disparaissent en Mode présentation et à l'export.
5. **Le chrome ne recouvre pas le cadre.** Toasts en bas à droite de la scène, barre d'options en bande de `{spacing.tool-options-bar-height}` au-dessus de la Carte, zoom en bas à gauche. Seuls le tiroir Bibliothèque ([état c](mockups/editeur.html#etat-c)) et les contrôles du Mode présentation, qui s'effacent, recouvrent la Carte.
6. **Les couleurs de Faction sont du contenu.** Le chrome ne les réutilise jamais. Elles n'apparaissent dans le chrome que sous forme de pastilles nommées. Un garde-fou prévient quand une couleur de Kit s'approche de l'accent UI (`DESIGN.md` → Garde-fou couleur de Faction).

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
| **Existence / persistance** (FR-45) | Un élément de piste est un clip qui court de son Étape de création à la fin de la Timeline. On limite sa plage en tirant la fin du clip, ou avec le champ « Visible de … à … » du panneau. Les Territoires et la Légende n'ont pas de clip. |
| **Appartenance** | Assigner une Entité géographique à une Faction (outil Territoire, sélecteur de Faction, Conquête) la retire de son Territoire précédent à l'Étape courante. Une Zone dessinée l'emporte sur les Entités qu'elle recouvre. |
| **Nouvelle Étape** (FR-40) | « + Étape » à la fin des vignettes, ou `Ctrl+D` sur une Étape pour la dupliquer. La nouvelle Étape part de l'état de l'Étape précédente et devient l'Étape courante. Date proposée : la précédente, plus le même intervalle. `[ASSUMPTION]` |
| **Supprimer une Étape** | Pas de dialogue. Toast « Étape 1463 supprimée · Annuler ». Les Étapes suivantes reprennent la valeur de l'Étape précédente (FR-40). |
| **Kit de Faction** (FR-12) | Il n'est pas soumis aux Étapes. L'éditeur de Kit l'annonce en tête : « S'applique à toute la Timeline ». |
| **Date de référence** vs **Date d'Étape** | La Date de référence vit dans les paramètres du Projet, et la changer demande confirmation (FR-6). La Date d'Étape se règle dans le panneau d'une Étape et sur sa vignette. Leurs libellés restent toujours distincts. |

## Voice and Tone

La voix de marque vit dans `DESIGN.md` → Brand & Style. Ici, les règles de microcopie :

- **Glossaire verbatim**, avec la majuscule, y compris dans les libellés : Projet (« Nouveau Projet »), Carte, Étape, Territoire, Kit de Faction, Sous-faction (« Ajouter une Sous-faction »), **Kits personnels** (jamais « Mes Kits »), Timeline, Fond de carte, Région, Date de référence… Jamais de synonyme : on n'écrit pas « scène », « keyframe » ou « thème de faction ».
- **Français** : vouvoiement, impératif pour les consignes (« Glissez sur la Carte pour peindre la conquête. »), phrases courtes et complètes, typographie française (guillemets « », espace insécable avant « : ; ? ! », virgule décimale : `1,5 s`, `00:08,4`).
- **Anglais** : même structure, ton direct, *sentence case*. `[ASSUMPTION: équivalents EN du Glossaire à valider : Step, Territory, Faction Kit, Sub-faction, Personal kits, Timeline, Basemap, Region, Reference date, Step date, Library, Act, Front line, Pocket, Unit token, Token series, Event icon, Counter, Timestamp, Legend, Camera preset, Organic signature, Output format, Project file.]`
- Les messages d'état disent **où en sont les données de l'utilisateur**, jamais « Erreur » tout court. Pas de point d'exclamation, pas d'emoji, pas d'encouragement.
- Les boutons portent un verbe, plus un objet si besoin : « Exporter », « Valider la conquête », « Ajouter une Sous-faction ». Un libellé ne promet jamais ce que le navigateur ne peut pas faire.
- Dates avant notre ère : « 52 av. J.-C. » / « 52 BC ».

| Contexte | FR | EN | À éviter |
|---|---|---|---|
| Sauvegarde | « Enregistré » · « Projet sauvegardé — Sur cet appareil · à l'instant » | "Saved" · "Project saved — On this device · just now" | « Sauvegarde réussie ! ✓ » |
| Conquête | « Glissez sur la Carte pour peindre la conquête. La Faction active est « Empire ottoman ». » | "Drag on the map to paint the conquest. Active Faction: Ottoman Empire." | « Mode pinceau activé » |
| Compte avant validation | « 12 Entités sélectionnées » | "12 entities selected" | « 12 items » |
| Assignation | « 5 Entités assignées à OTAN · Annuler » | "5 entities assigned to NATO · Undo" | « Mise à jour effectuée » |
| Kit | « Copie propre au Projet » · « Hérite · couleur surchargée » | "Project copy" · "Inherits · colour overridden" | « Kit cloné » |
| Garde-fou Faction | « Cette couleur est proche de celle de l'interface. Elle restera lisible sur la Carte, mais peut prêter à confusion dans les listes. » | "This colour is close to the interface accent…" | « Couleur invalide » |
| Stockage | « Stockage presque plein. Exportez un Fichier projet pour ne rien perdre. » | "Storage almost full. Export a project file to keep your work safe." | « Quota exceeded » |
| Autre onglet | « Ce Projet est ouvert dans un autre onglet. Vous le consultez en lecture seule. » · « Reprendre ici » | "This project is open in another tab. You are viewing it read-only." · "Take over here" | « Conflit détecté » |
| Satellite indisponible | « Le Fond satellite est indisponible. La Carte utilise le Fond sombre. » | "Satellite basemap unavailable. Using the dark basemap." | « Erreur 503 » |
| Tuiles manquantes | « Certaines tuiles de la Carte n'ont pas pu être chargées (Étapes 3 à 5). Si vous continuez, ces zones garderont le fond uni du Fond. » | "Some map tiles could not be loaded (steps 3 to 5)…" | « Tiles error » |
| Export annulé | « Export annulé. Rien n'a été enregistré. » | "Export cancelled. Nothing was saved." | — |
| Export terminé | « Export terminé » · « Le fichier est dans vos téléchargements. » · « Télécharger de nouveau » · « Exporter à nouveau » | "Export complete" · "The file is in your downloads." · "Download again" · "Export again" | « Ouvrir le dossier », « Afficher le téléchargement » (le navigateur ne le permet pas), « Bravo ! » |
| Crédit obligatoire | « Obligatoire : la licence du Fond satellite demande ce crédit. Vous choisissez sa position et sa discrétion. » | "Required: the satellite basemap licence asks for this credit. You choose its position and how discreet it is." | « Crédit non modifiable », « Obligatoire » seul, sans raison |
| Suppression | « Supprimer l'Étape » → toast « Étape 1463 supprimée · Annuler » | "Delete step" → "Step 1463 deleted · Undo" | « Êtes-vous sûr ? » |
| Données approximatives | « Données les plus proches : 1454 » | "Nearest available data: 1454" | — |
| Télémétrie | « Aider à améliorer OPENMAP en envoyant des statistiques d'usage anonymes ? Le contenu de vos Projets ne quitte jamais votre ordinateur. » | "Help improve OPENMAP with anonymous usage statistics? Your project content never leaves your computer." | Case précochée, formulations culpabilisantes |

## Component Patterns

Comportements. Les specs visuelles sont dans `DESIGN.md` → Components, sous le même nom.

| Composant | Où | Règles de comportement |
|---|---|---|
| **Rail d'outils** | Éditeur, à gauche | Un seul outil actif. Clic ou raccourci pour l'activer ; `Échap` finit par revenir à Sélection (ordre d'`Échap` : Interaction Primitives). Chaque item a une icône et un libellé visible ; son infobulle donne le nom complet et le raccourci (« Jeton d'unité · J »). L'outil actif configure la barre d'options et, s'il y a lieu, le panneau. Bibliothèque et Calques ne sont pas des outils : ce sont des bascules de tiroir, actives tant que le tiroir est ouvert. |
| **Barre d'options de l'outil** | Au-dessus de la Carte | Rappelle l'Étape courante, puis les réglages essentiels de l'outil actif (voir Outils de Carte). Porte aussi les liens contextuels (« Appliquer à toutes les Étapes », « Valider la conquête ») et, à droite, le libellé du Format de sortie en lecture seule. |
| **Panneau de propriétés** | Éditeur, à droite | Toujours visible. Contenu selon la sélection (voir Panneau par type de sélection). Les modifications s'appliquent en direct, sans bouton « Appliquer ». |
| **« Plus d'options »** | Bas de chaque section et du panneau | Tout panneau n'expose d'abord que l'essentiel (NFR-9). La rangée résume ce qu'elle cache et se déplie sur place, en accordéon. L'état déplié est mémorisé par type de panneau pendant la session. `[ASSUMPTION]` Tout nouveau réglage entre par défaut derrière « Plus d'options » (SM-C1). |
| **Éditeur de Kit de Faction** | Panneau, dès qu'une Faction est sélectionnée (pastille, liste des Factions) | En-tête : Emblème, nom, origine (« Copie propre au Projet · depuis la Bibliothèque »), « S'applique à toute la Timeline ». Sections : Couleurs (remplissage, contour, sélection ; `color-field`), Emblème & police, Signature organique (Désactivée · Légère · Marquée · Par défaut du Projet), Sous-factions (rangées résumées ; « Ajouter une Sous-faction »). Derrière « Plus d'options » : Frontière, Flèche, Jeton, remplissage par drapeau (P1). Chaque champ s'applique immédiatement partout (FR-12). Menu du Kit : « Enregistrer dans les Kits personnels » et « Mettre à jour depuis les Kits personnels » (P1, FR-16). |
| **Champ hérité / surchargé** (`field-inherited`, `field-overridden`) | Panneau de la Sous-faction ; panneau d'un élément (héritage d'Étape) | Le Kit parent ne montre qu'une rangée résumée par Sous-faction (`subfaction-row`) ; l'état champ par champ vit dans le panneau de la Sous-faction. Hérité : « Hérité de Empire ottoman » et la valeur du parent. Modifier un champ hérité le surcharge ; « Rétablir » le fait suivre de nouveau le parent (FR-14). En tête : « 1 champ surchargé » et un lien vers le parent. |
| **Garde-fou couleur de Faction** | Sous le `color-field` du Kit | Recalculé à chaque changement. Sous ΔE 10 face à l'accent de l'un ou l'autre mode, avertissement non bloquant sous le champ, jamais en toast. |
| **Champ couleur** (`color-field`) | Kit, Texte, réglage « Teinte » du Fond | Saisie hex directe (`#` facultatif, 3 ou 6 chiffres) ; valeur invalide : le champ garde l'ancienne valeur et affiche « Saisissez une couleur au format #RRGGBB. » Clic sur la pastille : popover avec zone saturation/valeur, teinte, pipette (si le navigateur la fournit) et « Couleurs du Projet ». Application en direct ; un glisser = un seul pas d'annulation. |
| **Slider** | Taille de pinceau, épaisseur, opacité, réglages du Fond | Toujours couplé à un champ numérique avec unité. Clavier : `←` / `→` un pas, `Maj` dix pas, `Début` / `Fin` bornes. Double-clic sur le curseur : valeur par défaut. Un glisser = un pas d'annulation. Pas : 1 px d'export ou 1 %. |
| **Sélecteur de Faction** (`faction-picker`) | Panneau (Entité, Territoire, Zone, Flèche, Jeton…), barre d'options | Une pastille par Faction du Projet, plus « Neutre » et « + Faction » (ouvre le tiroir sur Kits). Un clic applique tout de suite à toute la sélection. Clavier : `radiogroup`, un seul arrêt de tabulation, flèches puis `Espace`. Sélection mixte : aucune pastille choisie, « Plusieurs Factions ». Dans la barre d'options : version compacte (Faction active + menu). |
| **Assigner une Entité à une Faction** (hors Conquête) | Outil Sélection + panneau ; menu contextuel ; outil Territoire | Trois chemins, même résultat : l'Entité géographique rejoint le Territoire de la Faction choisie **à l'Étape courante** (portée §4.0), sans sélection en attente ni validation. 1) **Sélection + panneau** : clic sur une Entité (`Maj` + clic ou rectangle pour plusieurs) ; le panneau « Entité géographique » (ou « 5 Entités ») s'ouvre sur le sélecteur de Faction ; un clic sur une pastille assigne toutes les Entités sélectionnées, « Neutre » les retire de tout Territoire. 2) **Menu contextuel** (clic droit, touche Menu ou `Maj+F10` sur la sélection) : « Assigner à » → Factions et « Neutre ». 3) **Outil Territoire**, mode Entités, pour enchaîner les clics. Clavier : recherche de lieu (`/`) puis « Sélectionner », `Alt+5` vers le panneau, sélecteur de Faction. Un `Ctrl+Z` annule ; toast et annonce polie « 5 Entités assignées à OTAN · Annuler ». `[ASSUMPTION]` |
| **Relations** | Paramètres du Projet → Factions et Relations | Une rangée par **paire** de Factions (« Russie · Ukraine ») : contrôle segmenté « En conflit · Alliées · Sans lien » et case « Afficher la Ligne de front » pour cette paire (FR-23). Au-delà de 6 paires, seules les paires qui diffèrent des défauts de FR-22 restent visibles ; les autres sont derrière « Toutes les paires (n) ». `[ASSUMPTION]` |
| **Sélecteur de Fond** (`basemap-picker`) | Paramètres du Projet → Fond de carte | Clic sur une tuile : le Fond change tout de suite, sans toucher aux éléments (FR-5) ; annulable. Dessous : sliders Luminosité, Saturation et Teinte (couleur + intensité), et « Rétablir les réglages du Fond » (bornes et défauts : `DESIGN.md` → Carte). Satellite indisponible : tuile désactivée avec « Réessayer ». |
| **Caméra d'Étape** (FR-46, FR-47) | Panneau Étape, section Caméra | `Select` Preset : Cadrage automatique (défaut) · Vue du dessus · Fly-to · Orbit · Sweep · Bounce. **Cadrage manuel** : « Utiliser la vue actuelle » copie la caméra d'édition (centre, zoom, rotation) dans le cadre de l'Étape, et le Preset affiche « Cadrage manuel ». Champs Zoom (%) et Rotation (−180° à 180°) pour affiner. « Voir le cadrage » amène la caméra d'édition sur ce cadre ; « Revenir au Preset » efface le cadrage manuel. La caméra d'édition tourne avec `Maj` + molette. `[ASSUMPTION]` |
| **Choix exclusifs** | Partout | Contrôle segmenté, jamais de boutons radio ronds. Un clic choisit ; au clavier, un seul arrêt de tabulation et `←` / `→` déplacent le choix (`radiogroup`). Au-delà de 4 options, un `Select`. |
| **Tiroir Bibliothèque** | Rail → Bibliothèque ; `B` | S'ouvre contre le rail, pleine hauteur, sans quitter l'Éditeur ni recadrer la Carte ([état c](mockups/editeur.html#etat-c)). L'outil actif le reste. Onglets : Templates · Kits · Emblèmes · Icônes d'événement. Recherche avec filtres Ère, région du monde et type (FR-3, FR-15). Kits : segmenté « Bibliothèque · Kits personnels » (P1) ; clic sur un Kit → « Appliquer à {Faction sélectionnée} » ou « Ajouter comme nouvelle Faction », qui créent une copie propre au Projet (FR-13). Emblèmes et Icônes : glisser sur la Carte, ou clic pour poser au centre du cadre. Se ferme avec `Échap`, le bouton du rail ou la croix. |
| **Recherche de lieu** | Barre haute ; `/` | Champ avec suggestions (pays, ville, Entité géographique). `Entrée` centre la caméra d'édition sur le lieu, sans toucher aux Presets (FR-8). Une suggestion d'Entité propose aussi « Sélectionner ». |
| **Format de sortie** | Barre haute ; paramètres du Projet | Menu 16:9 · 9:16 · 1:1. Un changement recalcule les cadrages (FR-50). Toast : « Cadrages recalculés pour 9:16 · Annuler ». |
| **Toasts** | Bas droite de la scène | Un seul visible à la fois, les suivants en file. Information : 4 s ; avec action (« Annuler ») : 8 s ; erreur : jusqu'à fermeture. `[ASSUMPTION]` Jamais au-dessus du cadre d'export. Pas de toast à chaque sauvegarde automatique : « Projet sauvegardé » ne paraît qu'après `Ctrl+S` ou à la première sauvegarde d'un nouveau Projet. `[ASSUMPTION]` |
| **Bandeaux** (`banner-warning`, `banner-info`) | Sous la barre haute (Accueil, Éditeur) | États durables : stockage, hors ligne, navigateur, lecture seule. Une action au plus ; masquables pour la session, sauf la lecture seule. |
| **Assistant** | Dialogue plein cadre depuis l'Accueil ; [rendu de l'écran 4](mockups/assistant.html) | 4 écrans, avec « 1 / 4 », Retour, Passer, Suivant, et « Créer la Carte » au dernier. « Passer » garde les valeurs du Template (FR-2). Écran 1 : « Carte vierge » en premier, puis la grille de Templates filtrable, avec vignette animée au survol. Écran 2 : année, bascule « av. J.-C. », et « Données les plus proches : … » si la date n'est pas exacte. Écran 3 : recherche de Région, avec un aperçu qui la cadre. Écran 4 : Factions suggérées avec leur Kit ; une Faction sans Kit officiel reçoit une couleur distincte ; colonne « Dans ce Projet ». « Carte vierge » passe aussi par les écrans 2 à 4, tous passables. `[ASSUMPTION]` |
| **Accueil et liste des Projets** | Accueil | Cartes de Projet (`project-card`) du plus récent au plus ancien. Clic ou `Entrée` : ouvrir dans l'Éditeur. Menu (bouton de la carte, clic droit, `Maj+F10`) : Renommer (sur place), Dupliquer, Exporter le Fichier projet, Supprimer (toast « Projet supprimé · Annuler » ; suppression définitive à la fermeture du toast). « Nouveau Projet » ouvre l'Assistant ; « Importer un Fichier projet » ouvre le sélecteur de fichiers ; déposer un Fichier projet n'importe où sur l'Accueil l'importe (FR-52, FR-54). `[ASSUMPTION]` |
| **Réglages** | Menu de la barre haute | Dialogue à onglets : Apparence (Système · Clair · Sombre), Langue (Français · English, sans rechargement), Confidentialité (bascule de télémétrie et ce qui est envoyé ou non, FR-58), Kits personnels (liste, renommer, supprimer, importer ou exporter en fichier, P1), Stockage (espace utilisé, stockage persistant, rappel d'exporter les Fichiers projet). Changements immédiats. `[ASSUMPTION: Réglages en dialogue plutôt qu'en page]` |
| **Calques** (P1) | Rail → Calques | Liste par nature (Territoires, Flèches, Jetons, textes, médias) avec œil (masquer), cadenas (verrouiller) et glisser pour réordonner (FR-56). |
| **Mode présentation** | `P` ; bouton « Présentation » | Plein écran, lecture depuis la tête de lecture, caméra de la Timeline. Contrôles (`presentation-controls`) : lecture/pause, progression, minutage, « Quitter la présentation » ; ils s'effacent 2 s après le dernier mouvement de souris et reviennent au mouvement ou à `Tab` ; jamais à l'export. `Espace` : lecture/pause ; `Échap` : retour à l'Éditeur, à l'instant atteint. Fin de Timeline : arrêt sur la dernière image, contrôles affichés, « Rejouer ». `[ASSUMPTION: pas de boucle]` |

### Outils de Carte

Geste commun de **Tracé** et règles de sélection : voir Interaction Primitives. Chaque création s'applique à l'Étape courante et s'annule en un `Ctrl+Z`.

| Outil | Barre d'options | Geste et validation | Résultat (Carte, panneau, piste) |
|---|---|---|---|
| **Territoire** (`T`, FR-18, FR-19) | Faction active (compacte ; dernière utilisée), segmenté **Entités · Zone dessinée** ; en Zone : « Main levée · Points » | **Entités** (défaut) : survol en `canvas-hover` ; clic = l'Entité rejoint la Faction active, sans validation ; `Alt` + clic la rend neutre. **Zone dessinée** : Tracé ; la Zone fermée rejoint le Territoire de la Faction active. Modifier une Zone : outil Sélection, glisser ses points, double-clic sur le contour pour ajouter un point, `Suppr` pour retirer le point choisi. | Même résultat qu'une conquête ; seule la manière diffère (clic unitaire immédiat contre peinture puis validation). La transition suit FR-39. Panneau Territoire ou Zone dessinée. Pas de clip. |
| **Conquête** (`C`, FR-20, FR-21) | **Faction attaquante** (dernière utilisée, sinon la première Faction non neutre), segmenté **Entités · Peinture libre**, taille de pinceau (`[` et `]`) | Glisser peint une sélection *en attente* (`canvas-pending`), avec « 12 Entités sélectionnées » (FR-20). `Alt` + glisser retire des Entités. « Valider la conquête » (`Entrée`) applique à l'Étape courante ; `Échap` abandonne. Rien ne se lance tout seul après validation. | Quand la Région n'a pas de subdivisions, la barre d'options le signale et propose la Peinture libre (FR-7, P1). La Peinture libre ajoute une Zone dessinée (FR-21). |
| **Flèche** (`F`, FR-28) | Faction (défaut : Faction active ; sans Faction, `{colors.map-arrow}`), épaisseur (slider, `[` et `]`) | Tracé par points : la courbe passe par les points, lissée. Double-clic ou `Entrée` termine (2 points au moins) ; `Retour arrière` retire le dernier point ; `Échap` annule. L'outil reste actif. | Clip sur la piste Flèches. La Flèche se dessine de l'origine à la tête pendant la transition d'entrée de son Étape (sur la première Étape : pendant la première seconde du maintien `[ASSUMPTION]`). Points modifiables par Étape. |
| **Jeton** (`J`, FR-30) | Faction, forme (segmenté à icônes : OTAN simplifié · Carré bicolore · Badge rond à drapeau · Mini-drapeau ; défaut : forme du Kit), segmenté **Jeton · Série** (Série : P1) | Clic : pose un Jeton centré sur le point ; le focus passe au champ Étiquette du panneau (`Entrée` valide, `Échap` laisse vide) ; l'outil reste actif. Déplacer : glisser. Orienter : poignée de rotation au-dessus du Jeton (`Maj` : pas de 15°) ou champ Rotation. | Clip sur la piste Jetons. Position et rotation suivent §4.0 ; pendant la transition, le Jeton glisse et pivote de l'ancien état au nouveau (FR-30). |
| **Série de Jetons** (P1, FR-31) | Outil Jeton en mode Série : Faction, forme, « Inverser le côté » | Survol d'une Ligne de front ou d'un contour de Territoire : `canvas-hover` sur le tracé. Clic : la Série s'y attache, du côté du clic. `Échap` annule. | Un seul clip « Série · 14 Jetons » sur la piste Jetons. Quand le tracé change à une Étape, la Série se redistribue pendant la transition. |
| **Texte** (`X`, FR-34) | Segmenté **Texte · Compteur · Horodatage** (P1 pour les deux derniers), police, taille, cadre | Clic : pose un texte et ouvre la saisie sur la Carte ; glisser : zone de largeur fixe. `Échap` ou clic ailleurs termine ; un texte vide est supprimé. Double-clic sur un texte (outil Sélection) le rouvre en saisie. | Clip sur la piste Texte. Animation par défaut « Caractère par caractère », calée sur la transition d'entrée de son Étape (FR-34). Ancré au bord du cadre le plus proche, il reste en place quand le Format de sortie change (FR-50). |
| **Compteur** (P1, FR-36) | Outil Texte, mode Compteur ; Faction | Clic : pose un Compteur ; le focus passe au champ Valeur du panneau. | Clip sur la piste Texte. Valeur par Étape (§4.0), qui défile de l'ancienne à la nouvelle pendant la transition. Ancré à un Territoire, il suit le centre de sa surface. |
| **Horodatage** (P1, FR-37) | Outil Texte, mode Horodatage | Clic : pose l'Horodatage. Un seul par Projet : s'il existe, l'outil le sélectionne. `[ASSUMPTION]` | Clip sur la piste Texte, style `date-cartouche`. Pendant une transition, la date défile de la Date d'Étape précédente à la suivante, à la granularité choisie ; fixe pendant le maintien. Un libellé libre d'Étape (« Été 1944 ») remplace le défilement. |
| **Légende** (P1, FR-35) | Pas d'outil : paramètres du Projet → « Afficher la Légende » | Glisser la déplace ; près d'un coin du cadre, elle s'y aimante et s'y ancre. Double-clic sur une entrée : renommer sur place. | Visible sur toute la Timeline, sans clip. Chaque Faction, motif et type de Jeton ajouté y entre sans action. |
| **Import** (`I`, FR-48) | — | Clic sur l'outil : sélecteur de fichiers (PNG, JPG, SVG, plusieurs à la fois). Le glisser-déposer sur la Carte marche avec tout outil. L'image se pose au point de dépôt ou au centre du cadre, à 40 % au plus de son côté court ; l'outil revient à Sélection, l'image sélectionnée. `[ASSUMPTION]` | Clip sur la piste Jetons `[ASSUMPTION]`. Panneau Image. |

### Panneau par type de sélection

| Sélection | Essentiel | Derrière « Plus d'options » |
|---|---|---|
| Rien : **paramètres du Projet** | Nom, Format de sortie, Date de référence (et `nearest-data-chip`), Région, Fond de carte (`basemap-picker`), Factions et Relations | Ligne de front (style, masquage global), Signature organique du Projet, Légende (P1), Couches et libellés (P1), Sources et licences |
| **Entité géographique** (une ou plusieurs) | Nom, Faction (`faction-picker`), Motif de remplissage | « Corriger la forme » : redessiner, découper, fusionner (P1, FR-11), puis mention « Corrigée dans ce Projet » ; renommer le libellé (P1, FR-9) |
| **Territoire** (double-clic sur une surface) | Faction (réassigne tout le Territoire), Motif (Plein · Semi-transparent · Hachures · Emblème (P1)), nombre d'Entités et de Zones | Opacité, nom affiché (P1, FR-9), point d'origine de la propagation à cette Étape (FR-39) |
| **Zone dessinée** | Faction, Motif, « Poche » (P1, FR-24) | Opacité |
| **Ligne de front** | Style (Tiret-point · Plein · Tireté), épaisseur, « Masquer pour Russie · Ukraine » | Couleur (défaut `{colors.map-front}`), « Garder la trace » (P2, réservé) |
| **Flèche** | Faction, épaisseur, « Visible de … à … » | Forme de tête, trait (Plein · Tireté), durée de dessin, Catégorie de flèche (P2, réservé) |
| **Jeton d'unité** | Faction, forme, étiquette et son cadre, rotation, « Visible de … à … » | Taille, animation d'apparition |
| **Série de Jetons** (P1) | Faction, forme, tracé suivi, côté, espacement, rangées (1 à 3) | Lien au Compteur (P2, réservé) |
| **Texte** | Texte, police, taille, couleur (`color-field`), cadre (Aucun · Filet · Bandeau), animation (Caractère · Mot · Fondu · Aucune), « Visible de … à … » | Halo, alignement, interlettrage, bord d'ancrage |
| **Compteur** (P1) | Valeur à cette Étape, Faction, préfixe et suffixe (« 12 000 hommes »), « Visible de … à … » | Ancrage à un Territoire, orientation, format des nombres |
| **Horodatage** (P1) | Granularité (Jour · Mois · Année), format (`Select` : AAAA-MM-JJ, JJ mois AAAA, année seule, libellé libre), libellé libre de cette Étape | Style (cartouche ou texte), coin d'ancrage |
| **Légende** (P1) | Entrées (renommer, masquer, réordonner), « Ajouter une ligne » | Titre, coin d'ancrage |
| **Image** | Utiliser comme (Élément · Emblème · Icône d'événement), opacité, échelle, rotation, « Visible de … à … » | « Utiliser comme fond » (P1, FR-49) : calage à la main par poignées de coin et de rotation, « Au-dessus du Fond · À la place du Fond » |
| **Étape** (vignette) | Date d'Étape, transition (Propagation · Fondu · Balayage) et point d'origine, durées de transition et de maintien, Caméra (voir Caméra d'Étape), Acte (P1) | Effets d'ambiance (P2, réservé) |
| **Sélection multiple** | « 5 éléments » et les seuls champs communs ; une valeur qui diffère s'affiche « Plusieurs » | — |

### Timeline

| Partie | Comportement |
|---|---|
| En-tête | Lecture/pause, Étape précédente/suivante, minutage « 00:08,4 / 00:20,5 », vitesse (0,5× · 1× · 2×), zoom horizontal, « Replier ». |
| Règle | Cliquer ou glisser place la tête de lecture. |
| Actes (P1) | Blocs nommés au-dessus des vignettes, renommables par double-clic ; sélectionner des vignettes puis « Grouper en Acte ». Sans Acte, la rangée disparaît. |
| Vignettes d'Étape | Largeur proportionnelle à la durée de maintien. Clic : tête au début du maintien et panneau Étape. Double-clic sur le titre : renommer. Glisser : réordonner (FR-40). Menu contextuel : Dupliquer, Insérer après, Supprimer. |
| Transitions hachurées | Largeur proportionnelle à la durée ; tirer le bord règle la durée, comme le champ du panneau Étape. `[ASSUMPTION]` |
| Pistes | Flèches / Jetons / Texte, un clip par élément ; Icônes d'événement et images sur la piste Jetons `[ASSUMPTION]`. Clic sur un clip = sélection sur la Carte, et inversement. Tirer la fin d'un clip limite sa plage (FR-45). |
| Chevauchements | L'utilisateur ne crée ni ne réordonne de voies. Deux clips d'une piste qui se chevauchent passent sur une **sous-rangée automatique** de `{spacing.track-lane-height}`, qui disparaît avec le chevauchement ; elle s'ajoute à la zone qui défile, jamais aux rangées fixes (même règle dans `DESIGN.md`). |
| Hauteur | `{spacing.timeline-height}` par défaut ([état d](mockups/editeur.html#etat-d)) : en-tête, règle, Actes et Étapes fixes, pistes au défilement (budget : `DESIGN.md` → Layout & Spacing). Poignée du bord haut et « Replier » : voir Responsive & Platform. |

### Modale Export

Rendu : [`mockups/export.html`](mockups/export.html).

| Partie | Comportement |
|---|---|
| Ouverture | La modale vérifie que le navigateur sait encoder la vidéo. Sinon : « Export indisponible » (State Patterns). |
| Vidéo | Plage (Toute la Timeline · Étapes de … à …), 30 ou 60 images/s, rappel du Format de sortie et de la résolution 1080p, qui se changent hors de la modale (barre haute ou paramètres du Projet). |
| Image (P1) | Instant (tête de lecture courante par défaut), PNG ou JPG, « Fond transparent » (PNG seulement). |
| Crédit | **Quand la licence d'une source l'exige** (Fond satellite, par exemple), le crédit est **verrouillé** : pas de case à cocher, une rangée avec le texte du crédit et un cadenas, et l'explication de Voice and Tone. Il ne peut pas être retiré (FR-10). L'utilisateur règle seulement la **Position** (un des quatre coins ; en bas à gauche par défaut) et la **Discrétion** (« Discrète », par défaut, ou « Lisible »). Sans licence qui l'exige, le crédit est une option décochée par défaut, avec les mêmes réglages. `[ASSUMPTION]` |
| Rendu | « Exporter » lance le rendu **dans la modale** : réglages figés, barre de progression, pourcentage, temps restant et Étape en cours (« Environ 25 s restantes · Étape 7 sur 10 »), « Annuler ». L'Éditeur reste bloqué. Chaque image attend ses tuiles (State Patterns → Tuiles manquantes à l'export). |
| Fin | État « Export terminé » : nom du fichier (`{projet}-{format}-{date}.mp4`, ex. `siege-de-marioupol-9x16-2026-09-29.mp4`), durée, résolution, images/s, poids, plage, rappel du crédit. Le navigateur enregistre seul le fichier dans ses téléchargements. Actions : « Exporter à nouveau » (retour aux réglages conservés) et « Télécharger de nouveau » (primaire), qui relance le téléchargement du fichier déjà rendu, sans nouveau rendu. `[ASSUMPTION: le fichier rendu reste en mémoire jusqu'à la fermeture de la modale]` Pas de toast de fin. |
| Fermeture | `Échap` ou la croix, une fois l'export terminé ou annulé. Pendant le rendu, seul « Annuler » l'interrompt. |

## State Patterns

| État | Surface | Traitement |
|---|---|---|
| Premier lancement | Accueil | Dialogue `consent-dialog` (FR-58), texte de Voice and Tone : « Refuser » et « Accepter », de même poids, rien de présélectionné. Ni croix ni `Échap` : il faut répondre. Tant que l'utilisateur n'a pas répondu, rien n'est envoyé. Le choix se change dans Réglages → Confidentialité. |
| Liste des Projets en chargement | Accueil | Squelettes de cartes de Projet (`skeleton`) pendant la lecture du stockage local. |
| Aucun Projet | Accueil | `home-empty` : « Aucun Projet pour l'instant. » + « Nouveau Projet » (primaire) + « Importer un Fichier projet ». |
| Ouverture d'un Projet | Accueil → Éditeur | L'Éditeur s'affiche aussitôt : squelettes dans le panneau et les vignettes, Carte au fond uni du Fond actif, « Ouverture… » dans la barre haute. Les outils s'activent dès que les données du Projet sont chargées ; médias et tuiles suivent sans bloquer. |
| **Projet ouvert dans un autre onglet** | Éditeur, Accueil | Un seul onglet modifie un Projet : il détient le **verrou d'édition**. Un autre onglet qui ouvre le même Projet l'affiche **en lecture seule**, avec `banner-info` (texte de Voice and Tone) et « Reprendre ici ». En lecture seule, outils de modification, champs du panneau et menus d'édition sont désactivés ; lecture, scrub, Mode présentation et export restent possibles. « Reprendre ici » prend le verrou après la dernière sauvegarde de l'autre onglet, qui passe aussitôt en lecture seule avec « Ce Projet est maintenant modifié dans un autre onglet. » + « Reprendre ici ». Si l'onglet détenteur se ferme, le bandeau le dit et garde « Reprendre ici », sans prise automatique. Sur l'Accueil, la carte du Projet indique « Ouvert dans un autre onglet ». `[ASSUMPTION: verrou par Projet, à implémenter par l'architecture]` |
| Création de la Carte | Assistant, écran 4 | « Créer la Carte » devient « Création de la Carte… » avec une barre de progression et l'étape en cours (« Chargement des Entités de 1450 ») ; écran figé. L'Éditeur s'ouvre dès que la Carte est prête (NFR-7). Échec : « Impossible de créer la Carte. » + « Réessayer », choix de l'Assistant conservés. |
| Projet rouvert après fermeture ou plantage | Accueil → Éditeur | Le Projet s'ouvre dans son dernier état sauvegardé (FR-53, NFR-5). Pas de dialogue de récupération. |
| Enregistrement | Barre haute | « Enregistrement… », puis « Enregistré ». Échec d'écriture : « Non enregistré », en `{colors.danger}` avec son icône, et un bandeau « Exportez un Fichier projet pour ne rien perdre ». |
| Stockage persistant refusé / presque plein | Accueil et Éditeur | `banner-warning` avec l'action « Exporter le Fichier projet » (FR-53). Il revient à chaque session tant que la condition dure. |
| Chargement des tuiles | Carte | Les tuiles arrivent progressivement ; en attendant, fond uni `{colors.map-land-neutral}` **du Fond actif** (`DESIGN.md` → Carte). L'édition n'est jamais bloquée ; la lecture continue avec les tuiles disponibles. |
| Chargement des données (Bibliothèque, Entités) | Tiroir, Assistant | Squelettes de vignettes. Échec : « Impossible de charger la Bibliothèque. » + « Réessayer ». |
| Aucun résultat | Recherche de lieu, tiroir, Assistant 1/4 et 3/4 | Lieu ou Région : « Aucun lieu trouvé pour « Marioupl ». Vérifiez l'orthographe ou essayez un nom actuel. » Bibliothèque et Templates : « Aucun résultat pour ces filtres. » + « Effacer les filtres ». « Passer » reste possible dans l'Assistant. |
| Date invalide | Assistant 2/4, paramètres du Projet, panneau Étape | Message sous le champ, en `{colors.danger}` avec icône ; la valeur précédente est conservée. « L'an 0 n'existe pas. Saisissez 1 av. J.-C. ou 1. » ; « Saisissez une année, par exemple 1463 ou 52 av. J.-C. » Une date hors des données n'est pas une erreur : voir la ligne suivante. |
| Données approximatives | Barre d'options, paramètres du Projet | Pastille « Données les plus proches : 1454 » (FR-6). |
| Satellite indisponible | Carte, sélecteur de Fond | Bascule automatique sur le Fond sombre. Toast avertissement, tuile satellite « Indisponible » avec « Réessayer ». Aucun élément du Projet n'est touché (FR-5). |
| Hors ligne | Global | Bandeau « Hors ligne. Vos modifications sont enregistrées sur cet appareil ; les fonds de carte et la Bibliothèque non encore chargés ne s'afficheront pas. » L'édition continue. `[ASSUMPTION]` |
| Démarrage du Mode présentation | Mode présentation | Écran noir et `progress-bar` « Chargement de la Carte… » jusqu'à ce que les tuiles des premières secondes soient là (10 s au plus), puis lecture. Plein écran refusé : présentation dans la fenêtre, toast « Plein écran refusé par le navigateur. La présentation reste dans la fenêtre. » `[ASSUMPTION]` |
| Export indisponible | Modale Export | Détecté à l'ouverture (encodeur vidéo absent) : `banner-warning` « Ce navigateur ne peut pas encoder de vidéo. Ouvrez OPENMAP dans Chrome ou Edge. », « Exporter » désactivé, réglages consultables. L'onglet Image reste utilisable s'il est livré (P1). |
| Tuiles manquantes à l'export | Modale Export | Chaque image attend ses tuiles ; la progression affiche « Chargement des tuiles… ». Après 20 s sans nouvelle tuile `[ASSUMPTION]`, le rendu se met en pause avec l'avertissement de Voice and Tone + « Continuer » / « Annuler » (retour aux réglages, rien n'est enregistré). Hors ligne, le même avertissement paraît dès le lancement. |
| Export en cours | Modale Export | Réglages figés, progression, pourcentage, temps restant, « Annuler ». Fermer l'onglet affiche l'alerte native du navigateur. |
| Export terminé | Modale Export | État final **dans la modale**, jamais un simple toast : « Export terminé », fichier, détails, rappel du crédit, « Exporter à nouveau » et « Télécharger de nouveau ». |
| Export annulé | Modale Export | Retour aux réglages de la modale, avec « Export annulé. Rien n'a été enregistré. » |
| Export échoué | Modale Export | Message en `{colors.danger}` : « L'export a échoué. » + cause lisible (mémoire, encodeur du navigateur) + « Réessayer » + conseil (« Essayez 30 images/s ou une plage plus courte »). `[ASSUMPTION]` |
| Navigateur non pris en charge (Firefox) | Accueil | Bandeau « OPENMAP est conçu pour Chrome et Edge. L'export vidéo peut ne pas fonctionner ici. » `[ASSUMPTION]` |
| Timeline vide (Projet vierge) | Timeline | Une seule Étape. Dans la rangée de vignettes : « Ajoutez une Étape pour animer la Carte. » + « + Étape ». |
| Aucune Faction | Panneau (paramètres du Projet), outils Territoire et Conquête | « Ajoutez une Faction pour colorer des Territoires. » + « Ajouter une Faction », qui ouvre la Bibliothèque sur l'onglet Kits. |
| Aucune subdivision (P1) | Barre d'options de Conquête | « Pas de subdivisions pour cette Région à cette date. Peignez librement ou découpez une Entité. » (FR-7) |
| Entité corrigée (P1) | Carte, panneau | Mention « Corrigée dans ce Projet » dans le panneau (FR-11). |
| Import d'image refusé | Carte | Toast : « Format non pris en charge. Utilisez PNG, JPG ou SVG. » |
| Import de Fichier projet | Accueil | Toast à progression « Import de siege-de-marioupol… 45 % » avec « Annuler » ; le Projet apparaît ensuite en tête de liste. Fichier invalide : dialogue « Ce fichier n'est pas un Fichier projet OPENMAP lisible. » Aucun Projet existant n'est modifié. |
| Fichier de Kit invalide (P1) | Réglages → Kits personnels | Toast erreur : « Ce fichier n'est pas un Kit OPENMAP lisible. » Aucun Kit personnel n'est modifié. |
| Calque verrouillé (P1) | Carte | Ses éléments ne se sélectionnent pas (curseur interdit au survol). Au premier clic de la session : toast « Le Calque Flèches est verrouillé. · Déverrouiller ». |
| Changement de Date de référence | Paramètres du Projet | Confirmation : « Les Territoires construits sur des Entités qui n'existent plus en {date} deviendront des Zones dessinées. » (FR-6) |
| Focus | Partout | Anneau `focus-ring` visible au clavier seulement (`:focus-visible`). |

## Interaction Primitives

- **Sélection** (outil Sélection, `V`) : clic sur un élément (Flèche, Jeton, Texte, image… avant les surfaces), sinon sur l'Entité géographique ou la Zone dessinée sous le curseur ; double-clic sur une surface : tout le Territoire de sa Faction ; clic dans le vide : paramètres du Projet. `Maj` + clic ajoute ou retire, un rectangle tiré dans le vide sélectionne par zone, `Ctrl+A` prend tous les éléments du Calque actif. `[ASSUMPTION]` Clic droit : menu contextuel de la sélection.
- **Glisser** : déplacer un élément à l'Étape courante (portée §4.0), déposer des images sur la Carte (FR-48) ou un Fichier projet sur l'Accueil, réordonner Étapes et Calques, tirer les bords de clip et de transition.
- **Pinceau** : outil Conquête (voir Outils de Carte).
- **Tracé** : Zone dessinée (outil Territoire) et Flèche. Clic pour poser un point, glisser pour la main levée, double-clic ou `Entrée` pour terminer, `Retour arrière` pour retirer le dernier point, `Échap` pour annuler.
- **Scrub** : glisser la tête de lecture ou cliquer sur la règle. La Carte affiche l'image exacte de l'export (FR-41).
- **Zoom et panoramique** (caméra d'édition) : molette pour zoomer autour du curseur, pincement au pavé tactile, `Espace` maintenu + glisser ou bouton du milieu pour se déplacer, `Maj` + molette pour tourner, `Maj+1` pour recentrer sur le cadre d'export (`Ctrl+0` reste au zoom du navigateur). La caméra d'édition ne modifie jamais les Presets ni le cadrage manuel d'une Étape.
- **Annuler / rétablir** (FR-55) : `Ctrl+Z` / `Ctrl+Maj+Z` (et `Ctrl+Y`). Plusieurs niveaux, sur la Carte, la Timeline, les Kits et les paramètres du Projet. L'annulation ne couvre pas l'export, les Réglages ni l'import de Fichier projet. L'historique ne survit pas au rechargement. `[ASSUMPTION]`
- **Proscrit** : images clés et courbes de Bézier exposées (PRD §9), modales empilées, action destructive sans « Annuler », survol comme seul accès à une fonction, lecture automatique à l'ouverture d'un Projet.

**Clavier : priorités par contexte.** Une touche n'a qu'un sens à un instant donné ; le contexte le plus précis gagne. `[ASSUMPTION]`
1. **Champ texte focalisé** : toutes les touches vont au champ ; raccourcis à une lettre, `Espace` et flèches sont inactifs. `Échap` quitte le champ.
2. **Contrôle composite focalisé** (menu, `Select`, segmenté, sélecteur de Faction, slider, liste des vignettes, liste des Calques) : flèches, `Espace` et `Entrée` suivent le motif ARIA du contrôle. Dans la liste des vignettes, `←` / `→` passent d'une vignette à l'autre et en font l'Étape courante ; `Ctrl+Maj+←` / `→` réordonne.
3. **Carte focalisée avec une sélection** : les flèches déplacent l'élément d'1 px d'export (`Maj` : 10).
4. **Partout ailleurs** (Carte sans sélection, Timeline, tête de lecture, aucun focus) : `←` / `→` Étape précédente / suivante, `Maj` + `←` / `→` une image, `Début` / `Fin` début et fin de la Timeline.
- **`Espace`** : appui bref (relâché sans glisser) = lecture / pause ; maintenu pendant un glisser sur la Carte = panoramique, sans basculer la lecture. Sur un bouton focalisé, il active le bouton (natif).
- **`Échap`** : une seule chose par appui, dans cet ordre : fermer le menu ou popover ouvert → fermer le dialogue (jamais pendant un rendu d'export) → annuler le tracé en cours ou la sélection en attente → fermer le tiroir → vider la sélection → revenir à l'outil Sélection. En Mode présentation, il ramène à l'Éditeur.
- **Changer de zone** : `Alt+1` à `Alt+6` (touches de la rangée des chiffres, sans `Maj`, en AZERTY comme en QWERTY) : barre haute, rail, barre d'options, Carte, panneau, Timeline. `F6` n'est pas utilisé : Chrome et Edge s'en servent pour la barre d'adresse.

Raccourcis `[ASSUMPTION: liste à valider ; les raccourcis à une lettre suivent le caractère tapé, pour AZERTY comme pour QWERTY]` :

| Touche | Action | Touche | Action |
|---|---|---|---|
| `V` | Sélection | `Espace` (bref) | Lecture / pause |
| `T` | Territoire | `←` / `→` | Étape précédente / suivante (contexte 4) |
| `C` | Conquête | `Ctrl+D` | Dupliquer (élément ou Étape) |
| `F` | Flèche | `Suppr` | Supprimer la sélection |
| `J` | Jeton d'unité | `Ctrl+Z` / `Ctrl+Maj+Z` | Annuler / rétablir |
| `X` | Texte | `Ctrl+S` | Confirmer la sauvegarde (toast) |
| `I` | Import | `Ctrl+E` | Exporter |
| `B` | Bibliothèque | `P` | Mode présentation |
| `L` | Calques | `/` | Rechercher un lieu |
| `Échap` | Voir l'ordre ci-dessus | `Alt+1` … `Alt+6` | Aller à une zone |
| `[` / `]` | Taille du pinceau ou épaisseur | `?` | Aide des raccourcis |

## Accessibility Floor

Comportements. Le contraste visuel est défini dans `DESIGN.md` (tous les textes courants ≥ 4,5:1 ; `{colors.focus-ring}` et `{colors.playhead}` ≥ 3:1 ; `{colors.text-muted}` est le plancher et ne s'éclaircit pas).

- **Cible** : WCAG 2.2 AA pour tout le chrome. Le contenu de la Carte appartient à l'utilisateur : OPENMAP ne l'audite pas, mais garantit par défaut des libellés sur halo et un style neutre distinct.
- **Accès clavier** : tout est atteignable au clavier, y compris la barre haute, le rail, le tiroir, le panneau, la Timeline et les dialogues. L'ordre de tabulation suit l'ordre visuel : barre haute → rail → barre d'options → Carte → panneau → Timeline. Chaque zone est une région ARIA nommée, atteignable par `Alt+1` à `Alt+6` ; les priorités de touches sont celles d'Interaction Primitives.
- **Alternatives au pointeur** : dessiner et peindre restent des gestes de pointeur. Chaque résultat a toutefois un chemin clavier : sélectionner une Entité par la recherche de lieu (FR-8) puis l'assigner avec le sélecteur de Faction ; déplacer un élément sélectionné aux flèches ; régler durées, plages et valeurs dans le panneau (équivalent des bords de clip et de transition). `[ASSUMPTION]`
- **Focus visible** : anneau `focus-ring` (`{spacing.focus-ring-width}`, décalé de `{spacing.focus-ring-offset}`) sur tout élément focalisable. Sur la Carte, l'élément focalisé prend le contour `canvas-selection`, jamais l'accent.
- **Lecteurs d'écran** : chaque outil du rail est un bouton nommé par son libellé visible, avec `aria-pressed` pour l'outil actif et `aria-keyshortcuts` pour son raccourci. La Carte est une région nommée (« Carte, Étape 1463 ») ; une zone `aria-live` polie annonce la sélection (« Territoire Empire ottoman sélectionné, 12 Entités »), les assignations, le compteur de conquête et la validation. La tête de lecture est un `slider` avec `aria-valuetext` (« 00:08,4, Étape 1463, Conquête de la Bosnie »). Les vignettes forment une liste (« Étape 3 sur 5, 1463, Conquête de la Bosnie, transition 2 s, maintien 2,5 s »). Les pastilles de Faction portent toujours le nom. Les toasts sont annoncés, poliment pour une information, de façon assertive pour une erreur. La progression d'export est un `progressbar` ; « Export terminé » est annoncé poliment et le focus passe sur « Télécharger de nouveau ». Le crédit verrouillé expose son état (« Crédit obligatoire, verrouillé »). Le bandeau de lecture seule est annoncé à l'ouverture.
- **Mouvement réduit** (`prefers-reduced-motion`) :
  - *Chrome* : tiroir, toasts, accordéons, squelettes et changements de panneau passent en fondu court ou en instantané. La Signature organique ne s'applique jamais aux éléments d'interface.
  - *Carte dans l'Éditeur* : c'est du contenu, et l'aperçu doit égaler l'export (NFR-1). La lecture montre donc la Signature organique telle que réglée, mais elle ne démarre jamais seule. Les vignettes animées des Templates restent statiques. Le panneau Signature organique rappelle alors : « L'animation de la Carte est votre contenu ; réglez-la sur Désactivée pour supprimer dépassement, tremblé et pulsation. »
  - *Export* : il n'est jamais affecté par la préférence système. Seul le réglage Signature organique du Projet ou du Kit compte.
- **Couleur** : aucune information portée par la seule couleur. Les pistes ont leur libellé, les états leur icône et leur texte, les Factions leur nom.
- **Cibles** : zone active de `{spacing.hit-area-min}` au moins (WCAG 2.2, 2.5.8), même sous un visuel plus petit (`DESIGN.md` → Shapes) ; `{spacing.control-height-sm}` pour les contrôles du chrome.

## Responsive & Platform

| Condition | Comportement |
|---|---|
| Desktop ≥ 1366 × 768, Chrome ou Edge | Expérience complète. Aucun panneau essentiel masqué, aucun défilement horizontal (NFR-8). |
| Fenêtre < 1366 px de large | La Carte rétrécit en premier. Sous 1280 px, le panneau passe à `{spacing.panel-width-compact}` et le tiroir recouvre davantage la scène. Un bandeau signale : « OPENMAP est conçu pour un écran d'au moins 1366 × 768. » `[ASSUMPTION]` |
| Hauteur de Timeline par défaut | `{spacing.timeline-height}` : en-tête, règle, Actes, rangée des Étapes et une piste visibles, les autres au défilement. Surface de Carte et de cadre mesurées à 1366 × 768 : `DESIGN.md` → Layout & Spacing ([état d](mockups/editeur.html#etat-d)). |
| Faible hauteur | La Timeline se replie à `{spacing.timeline-collapsed-height}` (en-tête seul : lecture, minutage, Étape précédente/suivante). Un bouton de l'en-tête la déplie. `[ASSUMPTION]` |
| Redimensionner la Timeline | Poignée sur le bord supérieur, de `{spacing.timeline-min-height}` à 50 % de la hauteur. Hauteur et état replié mémorisés localement. `[ASSUMPTION]` |
| Firefox | Fonctionne au mieux, avec un bandeau d'avertissement (NFR-4) ; export désactivé si l'encodeur manque. |
| Mobile ou tablette (pointeur grossier et largeur < 1024 px) | Pas d'éditeur. Page explicative : « OPENMAP est conçu pour un ordinateur. Ouvrez ce lien sur votre PC avec Chrome ou Edge. » + « Copier le lien ». `[ASSUMPTION: message bloquant]` |
| Plein écran | Réservé au Mode présentation (API Fullscreen). |
| Plusieurs onglets | Un seul onglet modifie un Projet donné ; les autres sont en lecture seule (State Patterns). |

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

1. [Accueil] Terrabellum ouvre OPENMAP sur son PC, sans compte, puis « Nouveau Projet ».
2. [Assistant 1/4] Il filtre « géopolitique actuelle » et choisit « Conflit contemporain — siège de ville ».
3. [Assistant 2/4] Il saisit la Date de référence 2022.
4. [Assistant 3/4] Il tape « Marioupol » ; l'aperçu cadre la ville.
5. [Assistant 4/4] Il choisit Russie et Ukraine, dont les Kits officiels s'appliquent d'eux-mêmes, puis « Créer la Carte » ([rendu](mockups/assistant.html)).
6. [Éditeur · panneau Projet] Format de sortie 9:16, Fond de carte satellite.
7. [Éditeur · outil Territoire, mode Zone dessinée] Il dessine la Poche ukrainienne à main levée et la marque « Poche » dans le panneau (P1).
8. [Timeline] « + Étape » pour chaque semaine, de mars à mai. À chaque Étape, il resserre les points de la Poche.
9. [Outil Jeton, mode Série] Il pose des badges ronds à drapeau en Série de Jetons attachée à la Ligne de front (P1), puis [outil Texte] un Compteur d'effectifs par camp (P1) et un Horodatage au jour (P1).
10. [Timeline] Il scrubbe : la Poche se resserre en se déformant, avec la Signature organique.
11. [Modale Export] Vidéo, 30 images/s, plage des Étapes du 16 mars au 18 mai. Le crédit Copernicus du Fond satellite est verrouillé ; il le laisse en bas à gauche, « Discrète ». « Exporter » ([rendu en cours](mockups/export.html#etat-encours)).
12. **Climax :** la barre atteint 100 % et la modale affiche « Export terminé » : le MP4 vertical est dans ses téléchargements ([état terminé](mockups/export.html#etat-termine)). Moins de 20 minutes depuis l'ouverture.

**Variante P0 (tranche de validation, PRD §10.1) :** à l'étape 7, une Zone dessinée du Territoire ukrainien, sans marque « Poche » ; à l'étape 9, des Jetons posés un à un, et un Texte par Étape à la place du Compteur et de l'Horodatage.

**Cas limite :** à la 3e Étape, le tracé est trop grossier. Il corrige les points ; le panneau affiche « Défini à cette Étape ». Les Étapes 4 et suivantes sans tracé propre héritent de la correction ; les Étapes 1 et 2 ne changent pas.

**Échec :** le satellite est indisponible. La Carte passe au Fond sombre, un toast le dit, et le reste du parcours ne change pas.

### UJ-2. Terrabellum raconte l'expansion ottomane dans les Balkans.

Rendu de l'Éditeur à l'Étape 1463 : [`mockups/editeur.html`](mockups/editeur.html) (Kit « Empire ottoman » sélectionné, rangée de la Sous-faction « Vassaux ottomans », Timeline par défaut en état d).

1. [Assistant] Template « Expansion d'empire » (Ère Temps modernes), Date de référence 1450, Région Balkans, Faction Empire ottoman.
2. [Éditeur · éditeur de Kit] Le Kit officiel devient une « Copie propre au Projet ». Il clique sur « Ajouter une Sous-faction » et crée « Vassaux ottomans ». Dans le panneau de la Sous-faction, il surcharge la couleur. De retour sur le Kit parent, la rangée de la Sous-faction résume « Hérite · couleur surchargée ».
3. [Timeline] Il crée les Étapes 1453, 1459, 1463…
4. [Outil Conquête] Pour chaque Étape : Faction attaquante « Empire ottoman », peinture au pinceau des Entités (« 12 Entités sélectionnées »), « Valider la conquête ». Là où le découpage manque, il passe en Peinture libre.
5. [Carte] La Ligne de front se redessine seule entre les Factions en conflit, mais pas entre l'Empire et ses vassaux, alliés par défaut.
6. [Panneau Étape · Caméra] Preset caméra « Fly-to » sur les Étapes clés.
7. [Éditeur de Kit parent] Il change la teinte de l'Empire ottoman.
8. **Climax :** tous les Territoires, Flèches et Jetons ottomans, vassaux compris, se mettent à jour sur toute la Timeline. Les vignettes d'Étape se recolorent sous ses yeux.

**Cas limite :** [menu du Kit] « Enregistrer dans les Kits personnels » (P1). Le Kit officiel de la Bibliothèque ne bouge pas.

**Garde-fou :** si la nouvelle teinte tombe sous ΔE 10 face à l'accent, un avertissement non bloquant s'affiche sous le champ.

**Échec :** la Bibliothèque n'a pas de Kit officiel pour la Principauté de Zeta. L'Assistant lui donne un Kit par défaut de couleur distincte des autres Factions (FR-2) ; il le retouche dans l'éditeur de Kit, et la Faction reste utilisable partout.

### UJ-3. Claire, prof d'histoire-géo, prépare la carte des alliances de la Guerre froide.

1. [Assistant] Template « Alliances », Date de référence 1968. Factions OTAN et Pacte de Varsovie.
2. [Outil Sélection + panneau Entité géographique] Elle sélectionne les pays membres de l'OTAN (`Maj` + clic), puis clique sur la pastille « OTAN » du sélecteur de Faction ; même geste pour le Pacte de Varsovie (Component Patterns → Assigner une Entité à une Faction, FR-13). Pour les adhésions tardives, elle crée des Sous-factions à teinte plus claire.
3. [Panneau Entité géographique] Motif « Hachures » pour l'Albanie. La Suède, la Finlande et la Yougoslavie restent neutres, au style neutre par défaut.
4. [Carte] Le Template a désactivé la Ligne de front : rien ne s'affiche sur le rideau de fer. La section Relations du panneau Projet indique « aucune Faction en conflit ».
5. [Carte] La Légende s'est générée toute seule (P1).
6. [Modale Export · Image] PNG de l'instant courant, pour son diaporama (P1).
7. [Modale Export · Vidéo] Plage des Étapes 1949 → 1968.
8. **Climax :** une Carte propre et lisible, comparable à celles des manuels ([`imports/ref-guerre-froide-alliances.png`](imports/ref-guerre-froide-alliances.png)), sans rien dessiner.

**Cas limite :** les libellés de pays sont en anglais. Elle sélectionne un libellé et le renomme dans le panneau (FR-9, P1). La langue des libellés reste ouverte (Q4).

**Échec :** les données n'ont pas d'état exact en 1968 pour cette Région. La Carte prend l'état le plus proche et affiche « Données les plus proches : 1965 » (FR-6). Un pays absent se trace en Zone dessinée avec l'outil Territoire, ou se corrige dans le Projet (FR-11, P1).

### UJ-4. Hugo, passionné de wargame, reconstitue la percée de Normandie à partir d'une vieille carte.

1. [Accueil → Assistant] « Carte vierge », Région Normandie, Date de référence 1944.
2. [Carte] Il glisse-dépose son scan. Dans le panneau de l'image, « Utiliser comme fond » (P1), puis il la cale à la main : position, échelle, rotation, opacité.
3. [Outil Territoire, mode Zone dessinée + Timeline] Il trace les Territoires alliés aux Étapes du 6 juin, du 12 juin et du 25 juillet.
4. [Panneau Ligne de front] « Garder la trace » : les Traces de front restent visibles avec leur date (P2 ; place réservée).
5. [Outil Flèche] Grosses Flèches de percée. [Panneau Flèche] Catégorie de flèche « Percée » (rouge) ou « Réduction de la poche » (bleu) (P2 ; en P0/P1, la Flèche prend le style de sa Faction).
6. [Outil Jeton] Jetons d'unité à drapeau avec étiquette encadrée (« 7 C. », « 1 Ar. ») ; [outil Texte] étiquettes de commandement (« Gal Bradley »).
7. [Panneau Projet · sélecteur de Fond] Fond parchemin.
8. **Climax :** en Mode présentation, l'animation a l'esthétique vintage qu'il aime ([`imports/ref-normandie-1944-vintage.webp`](imports/ref-normandie-1944-vintage.webp)), et les fronts avancent tout seuls.

**Cas limite :** il ferme l'onglet par erreur. En rouvrant OPENMAP, l'Accueil montre son Projet en tête. Il l'ouvre dans l'état d'il y a quelques secondes au plus (NFR-5), sans dialogue de récupération. S'il l'avait rouvert dans un second onglet sans fermer le premier, ce second onglet serait en lecture seule, avec « Reprendre ici ».

## Open Questions & Assumptions

**Hypothèses posées dans ce fichier** (colonne « Bloque » : ce qui attend que l'hypothèse soit tranchée)

| Hypothèse | Bloque |
|---|---|
| Verrou d'édition par Projet entre onglets, lecture seule et « Reprendre ici » : **l'architecture doit implémenter le verrou** (par exemple Web Locks ou BroadcastChannel) et la libération à la fermeture | Architecture |
| « Télécharger de nouveau » garde le fichier rendu en mémoire jusqu'à la fermeture de la modale (alternative : choisir la destination avant le rendu avec `showSaveFilePicker`) | Architecture |
| L'export attend chaque tuile ; pause après 20 s sans tuile, puis « Continuer » / « Annuler » ; détection de l'encodeur à l'ouverture de la modale | Architecture |
| Priorités clavier par contexte, `Espace` bref ou maintenu, ordre d'`Échap`, `Alt+1` à `Alt+6` à la place de `F6` (collisions à vérifier sur Chrome et Edge Windows), `Ctrl+Maj+←` / `→` pour réordonner | Story |
| Outil Territoire à deux modes (Entités, Zone dessinée) ; assignation hors Conquête par sélecteur de Faction et menu contextuel | Story |
| Flèche dessinée pendant la transition d'entrée (première seconde du maintien sur la 1re Étape) ; Jeton posé puis étiquette au panneau ; un seul Horodatage par Projet ; images et Icônes d'événement sur la piste Jetons ; image importée à 40 % du côté court | Story |
| Caméra d'Étape : « Utiliser la vue actuelle », champs Zoom et Rotation, `Maj` + molette | Story |
| Relations par paire, liste réduite au-delà de 6 paires | Story |
| Démarrage du Mode présentation (attente de 10 s au plus), repli si le plein écran est refusé, arrêt en fin de Timeline | Story |
| Sous-rangées automatiques de piste en cas de chevauchement ; pistes sans voies créées par l'utilisateur | Rien |
| Thème par défaut : préférence système ; Réglages en dialogue à onglets | Rien |
| Emplacements posés par défaut (liste sous Information Architecture) | Rien |
| Édition en pleine transition : calage sur l'Étape d'arrivée ; héritage affiché en texte ; « Appliquer à toutes les Étapes » en lien ; repères sous les vignettes | Rien |
| Date proposée pour une nouvelle Étape ; suppression d'Étape ou de Projet avec « Annuler » ; durées de transition réglables au bord du bloc | Rien |
| Crédit facultatif décoché ; position et discrétion par défaut ; messages d'échec d'export | Rien |
| Toasts (durées, file, pas de toast par sauvegarde) ; mémorisation de « Plus d'options » ; hors ligne | Rien |
| Bandeau Firefox, message mobile bloquant, comportement sous 1366 px, Timeline de 180 px au moins et mémorisée | Rien |
| Libellé « Présentation » (plutôt qu'« Aperçu »), équivalents anglais du Glossaire, « Carte vierge » via les écrans 2 à 4 | Rien |
| Consentement télémétrie : dialogue sans croix, deux boutons de même poids | Rien |

**Notes pour l'UX**
- `[NOTE FOR UX]` Comportement exact quand on édite avec la tête de lecture en pleine transition.
- `[NOTE FOR UX]` Découvrabilité d'« Appliquer à toutes les Étapes » : lien contextuel ou sélecteur de portée ? À tester avec 3 à 5 créateurs (PRD §12).

**Contrôle de fermeture de l'Information Architecture**
- Toutes les FR P0 et P1 ont une surface, FR-7 comprise (Carte et outil Conquête). Plusieurs emplacements viennent d'hypothèses (liste ci-dessus) : ils sont à confirmer.
- L'onglet Templates du tiroir dans l'Éditeur ouvre un nouveau Projet via l'Assistant (hypothèse posée sous Information Architecture) : un Projet contient une seule Carte, et FR-3 ne prévoit pas d'appliquer un Template à un Projet existant.
- La PRD ne prévoit aucune entrée de création dédiée pour la Légende, le Compteur, l'Horodatage et les Icônes d'événement ; les emplacements retenus (Outils de Carte) sont des hypothèses.
- **Surfaces sans parcours** : aucun UJ n'atterrit sur Réglages ou l'import de Fichier projet ; le Mode présentation n'apparaît qu'au climax d'UJ-4. Ces surfaces se justifient par FR-58, FR-16, FR-57, FR-54 et les décisions de thème et de langue du log.
- **Parcours qui dépendent du P2** : UJ-4 s'appuie sur FR-27 (Traces de front) et FR-29 (Catégories de flèche). Leurs surfaces sont réservées dans le panneau, sans rien à livrer avant P2.
- **À signaler au PM** : FR-2 (P0) exige « la Légende visible » en sortie d'Assistant, alors que la Légende (FR-35) est P1. `[ASSUMPTION: en P0, la sortie d'Assistant montre une Légende minimale des Factions, non éditable ; FR-35 apporte l'édition en P1]`
- **Questions produit ouvertes** : langue des libellés de Carte (PRD Q4) ; palettes des Fonds à valider sur planche (`DESIGN.md`).
