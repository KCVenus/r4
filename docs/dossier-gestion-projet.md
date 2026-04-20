---
title: "Projet R4 — Dossier de gestion de projet"
subtitle: "Rôle du chef de projet, méthodologie et conduite"
author: "Arthur Demoisson"
date: "Avril 2026"
lang: fr
---

# 1. Introduction

## 1.1 Présentation du projet

Le projet **R4** est une application web de questionnaire à choix binaire, développée dans le cadre de ma **4ème année d'ingénieur informatique et multimédia au CNAM Toulon**. L'objectif fonctionnel est de proposer à un utilisateur une série de questions à deux options, d'en analyser les réponses, et de recommander une ou plusieurs **formations** correspondantes via un système de scoring.

Au-delà du livrable technique, ce projet constitue avant tout un **exercice de gestion de projet** : recensement des besoins, planification, conduite des phases, gestion des risques, traçabilité.

## 1.2 Mon rôle

J'ai assumé **l'intégralité des rôles** habituellement répartis sur une équipe :

- **Chef de projet** : recensement des besoins, priorisation, planification, suivi
- **Architecte** : choix de la stack, modélisation BDD, arbitrages techniques
- **Développeur full-stack** : back-end PHP + front-end HTML/CSS/JS
- **DBA** : schéma MySQL, migrations, indexation
- **Ops** : préparation du déploiement, sécurisation serveur, HTTPS

Ce document se concentre sur la **casquette de chef de projet**.

## 1.3 Contexte pédagogique

Le projet est évalué sur deux axes :

1. La **qualité du livrable** (fonctionnel, sécurisé, déployable)
2. La **qualité de la démarche** (méthode, traçabilité, capacité à justifier les choix)

C'est le second axe qui est documenté ici.

---

# 2. Qu'est-ce que la gestion de projet ?

## 2.1 Définition

La gestion de projet est l'**ensemble des activités permettant de mener un projet de son cadrage initial à sa clôture**, en respectant des contraintes de qualité, de délai et de périmètre (le *triangle projet* classique).

Un projet se distingue d'une activité récurrente par trois caractéristiques :

- Un **objectif** unique et défini
- Un **début et une fin** dans le temps
- Des **ressources limitées** (temps, compétences, budget)

## 2.2 Les grandes familles de méthodes

| Méthode | Principe | Adapté à |
|--------|----------|----------|
| **Cycle en V** | Phases séquentielles (spécification → conception → codage → tests → recette) | Projets à périmètre stable, contraintes fortes |
| **Agile (Scrum, Kanban)** | Itérations courtes, livraison incrémentale, rétroactions client | Projets à périmètre évolutif, utilisateur actif |
| **Hybride** | Cadrage en V + réalisation itérative | La plupart des projets web modernes |
| **Waterfall** | Séquentiel strict, peu de retours en arrière | Projets réglementaires, faible incertitude |

## 2.3 Les phases classiques d'un projet

Quelle que soit la méthode, on retrouve systématiquement :

1. **Cadrage / initialisation** — pourquoi ? Pour qui ? Avec quoi ?
2. **Analyse des besoins** — quelles fonctionnalités ? Quels critères de succès ?
3. **Conception** — architecture, maquettes, modèle de données
4. **Réalisation** — développement, intégration
5. **Vérification / validation** — tests unitaires, tests d'intégration, recette
6. **Déploiement / mise en production** — livraison à l'utilisateur final
7. **Clôture / maintenance** — bilan, documentation, transfert

## 2.4 Les livrables types d'un chef de projet

- **Expression de besoin** / cahier des charges
- **Planning** (Gantt, roadmap)
- **Registre des risques**
- **Plan de tests**
- **Documentation technique et utilisateur**
- **Compte-rendu de phase / bilan final**

---

# 3. Méthodologie appliquée sur R4

## 3.1 Choix : méthode hybride

J'ai retenu une **approche hybride** :

- **Cadrage en cycle en V** : un gros bloc de spécification et de priorisation en amont (`PLANNING.md`), pour avoir une vision globale
- **Réalisation itérative** : découpage en **5 phases** livrables indépendamment, avec un commit par fonctionnalité terminée

**Pourquoi ce choix :**

- Le périmètre fonctionnel était assez stable (pas de changement côté client)
- Mais les contraintes techniques (SMTP, HTTPS, serveur de prod) ne sont levées qu'au fur et à mesure → itératif indispensable
- Je suis seul sur le projet → pas besoin de rituels Scrum (daily, sprint review)

## 3.2 Outils utilisés

| Besoin | Outil | Justification |
|--------|-------|---------------|
| Suivi des besoins et phases | `PLANNING.md` (Markdown dans le repo) | Versionnable, lisible sur GitHub, reste proche du code |
| Gestion de version | Git + GitHub | Standard industriel, traçabilité commit par commit |
| Suivi des tâches | Cases à cocher dans `PLANNING.md` + tags (B1, F2, Q3...) | Léger, suffisant pour un projet solo |
| Documentation | `README.md`, `INSTALL.md`, `PLANNING.md` | Tout dans le repo = source de vérité unique |
| Communication | Commits taggés par phase (`feat: Phase 2 — …`) | Messages explicites, relisibles |

## 3.3 Traçabilité

Chaque exigence recensée porte un **identifiant** unique :

- `B1`...`B10` — Bloquants (sécurité / stabilité)
- `F1`...`F7` — Fonctionnalités importantes
- `Q1`...`Q7` — Qualité / UX souhaitables

Cet identifiant est **repris dans les messages de commit**, ce qui permet de reconstituer, a posteriori, quelle exigence a été satisfaite par quelle modification. C'est le principe de la **traçabilité des exigences**, exigée sur tout projet sérieux.

Exemple de message de commit :

> `feat: Phase 3 — scores visuels, pages d'erreur, email inscription`
> → couvre `F5`, `Q1`, `Q2`

---

# 4. Recensement et priorisation des besoins

## 4.1 Démarche

1. **Audit initial** du prototype existant (app brute, sans sécurité)
2. **Recensement exhaustif** des manques et des risques
3. **Classification** en 3 niveaux de priorité
4. **Consolidation** dans `PLANNING.md`

## 4.2 Grille de priorisation

| Niveau | Critère | Couleur | Action |
|--------|--------|---------|--------|
| **Bloquant** | Empêche la mise en ligne (sécurité, stabilité) | 🔴 | À traiter avant toute mise en prod |
| **Important** | Fonctionnalité attendue, mais non bloquante | 🟠 | À traiter dans les phases suivantes |
| **Souhaitable** | Amélioration qualité / UX | 🟡 | À traiter si le temps le permet |

Cette grille est **objective et justifiable devant un jury** : elle repose sur le critère *"est-ce que je peux mettre ce site en ligne sans ça ?"*, pas sur une préférence personnelle.

## 4.3 Résultat

- **10 exigences bloquantes** (B1 à B10) — sécurité, config, déploiement
- **7 fonctionnalités importantes** (F1 à F7) — admin CRUD, export, scoring, contact
- **7 exigences de qualité** (Q1 à Q7) — pages erreur, validation email, logs, i18n, index BDD

Total : **24 exigences traçables**, toutes documentées avec un détail et un statut.

---

# 5. Planification — les 5 phases

## 5.1 Vue d'ensemble

| Phase | Contenu | Durée estimée | Statut |
|-------|--------|---------------|--------|
| **Phase 0** — Correctifs immédiats | Sécuriser ce qui bloque la mise en ligne (`.htaccess`, sessions, SQL) | 1–2 jours | ✅ Terminé |
| **Phase 1** — Sécurisation | CSRF, rate limiting, variables d'environnement, HTTPS | 3–5 jours | 🟡 En cours (B2, B9 = actions prod) |
| **Phase 2** — Fonctionnalités admin | CRUD questions/formations, export CSV, dashboard FR | ~1 semaine | ✅ Terminé |
| **Phase 3** — Expérience utilisateur | Scores visuels, pages 404/500, email, contact SMTP | ~1 semaine | 🟡 En cours (F3, F6 = SMTP) |
| **Phase 4** — Mise en production | vhost, import BDD, tests E2E, monitoring | 1–2 jours | ⚪ Bloqué par Phase 1 |

**Délai total estimé : 3 à 4 semaines à plein régime.**

## 5.2 Phase 0 — Correctifs immédiats

**Objectif :** rendre le code *publiable* (ne plus exposer de failles évidentes).

- Correction du SQL de seed (apostrophes cassant les INSERT)
- `.htaccess` racine : protection des dossiers `app/`, `config/`, `database/`
- Flags de session sécurisés (`httponly`, `secure`, `samesite`)
- Suppression de `questions.json` (obsolète, induit en erreur)
- Traduction du dashboard admin en français
- Création d'un script d'installation unique `install.sql`

## 5.3 Phase 1 — Sécurisation

**Objectif :** blinder le site contre les attaques courantes (OWASP Top 10).

- Variables d'environnement (`.env` gitignored, lu par `config.php`)
- Mot de passe DB non vide en prod
- Token **CSRF** sur tous les POST (login, register, answers, admin)
- **Rate limiting** simple sur `/api/auth` (compteur en session)
- **HTTPS** obligatoire (redirect HTTP → HTTPS)
- Procédure d'installation documentée (`INSTALL.md`)

## 5.4 Phase 2 — Fonctionnalités admin

**Objectif :** rendre le site **autonome** (l'établissement gère son contenu sans développeur).

- **CRUD questions** depuis le dashboard (création, édition, suppression, options)
- **CRUD formations** + scoring associé
- **Export CSV** des réponses pour analyse externe
- Dashboard en français (livré en Phase 0)

## 5.5 Phase 3 — Expérience utilisateur

**Objectif :** polir le parcours visiteur.

- **Scores visuels** sur la page résultat (barres de progression par formation)
- **Pages 404 / 500** personnalisées
- **Champ email** à l'inscription (facultatif, stocké en BDD, utilisé pour les contacts)
- **Formulaire de contact** post-test (attend SMTP)
- **Email** à la formation quand l'utilisateur demande à être recontacté (attend SMTP)

## 5.6 Phase 4 — Mise en production

**Objectif :** passer du serveur de dev au serveur final.

- Configuration du vhost Apache/nginx
- Import de la base de données en production
- **Tests de bout en bout** : parcours invité, parcours connecté, parcours admin
- Vérification HTTPS + certificat SSL
- Suppression de `setup.php` et des fichiers de dev
- Mise en place du monitoring basique (logs PHP, accès Apache)

---

# 6. Gestion des risques

## 6.1 Registre des risques identifiés

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| R1 | Credentials DB en dur → fuite sur GitHub | Élevée | Critique | `.env` gitignored (B1) |
| R2 | Compte admin par défaut (`admin/admin`) | Élevée | Critique | Procédure de changement au 1er login (B3) |
| R3 | Brute force sur login | Moyenne | Critique | Rate limiting (B8) |
| R4 | Injection SQL | Moyenne | Critique | Requêtes préparées partout + PDO |
| R5 | XSS sur les questions / réponses | Moyenne | Élevé | Échappement `htmlspecialchars` sur rendu |
| R6 | CSRF sur les actions admin | Moyenne | Élevé | Token CSRF par session (B7) |
| R7 | Accès direct aux dossiers sensibles | Élevée | Élevé | `.htaccess` deny (B4) |
| R8 | SMTP non disponible sur serveur de dev | Certaine | Moyen | Phase 3 en standby, fallback manuel |
| R9 | Temps de développement sous-estimé | Moyenne | Moyen | Découpage en phases livrables indépendamment |
| R10 | Bugs découverts en recette | Moyenne | Moyen | Tests manuels en fin de chaque phase |

## 6.2 Risques résiduels acceptés

- **R8 (SMTP)** : assumé comme bloquant externe, traité en Phase 4 sur le serveur de prod
- Certaines **attaques sophistiquées** (timing attacks, side-channel) : hors périmètre d'un projet d'école, non couvertes

---

# 7. Conduite et suivi

## 7.1 Cérémonial allégé

En tant que seul acteur, je n'ai **pas** mis en place :

- Daily stand-up (sans objet)
- Sprint planning formel
- Rétrospectives collectives

En revanche j'ai conservé :

- **Point de fin de phase** : relecture du `PLANNING.md`, mise à jour des cases à cocher, réorientation si besoin
- **Bilan de commit** : chaque commit correspond à un livrable cohérent, jamais de WIP

## 7.2 Traçabilité des décisions

Trois types de traces :

1. **Git log** — l'enchaînement des commits raconte l'histoire du projet
2. **`PLANNING.md`** — l'état des cases à cocher au moment T reflète l'avancement
3. **`INSTALL.md`** — capitalise les décisions de déploiement (config serveur, variables d'env)

## 7.3 Gestion du périmètre

Une décision volontaire : **ne pas dépendre d'un framework** (pas de Symfony, Laravel, React...).

**Raisons :**

- Projet de validation d'une méthodologie, pas d'une stack
- Zéro coût de build, zéro dette de toolchain
- Lisibilité maximale pour un jury non spécialiste
- Périmètre maîtrisé → pas de « magie » non expliquée

Ce choix a été **documenté et assumé**, pas subi.

---

# 8. Livrables

## 8.1 Livrables techniques

- Code source complet, versionné sur GitHub (`KCVenus/r4`)
- Base de données MySQL (script `install.sql` = schema + migration + seed)
- Fichiers de configuration (`.env.example`, `.htaccess`)
- Pages d'erreur personnalisées (`404.html`, `500.html`)

## 8.2 Livrables documentaires (dans le repo)

| Fichier | Rôle |
|---------|------|
| `README.md` | Présentation rapide + démarrage |
| `PLANNING.md` | **Document central de gestion de projet** |
| `INSTALL.md` | Procédure d'installation et de mise en production |
| `docs/dossier-gestion-projet.md` | Ce document |

## 8.3 Livrables fonctionnels

- Parcours **visiteur** : questionnaire binaire mobile-first
- Parcours **utilisateur connecté** : historique des réponses
- Parcours **admin** : CRUD questions/formations, export CSV, visualisation des réponses

---

# 9. Bilan de projet

## 9.1 Ce qui a bien fonctionné

- **Découpage en 5 phases** : permet de livrer de la valeur dès la Phase 0, sans attendre que tout soit prêt
- **Priorisation par la grille bloquant/important/souhaitable** : force à traiter la sécurité avant le confort
- **Traçabilité ID → commit** : je peux justifier **pourquoi** chaque ligne de code existe
- **Zéro framework** : pas de perte de temps en config, focus sur le fonctionnel

## 9.2 Ce qui a été plus difficile

- **Estimation du temps** : les actions de sécurité (CSRF, rate limiting) sont plus longues qu'elles ne paraissent
- **Tests manuels** : absence de tests automatisés → couverture dépendante de la rigueur des tests de recette
- **Dépendances externes** (SMTP, serveur de prod) : forcent à reporter certaines tâches en fin de projet

## 9.3 Axes d'amélioration pour une V2

- Mettre en place des **tests unitaires PHPUnit** sur les fonctions critiques (auth, scoring)
- Ajouter une **CI/CD** (GitHub Actions) : lint, tests, build
- Migrer vers un **framework léger** (Slim, par exemple) pour structurer les routes
- Formaliser un **vrai registre des risques** tenu à jour (pas juste une table figée)
- Ajouter un **logger centralisé** (Monolog) plutôt que `error_log` PHP natif

## 9.4 Compétences démontrées

- Conduite d'un projet de bout en bout, en autonomie
- Recensement, classification et priorisation des exigences
- Découpage en phases livrables et gestion des dépendances entre phases
- Identification et mitigation des risques (sécurité notamment)
- Capacité à **justifier** chaque choix (technologique, méthodologique, architectural)
- Rédaction de documentation à destination d'un utilisateur tiers (jury, futur mainteneur)

---

# 10. Conclusion

Le projet R4 m'a permis d'assumer le rôle de **chef de projet** sur un périmètre complet : du cadrage initial à la préparation de la mise en production. La méthodologie retenue — **hybride cycle en V / itératif** — est adaptée à un projet web mené en solo, à périmètre stable mais à contraintes évolutives.

Le livrable principal **n'est pas l'application elle-même**, mais la **démarche documentée** qui permet, à n'importe quel moment, de justifier un choix, de reprendre le projet ou de le transférer à une autre équipe. C'est exactement ce qu'un chef de projet doit être capable de produire dans un contexte professionnel.

---

*Arthur Demoisson — CNAM Toulon — Avril 2026*
