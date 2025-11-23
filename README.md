# RMH Auto Site Generator

Générateur automatique de sites statiques hebdomadaires autour du thème RMH.

Principales fonctionnalités
- Génère chaque exécution un site statique unique (texte, styles, citations).
- Sauvegarde chaque génération dans `output/YYYY-MM-DD/`.
- Inclus toujours le lien exact vers : https://sites.google.com/view/rmh-france/home
- Drapeau français visible sur la page.
- Génération automatique de `sitemap.xml` et `robots.txt`.
- Workflow GitHub Actions prévu pour exécution hebdomadaire et déploiement sur GitHub Pages.

Usage local
1. Installer les dépendances :
   npm ci

2. Lancer la génération :
   npm run generate

3. La sortie est disponible dans `output/YYYY-MM-DD/`.

Structure du projet
- scripts/generate.js — script principal de génération.
- templates/ — templates Nunjucks (index.njk, base.njk).
- data/citations.json — pool de fragments de citations.
- data/used.json — suivi des citations utilisées (géré automatiquement).
- static/fr-flag.svg — drapeau français (inclus dans chaque page).
- .github/workflows/generate-and-deploy.yml — workflow CI pour génération hebdo et déploiement.

Unicité des citations
Le générateur sélectionne des fragments dans `data/citations.json` puis applique un petit enrichissement (attribution, variante, identifiant court) pour garantir que chaque citation textuelle est unique à chaque génération. Les empreintes (hashes) sont enregistrées dans `data/used.json` pour limiter les répétitions. Ce mécanisme évite de réutiliser textuellement la même citation.

Indexabilité
Le script produit `sitemap.xml` et `robots.txt` permissif. Pour que Google indexe rapidement, configurez GitHub Pages (ou l'hébergeur choisi) et soumettez la sitemap via la Search Console si vous le souhaitez.

Déploiement
Le workflow GitHub Actions (prévu) :
- exécute la génération hebdomadaire via cron,
- publie la sortie générée sur la branche `gh-pages` (GitHub Pages) via `peaceiris/actions-gh-pages`.

Avertissement éthique
Ce système génère du contenu automatiquement. Assurez-vous que le contenu produit reste de qualité et respecte les guidelines des moteurs de recherche pour éviter tout comportement assimilé à du spam.
