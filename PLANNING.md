# R4 Survey — Planning de mise en production

> Généré le 2026-03-23

---

## 1. Liste des besoins (avant mise en prod)

### 🔴 Bloquants (sécurité / stabilité)

| # | Besoin | Détail |
|---|--------|--------|
| B1 | Variables d'environnement | `config/config.php` contient les credentials DB en dur. Passer en `.env` ou variables serveur. |
| B2 | Mot de passe DB non vide | `root` sans mot de passe → inacceptable en prod |
| B3 | Changer admin/admin | Comptes par défaut à supprimer / changer avant mise en ligne |
| B4 | Protection des dossiers sensibles | `app/`, `config/`, `database/` accessibles via navigateur → `.htaccess` à la racine |
| B5 | Supprimer `database/setup.php` | Script de setup exécutable par n'importe qui → à supprimer après installation |
| B6 | Flags de session sécurisés | `session.cookie_httponly`, `session.cookie_secure`, `session.cookie_samesite` non configurés |
| B7 | CSRF sur les formulaires | Actions POST (login, register, answers) sans token CSRF |
| B8 | Rate limiting sur l'auth | Brute force possible sur `/api/auth` |
| B9 | HTTPS obligatoire | Redirect HTTP → HTTPS à configurer côté serveur ou `.htaccess` |
| B10 | Correction SQL seed_v2.sql | Les apostrophes dans les descriptions cassent le SQL (`d'information`) |

### 🟠 Importants (fonctionnalités manquantes)

| # | Besoin | Détail |
|---|--------|--------|
| F1 | Interface admin : gestion des questions | CRUD questions/options depuis le dashboard (sans toucher la BDD) |
| F2 | Interface admin : gestion des formations | CRUD formations + scoring depuis le dashboard |
| F3 | Formulaire de contact post-test | Permettre à l'utilisateur de contacter une formation directement depuis la page résultat |
| F4 | Export CSV des réponses | L'admin peut exporter les données pour analyse externe |
| F5 | Page résultat améliorée | Afficher le score/pourcentage par formation, pas juste le classement |
| F6 | Mail de contact | Envoi d'un email à la formation quand un utilisateur demande à être contacté |
| F7 | Réinitialisation de mot de passe | "Mot de passe oublié" — nécessite de stocker un email utilisateur |

### 🟡 Souhaitables (qualité / UX)

| # | Besoin | Détail | Statut |
|---|--------|--------|--------|
| Q1 | Page d'erreur 404 / 500 personnalisée | Actuellement pas de page d'erreur dédiée | ✅ |
| Q2 | Validation email à l'inscription | La colonne `email` existe en BDD mais n'est pas utilisée | ✅ |
| Q3 | Logging des erreurs PHP | `error_log` vers un fichier, pas `display_errors` | ✅ |
| Q4 | Supprimer `questions.json` | Obsolète (les questions sont en BDD), induit en erreur | ✅ |
| Q5 | Optimisation des index BDD | Vérifier les index sur `response_answers`, `survey_responses` | ✅ (index en place) |
| Q6 | admin.html en français | Le dashboard est en anglais, le reste du site est en français | ✅ |
| Q7 | Script d'installation unique | Un seul fichier SQL complet : schema + migration + seed (dans l'ordre) | ✅ |

---

## 2. Planification — Roadmap

### Phase 0 — Correctifs immédiats (1–2 jours)
> Ce qui bloque la mise en ligne

- [x] **B10** — Corriger `seed_v2.sql` (apostrophes échappées) — déjà correct
- [x] **B4** — Ajouter `.htaccess` racine : interdire l'accès à `app/`, `config/`, `database/` — déjà fait
- [x] **B6** — Configurer les flags de session dans `api/index.php`
- [x] **Q4** — Supprimer `questions.json` (obsolète)
- [x] **Q6** — Traduire `admin.html` en français
- [x] **Q7** — Créer `database/install.sql` (schema + migration_v2 + seed en un fichier)

### Phase 1 — Sécurisation (3–5 jours)
> Le site peut tourner, on le blinds

- [x] **B1** — Variables d'environnement (`.env` + lecture dans `config.php`)
- [ ] **B2** — Mot de passe DB en prod (action serveur — voir INSTALL.md)
- [x] **B7** — Token CSRF (génération côté session, vérification sur POST)
- [x] **B8** — Rate limiting simple sur `/api/auth` (compteur en session)
- [ ] **B9** — Redirect HTTPS dans `.htaccess` (décommenter en production — voir INSTALL.md)
- [x] **B3 + B5** — Procédure d'installation documentée (INSTALL.md)

### Phase 2 — Fonctionnalités admin (1 semaine)
> L'établissement peut gérer le contenu sans développeur

- [x] **F1** — CRUD questions dans le dashboard admin
- [x] **F2** — CRUD formations dans le dashboard admin
- [x] **F4** — Export CSV des réponses
- [x] **Q6** — Tableau de bord admin en français (déjà fait en Phase 0)

### Phase 3 — Expérience utilisateur (1 semaine)
> Améliorer le parcours du visiteur

- [x] **F3** — Formulaire de contact post-test : bouton « Être contacté » sur chaque card résultat → ouvre l'app mail du device (lien `mailto:` avec sujet et corps pré-remplis). Pas de modal in-app, pas de backend.
- [x] **F5** — Page résultat avec scores visuels (barres de progression)
- [x] **F6** — Envoi email : délégué au client mail du device via `mailto:`. Pas de SMTP côté serveur (zéro config, zéro credentials, zéro dépendance). Fallback `contact@ohvenus.fr` si la formation n'a pas de `contact_email`.
- [x] **Q1** — Pages 404/500 personnalisées
- [x] **Q2** — Champ email à l'inscription (facultatif, stocké en BDD)

### Phase 4 — Mise en production (1–2 jours)
> Déploiement sur le serveur réel

- [ ] Configuration du vhost Apache sur le serveur de prod
- [ ] Import de la BDD sur le serveur de prod
- [ ] Test de bout en bout (parcours invité, parcours connecté, admin)
- [ ] Vérification HTTPS + certificat SSL
- [ ] Suppression de `setup.php` et des fichiers de dev
- [ ] Monitoring basique (logs PHP, accès Apache)

### Phase 5 — Périmètre CNAM + compte utilisateur
> Élargissement du périmètre formations + parcours connecté

- [x] **F8** — Compte utilisateur : page `account.html` avec historique des tests passés (date, niveau choisi, formations recommandées recalculées). Endpoint `GET /api/me/tests`.
- [x] **F9** — Catalogue : 18 formations CNAM PACA visibles sur la page compte, regroupées par niveau RNCP, avec lien vers la fiche officielle. Endpoint `GET /api/formations`.
- [x] **F10** — Slider niveau pré-test : étape `view-level` après le démarrage, range slider 5 positions (sans diplôme / bac / bac+2 / bac+3 / bac+5+) → mappé sur `user_level` ∈ {0,5,6,7,8}. Côté backend : `Formation::recommend()` filtre `WHERE level <= user_level`, persisté dans `survey_responses.user_level`.
- [x] **DB** — Migration `migration_v3_cnam.sql` : remplace les 5 formations de démo par les 18 retenues (cf. `docs/scope-formations.md`), ajoute `formations.level` + `survey_responses.user_level`, refonte du scoring.

---

## 3. Récapitulatif

| Phase | Durée estimée | Statut |
|-------|--------------|--------|
| Phase 0 — Correctifs immédiats | 1–2 jours | ✅ Terminé |
| Phase 1 — Sécurisation | 3–5 jours | 🟡 En cours (B2 et B9 = actions serveur prod) |
| Phase 2 — Fonctionnalités admin | ~1 semaine | ✅ Terminé |
| Phase 3 — UX | ~1 semaine | ✅ Terminé (contact via `mailto:`, pas de SMTP) |
| Phase 4 — Mise en production | 1–2 jours | ⚪ Bloqué par Phase 1 |
| Phase 5 — CNAM + compte | ~1 semaine | ✅ Terminé (F8/F9/F10 livrés, périmètre 18 formations CNAM) |

**Délai total estimé : 3 à 4 semaines à plein régime**

---

## 4. Prochaines actions immédiates

1. Corriger `seed_v2.sql` (apostrophes) — 15 min
2. Ajouter `.htaccess` racine pour protéger les dossiers — 15 min
3. Configurer les flags de session — 10 min
4. Créer `.env` + adapter `config.php` — 30 min
5. Ajouter CSRF token — 1–2 h
