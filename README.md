# 🚗 Code Route

Un site pour réviser le **code de la route français** (permis B), sans inscription ni installation.

## ▶️ [Ouvrir le site](https://drastix235.github.io/code-route/)

## Ce qu'il y a dedans

- **230 questions** corrigées et expliquées, sur les 10 thèmes officiels de l'examen, plus un thème bonus **boîte manuelle**
- **Révision intelligente** : les questions ratées et celles à revoir reviennent en priorité
- **Examen blanc** : 40 questions, chrono, 35 bonnes réponses pour réussir, correction détaillée à la fin
- **Fiches de cours** par thème, calculateur de distances d'arrêt, astuces mnémotechniques
- **Panneaux** : galerie et quiz de reconnaissance
- **Suivi** : calendrier des jours travaillés, série de jours consécutifs, objectif quotidien, progression par thème, courbe des examens blancs, historique des séances

La progression est enregistrée dans le navigateur (localStorage). Elle peut être exportée et importée depuis l'onglet *Suivi* pour changer d'appareil.

## Avertissement

Les questions sont originales et rédigées à partir de la réglementation française. Ce site est un outil d'entraînement : il ne remplace ni une auto-école ni les textes officiels, et la réglementation peut évoluer.

## Technique

HTML, CSS et JavaScript sans dépendance ni étape de build. Les questions sont dans `js/data.js`, les panneaux (SVG) dans `js/signs.js`, l'application dans `js/app.js`.
