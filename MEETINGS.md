# R4 — Plan de réunions et comitologie

> Document vivant : à mettre à jour après chaque réunion. Comptes rendus dans `docs/cr/`.

---

## 1. Cadre

La comitologie du projet R4 repose sur **3 axes de travail** menés en parallèle pour conduire le projet à la livraison finale et préparer la Phase 5 (évolutions post-rendu école) :

- **Axe A — Périmètre formations** : sélection des formations CNAM PACA retenues pour le test
- **Axe B — Conception des questions** : matrice de questions et logique de scoring adaptées au périmètre
- **Axe C — Évolutions futures (Phase 5)** : compte utilisateur, catalogue, slider niveau

Chaque axe donne lieu à 1 à 3 réunions formalisées, avec compte rendu écrit partagé dans les 24 h.

## 2. Synthèse des réunions

| ID | Axe | Sujet | Participants | Format | Fréquence | Livrable |
|---|---|---|---|---|---|---|
| M1 | A | Kickoff périmètre formations | MA + Responsables de formation + Service Hub | 60 min, présentiel | 1× | `docs/scope-formations.md` validé |
| M2 | B | Workshop conception questions (1/2) | MA + Responsables de formation | 90 min, présentiel | 1× | Première matrice questions/options |
| M3 | B | Workshop conception questions (2/2) | MA + Responsables de formation | 90 min, présentiel | 1× | Matrice complétée + règles de scoring |
| M4 | B | Comité de validation questions | MA + tutrice académique | 30 min, visio | 1× | Acceptation formelle des questions |
| M5 | C | Roadmap Phase 5 (futur) | MA + Service Communication | 60 min, présentiel | 1× | `docs/backlog-phase5.md` + issues GitHub `phase:5` |
| M6 | transverse | Sync hebdo MA | MA seul | 30 min, visio ou présentiel | bi-hebdo continu | CR partagé < 24 h |

## 3. Détail des réunions

### M1 — Kickoff périmètre formations

**Objectif** : valider la liste des 18 formations retenues (`docs/scope-formations.md`), recueillir les arbitrages des Responsables de formation, identifier les formations à substituer si nécessaire.

**Ordre du jour**
1. Rappel du cadre R4 et du besoin de filtrage (5 min)
2. Présentation de la liste draft 18 formations + critères de sélection (15 min)
3. Discussion par domaine, arbitrages, substitutions éventuelles (30 min)
4. Validation finale ou liste des points à reboucler (10 min)

**Préparation requise**
- Diffuser `docs/scope-formations.md` aux participants 48 h avant
- Préparer les statistiques d'inscription par formation (Service Hub)

**Sortie attendue** : liste figée signée par MA, prête pour insertion en seed BDD.

---

### M2 — Workshop conception questions (1/2)

**Objectif** : produire la première itération de la matrice de questions à choix binaire, en partant du périmètre validé en M1.

**Ordre du jour**
1. Rappel du périmètre validé (5 min)
2. Méthode de conception : questions discriminantes par paire de domaines (15 min)
3. Brainstorm collectif sur les 5 grandes familles : informatique / gestion / BTP / industrie / santé (60 min)
4. Synthèse et tâches à compléter d'ici M3 (10 min)

**Préparation requise**
- Chaque Responsable apporte 5 à 10 questions discriminant ses formations des autres
- Lecture préalable du fichier `docs/scope-formations.md`

**Sortie attendue** : matrice brute des questions (Google Sheet partagé), à finaliser en M3.

---

### M3 — Workshop conception questions (2/2)

**Objectif** : finaliser la matrice de questions + définir les règles de scoring (poids par option vers chaque formation).

**Ordre du jour**
1. Revue de la matrice brute (15 min)
2. Élimination des doublons et reformulation des questions ambiguës (30 min)
3. Définition des poids de scoring par option (30 min)
4. Validation du format et préparation du comité M4 (15 min)

**Sortie attendue** : matrice finalisée prête pour saisie dans le CRUD admin (F1/F2).

---

### M4 — Comité de validation questions

**Objectif** : faire valider formellement la matrice de questions par la tutrice académique, dans le cadre du processus de validation des livrables (Section 4.5 du rapport R4).

**Ordre du jour**
1. Présentation de la matrice + méthode de scoring (10 min)
2. Revue critique de la tutrice (15 min)
3. Réserves éventuelles + acceptation (5 min)

**Sortie attendue** : validation actée. Réserves mineures traitées sans nouveau comité.

---

### M5 — Roadmap Phase 5 (futur)

**Objectif** : prioriser les évolutions post-livraison école et planifier leur développement.

**Ordre du jour**
1. Présentation des 3 features candidates F8/F9/F10 (15 min)
2. Discussion sur la valeur perçue côté Communication (15 min)
3. Priorisation et estimation grossière (20 min)
4. Création des issues GitHub correspondantes en séance (10 min)

**Préparation requise**
- Lire `docs/backlog-phase5.md` (à rédiger après M5)
- Maquettes papier ou Figma des features F8/F9/F10

**Sortie attendue** : 3 issues GitHub créées avec label `phase:5`, milestone Phase 5, priorité affectée.

---

### M6 — Sync hebdo MA

**Format normé** : 30 min en visio ou présentiel, mêmes 4 sections que les CR (avancement / blocages / décisions / next).

**Cadence** : bi-hebdomadaire, fixe (idéalement créneau récurrent dans l'agenda).

**Compte rendu** : poussé dans `docs/cr/YYYY-MM-DD-M6.md` dans les 24 h suivant la réunion.

## 4. Calendrier prévisionnel

| Semaine | Réunion | Responsable de l'organisation |
|---|---|---|
| S+1 | M1 | Moi (chef de projet) |
| S+2 | M2 | Moi |
| S+3 | M3 | Moi |
| S+3 | M4 | Moi |
| S+4 | M5 | Moi |
| Continu | M6 | MA (planification créneau récurrent) |

> S = semaine de validation du présent document. À ajuster selon la disponibilité réelle des participants.

## 5. Template de compte rendu

À utiliser pour chaque réunion. Fichier à créer dans `docs/cr/YYYY-MM-DD-MX.md`.

```markdown
# Compte rendu M{X} — {sujet}

**Date** : YYYY-MM-DD
**Durée** : XX min
**Participants** : ...
**Auteur du CR** : Arthur Demoisson

## Avancement depuis le dernier point
- ...

## Points bloquants
- ...

## Décisions prises / à prendre
- ...

## Prochaines étapes
- [ ] action — responsable — échéance
- [ ] ...

## Annexes
(captures, liens, documents joints)
```

## 6. Suivi des comptes rendus

Tableau à mettre à jour après chaque réunion.

| Réunion | Date prévue | Date tenue | CR rédigé | CR validé |
|---|---|---|---|---|
| M1 | TBD | — | — | — |
| M2 | TBD | — | — | — |
| M3 | TBD | — | — | — |
| M4 | TBD | — | — | — |
| M5 | TBD | — | — | — |
| M6 (récurrent) | bi-hebdo | — | — | — |
