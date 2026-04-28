# Périmètre formations CNAM PACA — R4

> Date : 2026-04-28
> Statut : draft, à valider par les Responsables de formation et le Maître d'apprentissage (réunion M1)

---

## Objectif

Le R4 ne couvre **pas** l'intégralité du catalogue CNAM PACA (~100 diplômes). Il se concentre sur les **18 formations les plus demandées et représentatives**, couvrant les principaux domaines et niveaux (5/6/7), de manière à offrir un test d'orientation lisible et exploitable plutôt qu'une liste exhaustive ingérable.

## Critères de sélection

1. **Demande publique** : formations à fort flux d'inscriptions et notoriété établie en région
2. **Couverture des domaines** : au moins une formation par grand domaine (informatique, gestion, BTP, industrie, santé, logistique)
3. **Couverture des niveaux** : équilibre niveau 5 (bac), 6 (bac+2), 7 (bac+3) pour permettre au test de matcher avec le niveau scolaire de l'utilisateur (cf. F10)
4. **Spécificité PACA** : valoriser les formations à ancrage local fort (ex. Ingé Multimédia · Toulon)

## Liste retenue (18 formations)

### Niveau 5 — accessible bac

| Code | Formation | Domaine |
|---|---|---|
| CP6500A | Certif pro Développeur web junior | Informatique |
| CRN0700A | RNCP Concepteur développeur de solutions informatiques | Informatique |
| CC11600A | CC Gestionnaire de Paye | RH / Paie |
| CP0200A | CP Assistant comptable | Comptabilité |
| CPN7300A | RNCP Assistant de gestion | Gestion |

### Niveau 6 — accessible bac+2

| Code | Formation | Domaine |
|---|---|---|
| LG02501A | Licence Informatique (L3) | Informatique |
| CPN0400A | RNCP Responsable RH | RH |
| LG03607A | Licence Comptabilité Contrôle Audit | Comptabilité |
| LG03606A | Licence Commerce, vente et marketing | Commerce |
| LG03601A | LP Gestion des organisations | Management |
| LG03503A | Licence Génie civil · Ingénierie du bâtiment | BTP |
| LG03903A | Licence Électrotechnique et systèmes | Électrotechnique |
| LP11502A | LP Gestion étab sanitaires/sociaux | Santé / médico-social |

### Niveau 7 — accessible bac+3

| Code | Formation | Domaine |
|---|---|---|
| CYC9106A | Ingénieur Informatique · Cybersécurité | Informatique |
| ING6700A | Ingénieur Informatique · Multimédia · Expérience Interactive (Toulon, alternance) | Informatique / multimédia |
| CYC8301A | Ingénieur Bâtiment | BTP |
| CYC8801A | Ingénieur Génie électrique | Électrotechnique |
| CPN2700A | RNCP Manager de la chaîne logistique | Logistique |

## Formations écartées (motifs)

- **Niche métier** (faible volume) : ergonomie, polymères, immobilier L3, agro
- **Doublons** : variantes alternance/présentiel d'un même cursus, déclinaisons multi-options non différenciantes pour un test grand public
- **UE isolées** : seuls les diplômes/certifications complets sont retenus, pas les unités d'enseignement individuelles
- **Hors public cible** : formations adultes/orientation interne CNAM (CP2900A, CC15900A) qui sont les utilisateurs du R4, pas son public

## Mapping niveau utilisateur → formations éligibles (F10)

Cf. fonctionnalité F10 (slider niveau pré-test) :

| Niveau utilisateur | Formations éligibles |
|---|---|
| Sans diplôme | aucune (message redirection vers conseiller) |
| Bac | niveau 5 uniquement |
| Bac+2 | niveau 5 + 6 |
| Bac+3 | niveau 5 + 6 + 7 |
| Bac+5+ | niveau 5 + 6 + 7 (pas de niveau 8 dans le périmètre) |

## Validation

- [ ] M1 — Kickoff périmètre formations (Resp formations + Service Hub + MA)
- [ ] Liste finale gelée et insérée en seed BDD (`database/seed.sql`)
- [ ] Communication aux Responsables de formation pour préparation des questions

## Source

Catalogue complet : [`/home/ubuntu/second-brain/resources/cnam-paca-formations.md`](../../second-brain/resources/cnam-paca-formations.md) (accès interne, ~100 formations PACA).
