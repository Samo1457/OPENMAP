# OPENMAP

Éditeur de cartes historiques et géopolitiques animées, dans le navigateur, exportées en vidéo.

## Lancer l'application et les vérifications en local

### Prérequis

- **Node.js 24 LTS** (la version est fixée dans `.nvmrc`). Avec nvm : `nvm install` puis `nvm use` dans le dossier du projet.
- npm (livré avec Node.js).

### Installer

```sh
npm ci
```

`npm ci` installe exactement les versions du fichier `package-lock.json`.

### Lancer l'application

```sh
npm run dev
```

Ouvrez l'adresse affichée (par défaut <http://localhost:5173>). Pour l'instant, la page est volontairement vide ; son titre est « OPENMAP ».

### Les vérifications, une par une

| Commande | Ce qu'elle vérifie |
| --- | --- |
| `npm run typecheck` | Les types TypeScript. `src/core` est vérifié sans le DOM : le cœur reste pur. |
| `npm run lint` | oxlint. Refuse `Math.random`, `Date.now`, `performance.now`, `new Date()` et `crypto.getRandomValues` dans `src/core` (AD-2), et `flyTo` / `easeTo` / `panTo` partout (AD-1). |
| `npm run depcruise` | dependency-cruiser : les règles de couches. `src/core` n'importe ni React, ni MapLibre, ni deck.gl, ni `src/i18n`, ni un adaptateur ; un adaptateur ou l'UI n'entre dans un autre adaptateur que par son `index.ts`. |
| `npm run licences` | Les licences de toutes les dépendances (AD-17). Une licence hors de la liste autorisée fait échouer la vérification, sauf si le paquet figure dans `licence-overrides.json` avec une raison. |
| `npm run test` | Les tests Vitest, dont les tests des garde-fous : chaque règle ci-dessus est confrontée à un exemple fautif (`tests/guardrails/fixtures/`) et doit le refuser. |
| `npm run build` | La version de production dans `dist/`. |
| `npm run e2e` | Le test Playwright : la page se charge, s'appelle « OPENMAP », sans erreur ni requête vers un autre site. Il démarre lui-même le serveur de développement (en CI, il sert la version construite `dist/`). |

Avant le premier `npm run e2e`, installez Chromium pour Playwright : `npx playwright install chromium`. Si un Chromium est déjà installé ailleurs, indiquez son chemin dans la variable `PLAYWRIGHT_CHROMIUM_EXECUTABLE` au lieu de le réinstaller.

### Tout vérifier d'un coup

```sh
npm run check
```

Lance toutes les vérifications dans l'ordre ci-dessus et s'arrête à la première erreur. C'est ce que fait l'intégration continue.

## Intégration continue et déploiement

À chaque push, GitHub Actions (`.github/workflows/ci.yml`) lance toutes les vérifications. Si et seulement si elles passent, le job `deploy` publie `dist/` sur Cloudflare Pages :

- branche `main` : déploiement de **production** ;
- toute autre branche : déploiement de **prévisualisation** (une adresse `*.pages.dev` par branche).

Une CI en échec ne déploie jamais.

### Configurer Cloudflare Pages (une seule fois)

1. Dans Cloudflare, créez un projet Pages en **Direct Upload** (pas de connexion Git), nommé `openmap`, avec `main` comme branche de production. Si le projet est déjà relié au dépôt Git, désactivez ses déploiements automatiques (Settings → Builds & deployments) : seul GitHub Actions doit déployer, après la CI.
2. Créez un jeton d'API Cloudflare avec la permission **Cloudflare Pages : Edit**.
3. Dans GitHub, Settings → Secrets and variables → Actions, ajoutez les secrets `CLOUDFLARE_API_TOKEN` (le jeton) et `CLOUDFLARE_ACCOUNT_ID` (l'identifiant du compte).
4. Si le projet Pages ne s'appelle pas `openmap`, ajoutez la variable (onglet Variables) `CLOUDFLARE_PAGES_PROJECT` avec son nom.

Tant que les deux secrets manquent, le job `deploy` s'arrête proprement avec un avertissement et ne déploie rien. Aucun secret n'est jamais écrit dans le dépôt.
