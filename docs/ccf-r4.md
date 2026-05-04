---
title: "Cahier des Charges Fonctionnel — R4 Application d'orientation"
author: "Arthur Demoisson"
formation: "Ingénieur Informatique et Multimédia"
ecole: "CNAM Toulon — Université de Toulon"
date: "28 avril 2026"
---

# 1. Présentation du document

## 1.1. Objet

Le présent Cahier des Charges Fonctionnel (ci-après « CCF ») a pour objet de formaliser le besoin métier porté par le Pôle Innovation du CNAM PACA en matière d'aide à l'orientation des publics en recherche de formation. Il décrit l'ensemble des fonctionnalités attendues de l'application web, les exigences non fonctionnelles structurantes, les contraintes du contexte d'exécution, les livrables et les critères d'acceptation. Il constitue le document contractuel de référence entre le commanditaire (Maître d'Apprentissage représentant le Pôle Innovation) et le chef de projet (apprenti) jusqu'à la livraison de la solution.

Ce CCF n'engage pas, à ce stade, de choix techniques d'implémentation. Les décisions d'architecture, de pile technologique, d'infrastructure de déploiement et d'indicateurs de performance seront formalisées dans un second document, le Cahier des Charges Technique (ci-après « CCT »), rédigé en complément du présent et soumis à validation distincte.

## 1.2. Glossaire des termes employés

| Terme | Définition |
|---|---|
| **CCF** | Cahier des Charges Fonctionnel — document décrivant les besoins fonctionnels du commanditaire, indépendamment des choix d'implémentation. |
| **CCT** | Cahier des Charges Technique — document décrivant les contraintes techniques, l'architecture retenue et les indicateurs de performance. |
| **MA** | Maître d'Apprentissage — référent métier de l'apprenti en entreprise. |
| **TA** | Tuteur Académique — référent pédagogique côté école. |
| **MVP** | *Minimum Viable Product* — version minimale livrable d'un produit, suffisante pour collecter du retour utilisateur. |
| **RGPD** | Règlement Général sur la Protection des Données. |
| **WCAG** | *Web Content Accessibility Guidelines* — référentiel d'accessibilité numérique. |
| **CSRF** | *Cross-Site Request Forgery* — attaque informatique exploitant la session d'un utilisateur authentifié. |
| **RNCP** | Répertoire National des Certifications Professionnelles. Niveau RNCP : 5 (bac), 6 (bac+2), 7 (bac+3), 8 (bac+5+). |

## 1.3. Versions et révisions

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| 0.1 | 2026-03-15 | A. Demoisson | Première rédaction, structure générale et besoins métier. |
| 0.5 | 2026-04-08 | A. Demoisson | Ajout des exigences non-fonctionnelles (RGPD, accessibilité, sobriété), revue MA. |
| 0.9 | 2026-04-22 | A. Demoisson | Intégration des retours du Service Hub et du Service Communication, périmètre des 18 formations gelé. |
| 1.0 | 2026-04-28 | A. Demoisson | Validation en réunion M1, version contractuelle. |

# 2. Contexte du projet

## 2.1. Le commanditaire

Le commanditaire est le **Pôle Innovation du CNAM PACA**, cellule transverse du Conservatoire National des Arts et Métiers en région Provence-Alpes-Côte d'Azur. Le Pôle Innovation pilote des projets numériques courts à destination des autres services de l'établissement (Communication, Hub d'inscription, Responsables de formation, Service formations adultes), souvent portés par un unique chef de projet apprenti et appuyés par les compétences métier des services utilisateurs.

L'écosystème numérique préexistant se compose principalement d'un site institutionnel vitrine, d'une plateforme de gestion des inscriptions, de quelques applications métier isolées et de l'infrastructure mutualisée du CNAM. La présente application s'inscrit dans cet écosystème : elle doit être autonome, utile par elle-même, compatible avec l'infrastructure existante, sans introduire de dépendances croisées coûteuses à maintenir.

## 2.2. Les services parties prenantes

Trois services métiers sont co-utilisateurs ou co-décisionnaires de la solution.

- **Service Communication** — pilote la diffusion publique de l'application, notamment auprès des candidats potentiels rencontrés sur salons et journées portes ouvertes. Décide des messages d'incitation à l'usage et de la place de l'outil dans le tunnel d'acquisition.
- **Service Hub d'inscription** — accueille les candidats orientés par l'application. Reçoit les demandes de contact et assure la prise de relais après le test. Sa charge opérationnelle dépend de la qualité de la pré-qualification réalisée par l'outil.
- **Responsables de formation** — fournissent la matière première : descriptifs de formation, prérequis, débouchés, critères d'éligibilité. Valident la pertinence des questions du test pour la classification automatique. Réceptionnent les demandes de contact filées par formation.

Le Maître d'Apprentissage assure la coordination entre ces parties prenantes et arbitre les écarts d'interprétation. Le chef de projet (apprenti) anime les réunions de cadrage et porte la rédaction des livrables.

## 2.3. Le besoin métier

Les services Communication et Hub reçoivent quotidiennement des sollicitations entrantes (mail, téléphone, formulaires génériques) où la personne demande : « Est-ce que vous avez une formation pour moi ? ». Une part significative de ces sollicitations conduit à un appel téléphonique de 15 à 30 minutes pour cerner le profil, identifier le bon niveau scolaire, écarter les formations hors-sujet, puis renvoyer la personne vers un Responsable de formation. Cette charge est consommatrice de temps humain qualifié et débouche, dans une fraction non négligeable des cas, sur un abandon faute de réponse rapide.

L'objectif fonctionnel exprimé est de **pré-qualifier numériquement** ce flux : permettre à un candidat de se positionner en quelques minutes vis-à-vis du catalogue CNAM, avant tout contact humain, afin que les services métier ne traitent que des demandes déjà ciblées. Le besoin n'est pas de remplacer le conseil humain, mais de filtrer et d'orienter, en libérant du temps pour les conversations à forte valeur ajoutée.

## 2.4. Contraintes contextuelles

Le projet est conduit dans le cadre d'une 4<sup>e</sup> année d'apprentissage, ce qui impose plusieurs contraintes structurelles dont le CCF tient compte.

- **Plages de présence alternées** — l'apprenti partage son temps entre l'école et l'entreprise selon un rythme de quinze jours. Le planning prévoit explicitement les semaines école comme des semaines de consolidation documentaire ou de développement asynchrone, et réserve les semaines entreprise aux ateliers, validations et déploiements.
- **Disponibilité variable des interlocuteurs métier** — les Responsables de formation ont une charge d'enseignement prioritaire ; les ateliers de conception sont planifiés sur des créneaux groupés (réunions M2/M3) plutôt que diffus.
- **Infrastructure mutualisée** — le déploiement repose sur les ressources serveur existantes ; toute introduction de dépendance externe nouvelle doit être justifiée et validée par l'administrateur système.
- **Sobriété de moyens** — pas de budget logiciel dédié ; la solution doit reposer sur des outils libres ou déjà en place.

## 2.5. Cadre budgétaire et projection sur trois ans

Le projet est conduit sans enveloppe budgétaire dédiée allouée par le commanditaire. La seule ligne de coût engagée est la **rémunération de l'apprenti chef de projet**, à hauteur de **1 100 € bruts mensuels** sur la durée du semestre. L'ensemble des autres briques (hébergement, base de données, outillage, certificats) repose sur des ressources déjà mutualisées au sein du CNAM PACA ou sur des outils libres sans coût d'acquisition. Cette absence de budget marketing ou logiciel dédié est constitutive de la posture de sobriété affichée en section 2.4 ; elle conditionne aussi les arbitrages techniques décrits ultérieurement (CCT §2.1).

### 2.5.1. Ventilation du coût de réalisation v1

| Poste | Mode de prise en charge | Coût direct projet |
|---|---|---|
| Rémunération apprenti chef de projet | Apprentissage CNAM PACA, ~3 mois de semestre effectif | **3 300 €** (3 × 1 100 €) |
| Hébergement serveur | Infrastructure mutualisée existante CNAM PACA / serveur partagé | 0 € marginal |
| Base de données MySQL | Instance partagée existante | 0 € marginal |
| Certificat TLS | Let's Encrypt (renouvellement automatique) | 0 € |
| Logiciels (PHP, MySQL, nginx, Git) | Open source | 0 € |
| Outillage (GitHub privé, VS Code, navigateurs) | Plans gratuits / licences gratuites | 0 € |
| Dépendances externes applicatives | Aucune (cf. CCT §2.3) | 0 € |
| **Total coût direct v1** | | **≈ 3 300 €** |

La structure de coût est ainsi à **100 % de nature humaine**. Toute évolution ultérieure du périmètre se traduira en jours-homme additionnels, sans création de nouvelle ligne logicielle ou d'infrastructure tant que les hypothèses de charge resteront en deçà des seuils décrits dans le CCT (§10.3).

### 2.5.2. Projection TCO sur trois ans (build vs buy)

L'arbitrage entre développement sur mesure et solution du marché a été instruit selon une projection de coût total de possession à trois ans. Trois scénarios sont comparés : la solution interne retenue (R4), une solution SaaS sur étagère, et un développement clé en main externalisé.

| Scénario | Coût année 1 | Coût récurrent annuel | TCO 3 ans |
|---|---|---|---|
| **R4 — interne, sur mesure (retenu)** | 3 300 € (apprenti) | ~1 000 € (maintenance estimée 1 j/mois × tarif interne) | **~5 300 €** |
| SaaS chatbot d'orientation (Crisp, Intercom, Tally Pro) | 100 € / mois × 12 = 1 200 € | 1 200 € / an | 3 600 € + risque de hausse tarifaire |
| Développement externalisé clé en main | 18 000 € (forfait moyen marché) | 2 500 € / an (tierce maintenance) | **~23 000 €** |

Le scénario interne est légèrement plus coûteux que le SaaS sur trois ans, mais reste un ordre de grandeur en dessous de l'externalisation. Le surcoût face au SaaS est compensé par l'absence de dépendance contractuelle, l'autonomie complète sur la donnée (conformité RGPD facilitée), l'alignement strict au besoin métier (les SaaS génériques exigeraient des contournements), et la pérennité longue traîne (un SaaS abandonné ou racheté impose une migration coûteuse). Cette grille a été présentée et validée en réunion M1.

### 2.5.3. Coûts évités par la solution interne

La quantification des coûts évités complète la justification budgétaire. Trois lignes ont été chiffrées indicativement.

- **Temps conseiller économisé** — l'outil pré-qualifie en amont les contacts entrants, ce qui réduit le nombre d'appels téléphoniques de 15-30 minutes consacrés à du tri de profil. Une économie estimative de 30 minutes par contact pré-qualifié, sur une base raisonnable de plusieurs dizaines de contacts par mois, représente plusieurs jours de temps conseiller libérés par trimestre.
- **Coûts d'opportunité d'abandon** — la fraction de candidats qui abandonnent faute de réponse rapide (cf. §2.3) est en partie convertie par le test, qui propose une orientation immédiate sans attendre la disponibilité d'un Responsable de formation.
- **Coût de licence évité** — un SaaS générique (~1 200 € / an) n'est pas engagé.

Ces économies ne sont pas garanties à ce stade ; leur validation interviendra dans l'évaluation post-déploiement (KPI de conversion test → contact, KPI de taux de complétion).

# 3. Périmètre fonctionnel

## 3.1. Utilisateurs cibles

La solution adresse trois profils utilisateur distincts, chacun avec des droits, des cas d'usage et des contraintes de parcours différents.

| Profil | Description | Authentification | Accès aux fonctionnalités |
|---|---|---|---|
| **Visiteur anonyme** | Personne en réflexion, qui découvre l'outil par un canal externe (salon, site, réseau social). | Aucune. | Test complet, résultat à l'écran, contact d'une formation par lien `mailto:`. Aucun stockage personnel. |
| **Candidat connecté** | Personne ayant créé un compte pour conserver l'historique de ses tentatives. | Identifiant + mot de passe. | Test complet, résultat sauvegardé, accès à un espace personnel listant les tests passés et le catalogue des formations. |
| **Administrateur** | Membre du Pôle Innovation ou Responsable de formation habilité. | Identifiant + mot de passe avec rôle élevé. | Gestion des questions et des formations (CRUD), export des réponses au format CSV pour analyse. |

## 3.2. Cas d'usage principaux

Le périmètre fonctionnel se structure autour de huit cas d'usage primaires. Chacun est instruit à la section 4 sous forme d'exigences détaillées.

1. **UC-1 — Réaliser un test d'orientation anonyme.** Un visiteur déclare son niveau scolaire actuel, répond à une trentaine de questions thématiques et reçoit immédiatement à l'écran les formations CNAM les plus alignées avec son profil.
2. **UC-2 — Demander à être contacté par une formation.** Depuis l'écran de résultat, le visiteur ouvre directement le client mail de son appareil, avec un message pré-rempli adressé au contact de la formation choisie.
3. **UC-3 — Créer un compte et conserver son historique.** Un candidat s'inscrit, retrouve ses tests passés sur une page dédiée et peut comparer les résultats de plusieurs tentatives.
4. **UC-4 — Consulter le catalogue des formations.** Le candidat connecté navigue librement dans le catalogue retenu, indépendamment du test, avec accès à la fiche officielle de chaque formation.
5. **UC-5 — Re-passer un test ultérieurement.** Le candidat peut relancer un test à tout moment ; les résultats anciens restent visibles et datés.
6. **UC-6 — Administrer les questions.** Un administrateur ajoute, modifie ou désactive des questions, des options, et leur pondération vis-à-vis des formations.
7. **UC-7 — Administrer les formations.** Un administrateur ajoute, modifie ou désactive des formations dans le catalogue.
8. **UC-8 — Exporter les réponses pour analyse.** Un administrateur télécharge l'historique anonymisé des réponses au format CSV pour des analyses qualitatives ou statistiques hors application.

## 3.3. Périmètre des formations couvert

Le test ne couvre pas l'intégralité du catalogue CNAM PACA. Sur environ cent formations recensées, **dix-huit ont été retenues** pour figurer dans la version 1, sur la base de critères de demande publique, de couverture des grands domaines, d'équilibre des niveaux RNCP et de spécificité régionale. La liste est gelée en réunion M1 et fait l'objet d'un document distinct (`docs/scope-formations.md`). Cette restriction de périmètre est un choix de design assumé : un catalogue trop large rend le test illisible et ses recommandations diluées ; un catalogue ciblé garde le matching exploitable et la maintenance des questions soutenable.

Les dix-huit formations retenues se répartissent comme suit : cinq formations de niveau RNCP 5 (accessibles bac), huit formations de niveau RNCP 6 (accessibles bac+2), et cinq formations de niveau RNCP 7 (accessibles bac+3 ou plus). Cet équilibre garantit que tout candidat positionné sur le slider de niveau verra des formations éligibles à son profil.

## 3.4. Hors-périmètre

Sont explicitement exclus de la version 1 et reportés à un éventuel R5 ou aux évolutions ultérieures :

- L'inscription en ligne aux formations (gérée par la plateforme Hub existante, sans intégration prévue).
- Le paiement, la facturation, ou tout flux financier.
- La gestion documentaire (CV, lettres de motivation, dossiers d'admission).
- La messagerie interne entre candidats et formations (la prise de contact passe par le client mail du candidat).
- Le suivi pédagogique des candidats inscrits.
- Les statistiques publiques et tableaux de bord à destination de la direction (l'export CSV permet l'analyse, mais aucun *dashboard* embarqué n'est prévu en v1).
- La traduction multilingue de l'interface (français uniquement en v1).
- L'application mobile native (responsive web suffisant en v1).

Cette frontière est nette pour éviter le glissement de périmètre au cours de l'exécution.

# 4. Exigences fonctionnelles

Les exigences sont regroupées par module fonctionnel. Chacune porte un identifiant stable, un libellé court, une priorité (rouge = bloquant, orange = important, jaune = qualité ou amélioration) et un critère d'acceptation testable.

## 4.1. Module pré-test — déclaration de niveau

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-PRE-01 | Slider de niveau scolaire | Rouge | À l'ouverture d'un test, l'utilisateur déclare son niveau actuel via un slider à cinq positions (sans diplôme, bac, bac+2, bac+3, bac+5 et plus). La position courante affiche un libellé textuel actualisé en direct. |
| EF-PRE-02 | Cartographie niveau → formations éligibles | Rouge | Le niveau déclaré filtre les formations recommandées en fin de test selon la règle : bac → niveau 5 ; bac+2 → niveaux 5 et 6 ; bac+3 et plus → niveaux 5, 6 et 7. |
| EF-PRE-03 | Cas « sans diplôme » | Orange | Si l'utilisateur sélectionne « sans diplôme », le bouton de continuation est désactivé et un message l'invite à contacter un conseiller pour une remise à niveau préalable. |
| EF-PRE-04 | Persistance du niveau dans l'historique | Orange | Le niveau choisi est enregistré avec la réponse pour les utilisateurs connectés, afin que l'historique distingue les tests selon le niveau retenu à l'époque. |

## 4.2. Module questionnaire

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-QUI-01 | Format à choix binaire | Rouge | Chaque question présente deux options exclusives. Aucune saisie libre, aucune sélection multiple. |
| EF-QUI-02 | Volume de questions | Rouge | Le test comporte une trentaine de questions thématiques couvrant l'ensemble des grands domaines (informatique, comptabilité, RH, commerce, BTP, électrotechnique, logistique, médico-social) plus un volet soft-skills (style de travail, rigueur, créativité, ambition de responsabilités). |
| EF-QUI-03 | Une seule question par écran | Rouge | Chaque question occupe la totalité de la zone utile de l'écran, sans charge cognitive parasite. La progression est matérialisée par une barre. |
| EF-QUI-04 | Réponse intuitive au tap | Orange | Sur mobile, chaque option est saisissable d'un seul tap, sans nécessité de zoom. La taille des cibles tactiles respecte les recommandations WCAG. |
| EF-QUI-05 | Possibilité de revenir en arrière | Jaune | L'utilisateur peut, en cours de test, modifier une réponse précédente sans perdre les suivantes. |
| EF-QUI-06 | Tolérance aux abandons | Orange | Un abandon en cours de test ne génère aucun stockage côté serveur pour un visiteur anonyme ; pour un utilisateur connecté, seul un test mené à terme est persisté. |

## 4.3. Module recommandation

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-REC-01 | Top 3 formations affichées | Rouge | À la fin du test, l'utilisateur voit les trois formations les plus alignées avec ses réponses, ordonnées par score décroissant. La meilleure correspondance est mise en avant visuellement. |
| EF-REC-02 | Indicateur de compatibilité | Orange | Chaque formation recommandée est accompagnée d'un pourcentage de compatibilité (score normalisé contre la meilleure correspondance) et d'une barre de progression. |
| EF-REC-03 | Description et lien formation | Rouge | Chaque carte de résultat affiche le libellé de la formation, une description courte, et un lien vers la fiche officielle CNAM lorsque celle-ci est connue. |
| EF-REC-04 | Filtre par niveau | Rouge | Aucune formation dont le niveau RNCP excède le niveau déclaré ne peut apparaître dans les recommandations (cf. EF-PRE-02). |
| EF-REC-05 | Fallback en cas de score nul | Jaune | Si la combinaison de réponses ne dégage aucun score (cas marginal), une sélection par défaut compatible avec le niveau déclaré est retournée pour ne jamais afficher d'écran vide. |
| EF-REC-06 | Action « être contacté » | Rouge | Chaque carte propose un bouton qui ouvre le client mail du visiteur, avec destinataire (la formation), sujet et corps pré-remplis. Aucun service mail côté serveur n'est requis. |

## 4.4. Module compte utilisateur

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-CPT-01 | Inscription | Rouge | L'utilisateur crée un compte avec un identifiant unique, un mot de passe et, facultativement, une adresse email. La validité de l'identifiant est contrôlée (longueur, caractères autorisés). |
| EF-CPT-02 | Connexion | Rouge | L'utilisateur se connecte avec ses identifiants. Cinq échecs consécutifs verrouillent la session pendant cinq minutes. |
| EF-CPT-03 | Déconnexion | Rouge | Un bouton de déconnexion détruit la session côté serveur et redirige vers la page d'accueil. |
| EF-CPT-04 | Page « Mon compte » | Rouge | La page personnelle liste l'historique des tests passés (date, niveau choisi, formations recommandées) et expose le catalogue complet des dix-huit formations groupées par niveau RNCP. |
| EF-CPT-05 | Stabilité historique | Orange | Les réponses passées sont snapshotées : une modification ultérieure de la liste des questions ou des formations ne réécrit pas l'historique affiché à l'utilisateur. |
| EF-CPT-06 | Recalcul des recommandations | Jaune | Pour chaque test passé affiché, les formations recommandées sont recalculées à la volée à partir des réponses sauvegardées, de sorte qu'une mise à jour du catalogue propage automatiquement aux résultats historiques. |

## 4.5. Module catalogue

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-CAT-01 | Liste publique des formations | Rouge | Le catalogue des dix-huit formations est exposé via un point d'accès public, accessible sans authentification, ordonné par niveau RNCP puis par nom. |
| EF-CAT-02 | Fiche par formation | Orange | Chaque entrée du catalogue affiche le libellé, la description courte, le niveau RNCP, et un lien vers la fiche officielle CNAM lorsqu'il est renseigné. |
| EF-CAT-03 | Groupement par niveau | Orange | L'affichage du catalogue est groupé visuellement par niveau RNCP avec un en-tête de section explicite. |

## 4.6. Module administration

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-ADM-01 | Accès restreint | Rouge | L'accès aux pages d'administration est réservé aux comptes ayant le rôle administrateur. Toute requête non autorisée renvoie une erreur d'accès refusé. |
| EF-ADM-02 | CRUD questions | Rouge | L'administrateur peut créer, lire, modifier et désactiver des questions, leurs options associées et la pondération vers chaque formation. |
| EF-ADM-03 | CRUD formations | Rouge | L'administrateur peut créer, lire, modifier et désactiver des formations (libellé, description, contact email, lien fiche, niveau RNCP, statut actif). |
| EF-ADM-04 | Export CSV des réponses | Orange | L'administrateur peut télécharger l'historique des réponses au format CSV, en respectant les exigences RGPD (cf. § 5.4). |
| EF-ADM-05 | Désactivation soft | Orange | Les suppressions de questions et formations sont soft (drapeau actif) lorsque l'élément concerne des historiques existants, pour préserver la lisibilité des tests passés. |

## 4.7. Module sécurité (transverse)

| ID | Libellé | Priorité | Critère d'acceptation |
|---|---|---|---|
| EF-SEC-01 | Sessions sécurisées | Rouge | Les cookies de session sont marqués `HttpOnly`, `SameSite=Lax`, et `Secure` lorsque la connexion est en HTTPS. |
| EF-SEC-02 | Protection CSRF | Rouge | Toutes les requêtes mutantes (création, modification, suppression, soumission de réponses) sont protégées par un jeton CSRF lié à la session. |
| EF-SEC-03 | Mot de passe haché | Rouge | Les mots de passe sont stockés sous forme hachée selon une fonction adaptée à l'usage (cf. CCT). Aucun mot de passe n'est conservé en clair, à aucun stade. |
| EF-SEC-04 | HTTPS de bout en bout | Rouge | L'application n'est servie qu'en HTTPS en production. Toute requête HTTP est redirigée vers HTTPS. |
| EF-SEC-05 | Limitation de débit sur l'authentification | Orange | Cinq tentatives de connexion échouées consécutives sur une même session déclenchent un blocage de cinq minutes. |
| EF-SEC-06 | Pages d'erreur personnalisées | Jaune | Les erreurs serveur 404 et 500 affichent une page maison sobre, sans divulguer d'information technique. |

# 5. Exigences non-fonctionnelles

## 5.1. Performance

Le test étant un parcours court réalisé sur mobile dans des conditions de connectivité variables, les exigences de performance perçue sont strictes.

- **Temps de chargement initial** : la page d'accueil doit s'afficher en moins de 2 secondes sur une connexion 4G standard, depuis un navigateur sans cache.
- **Temps de réponse des actions** : la transition entre deux questions, l'affichage du résultat, l'ouverture de la page « Mon compte » doivent intervenir en moins de 500 ms après l'action utilisateur, pour une session déjà ouverte.
- **Volume des assets** : la page d'accueil ne doit pas dépasser 200 ko en transfert utile (HTML+CSS+JS+images), hors polices système. Aucune image lourde n'est embarquée.

## 5.2. Compatibilité

L'application est conçue selon une logique *mobile-first*. Les supports cibles sont :

- **Navigateurs mobiles** : Safari iOS 16+, Chrome Android 11+ (couverture > 90 % des publics étudiants).
- **Navigateurs desktop** : Chrome, Firefox, Edge en versions courantes (n−2). Safari macOS supporté.
- **Internet Explorer** : non supporté (cohérent avec son retrait par Microsoft en 2022).

L'application est responsive sans fracture de mise en page entre 320 px et 1920 px de largeur.

## 5.3. Sécurité

Outre les exigences fonctionnelles transverses listées en EF-SEC-*, l'application doit respecter les principes suivants.

- **Moindre privilège** : l'utilisateur de base de données dédié à l'application n'a que les droits strictement nécessaires (lecture, insertion, mise à jour sur les tables fonctionnelles ; aucun droit *DDL* en production).
- **Variables d'environnement** : aucun secret n'est versionné dans le dépôt de code. Les identifiants de base de données et autres clés sensibles sont chargés depuis des variables d'environnement.
- **En-têtes de sécurité HTTP** : la réponse contient les en-têtes `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Protection des dossiers sensibles** : les répertoires applicatifs (`/app`, `/config`, `/database`) ne sont pas accessibles directement via le serveur web.

## 5.4. Conformité RGPD

Le traitement des données est strictement encadré par le règlement européen sur la protection des données.

- **Données collectées** : pour un visiteur anonyme, aucune donnée personnelle n'est conservée. Pour un utilisateur connecté, seuls le nom d'utilisateur, l'email facultatif, le mot de passe haché et les réponses au test sont stockés.
- **Finalité** : les données ne servent qu'à la pré-qualification d'orientation. Aucun usage commercial, marketing ou de profilage n'est prévu.
- **Durée de rétention** : les comptes inactifs depuis vingt-quatre mois feront l'objet d'une procédure de purge automatisée (mise en œuvre dans une version ultérieure ; en v1, purge manuelle sur demande).
- **Droits des personnes** : l'utilisateur peut demander l'effacement de ses données par courriel à l'adresse de contact du Pôle Innovation. La suppression d'un compte entraîne, par cascade en base de données, la suppression de l'intégralité de ses tests et réponses.
- **Pas de cookies tiers** : aucun outil de traçage tiers (Google Analytics, Hotjar, etc.) n'est intégré. Seul le cookie de session technique est posé.
- **Consentement implicite** : les conditions d'usage sont présentées sur la page d'inscription ; l'usage anonyme du test ne nécessite pas de consentement formalisé puisqu'aucune donnée personnelle n'est collectée.

## 5.5. Accessibilité

L'application vise la conformité au référentiel WCAG 2.1 niveau AA, principes majeurs :

- **Contraste** : ratio minimal de 4,5:1 pour le texte courant, 3:1 pour les éléments de grande taille.
- **Navigation au clavier** : tous les éléments interactifs sont atteignables et activables au clavier seul ; l'ordre de tabulation est cohérent.
- **Lecteurs d'écran** : les composants dynamiques (slider, modal, transitions de vue) exposent les attributs ARIA appropriés (`aria-live`, `aria-modal`, `role`).
- **Texte alternatif** : toute image porteuse de sens dispose d'un attribut `alt`.
- **Mode sombre** : l'application respecte la préférence système (`prefers-color-scheme`) et propose une palette adaptée.

## 5.6. Sobriété numérique

La sobriété est posée comme un principe directeur, pas une option.

- **Pile technique légère** : aucune dépendance d'environnement de build lourd, aucun *bundler* JavaScript, aucun *framework* front-end. Le code livré au navigateur est servi tel qu'il est écrit.
- **Pas de tracking** : aucun outil tiers, aucun script analytique tiers, aucun *pixel* publicitaire.
- **Optimisation des transferts** : compression *gzip* ou *brotli* côté serveur ; mise en cache long terme des assets statiques.
- **Pas de polices distantes** : seules les polices système sont employées.
- **Mesure** : un test *Lighthouse* sur la page d'accueil doit afficher un score de *Performance* > 95 et un *Best Practices* > 95.

## 5.7. Maintenabilité

L'application doit pouvoir être reprise par un autre apprenti ou un développeur prestataire sans phase d'apprentissage longue.

- **Documentation embarquée** : un fichier `README.md` décrit le démarrage rapide ; un fichier `INSTALL.md` détaille la procédure d'installation en production ; un fichier `PLANNING.md` consigne l'avancement et les décisions.
- **Code commenté** : les fonctions et classes non-triviales sont accompagnées d'un *docblock* explicitant leur intention plutôt que leur mécanique.
- **Schéma de base de données** : le schéma SQL est versionné dans le dépôt avec scripts de migration successifs (`migration_v2.sql`, `migration_v3.sql`, etc.).
- **Pas de framework propriétaire** : l'application est écrite en technologies standard pour minimiser la dépendance à un écosystème spécifique.

# 6. Livrables attendus

## 6.1. Livrables techniques

| Livrable | Description | Format |
|---|---|---|
| Code source | Application web complète avec front-end, back-end et schéma de base de données. | Dépôt Git versionné, branche principale `master`. |
| Schéma SQL | Scripts d'installation et de migration de la base de données. | Fichiers `.sql` dans le dépôt. |
| Documentation technique | README, INSTALL, schéma simplifié, diagramme d'architecture (renvoyé au CCT). | Markdown dans le dépôt. |
| Application déployée | Version de production accessible sur un sous-domaine dédié. | URL HTTPS communiquée au commanditaire. |

## 6.2. Livrables documentaires

| Livrable | Description | Format |
|---|---|---|
| Cahier des Charges Fonctionnel | Présent document. | PDF + source Markdown. |
| Cahier des Charges Technique | Document technique complémentaire. | PDF + source Markdown (à produire). |
| Document de planification | `PLANNING.md` versionné, mis à jour au fil du projet. | Markdown dans le dépôt. |
| Plan des réunions | `MEETINGS.md` consignant le calendrier prévisionnel et le template de compte-rendu. | Markdown dans le dépôt. |
| Périmètre des formations | `docs/scope-formations.md` listant les dix-huit formations retenues, justifiant les choix d'inclusion / exclusion. | Markdown dans le dépôt. |
| Rapport R4 | Document final de rendu d'apprentissage. | PDF. |

## 6.3. Livrables de gouvernance

| Livrable | Description |
|---|---|
| Comptes-rendus de réunion | Un compte-rendu par réunion formelle (kickoff, ateliers, comité de validation), versionné dans `docs/cr/`. |
| Issues GitHub | Vingt-quatre issues codifiées par priorité, libellées par phase, reliées à des *milestones*. |
| Project board | *Kanban* GitHub avec colonnes Todo / In Progress / Done, mis à jour à chaque commit. |
| Releases | Trois releases successives marquant les jalons : Phase 0+1, Phase 2, Phase 3. |

# 7. Critères d'acceptation globaux

La solution est réceptionnée par le commanditaire si l'ensemble des conditions suivantes est satisfait :

1. Toutes les exigences fonctionnelles de priorité **rouge** sont implémentées et démontrables.
2. Au moins 80 % des exigences **orange** sont implémentées ; les exceptions sont documentées et justifiées.
3. Les exigences **jaune** non livrées font l'objet d'un report explicite vers une version ultérieure ou un éventuel R5.
4. L'application est accessible en production sous une URL HTTPS valide.
5. Le rapport Lighthouse sur la page d'accueil affiche des scores conformes aux exigences de § 5.6.
6. Le test fonctionnel manuel de bout en bout (parcours visiteur, parcours connecté, parcours administrateur) est passé sans erreur en présence du Maître d'Apprentissage.
7. La documentation (CCF, CCT, README, INSTALL, PLANNING) est à jour et cohérente avec la version livrée.
8. Le rapport R4 est rendu, relu et corrigé sur le plan orthographique.

# 8. Planning prévisionnel

Le projet est planifié en cinq phases temporelles de durée variable, chacune associée à un ensemble d'exigences fonctionnelles à livrer.

| Phase | Périmètre | Durée estimée | Date jalon |
|---|---|---|---|
| **Phase 0** | Correctifs immédiats sur l'existant ; sécurisation `.htaccess`, sessions, traduction. | 1 à 2 jours | Mars 2026 |
| **Phase 1** | Sécurisation : variables d'environnement, jetons CSRF, limitation de débit, redirection HTTPS. | 3 à 5 jours | Mars 2026 |
| **Phase 2** | Fonctionnalités d'administration : CRUD questions, CRUD formations, export CSV, scoring. | ~ 1 semaine | Avril 2026 |
| **Phase 3** | Expérience utilisateur : page de résultat avec scores visuels, pages 404/500 personnalisées, lien de contact `mailto:`. | ~ 1 semaine | Avril 2026 |
| **Phase 4** | Mise en production : configuration vhost, import base, tests de bout en bout, certificat SSL. | 1 à 2 jours | Mai 2026 |
| **Phase 5** | Élargissement du périmètre formations (CNAM PACA), slider niveau, page « Mon compte » avec historique et catalogue, test étendu à trente questions. | ~ 1 semaine | Avril–Mai 2026 |

Le délai total prévisionnel hors marges de sécurité est de quatre semaines à plein régime. Les phases 1 et 4 dépendent d'actions sur le serveur de production ; leur calendrier est subordonné à la disponibilité de l'administrateur système.

# 9. Validation et signatures

Ce CCF est validé par les parties prenantes suivantes, dont la signature engage l'accord sur les exigences listées et les critères d'acceptation associés.

| Rôle | Nom | Date de validation | Signature |
|---|---|---|---|
| Chef de projet | DEMOISSON Arthur | 28/04/2026 | ☑ |
| Maître d'Apprentissage | AUCHET Anne-Flore | 28/04/2026 | ☐ |
| Tuteur Académique | ROCHE Benoît | _en cours_ | ☐ |
| Représentant Service Communication | _à confirmer_ | _en cours_ | ☐ |
| Représentant Service Hub | _à confirmer_ | _en cours_ | ☐ |

Les modifications postérieures à la version 1.0 de ce CCF font l'objet d'un avenant numéroté, soumis à la même procédure de validation.

# 10. Annexes

## Annexe A — Liste des dix-huit formations retenues

La liste complète, les codes officiels CNAM, les niveaux RNCP, les critères d'inclusion et les motifs d'exclusion sont détaillés dans le document `docs/scope-formations.md` versionné dans le dépôt du projet. Cinq formations en niveau 5, huit en niveau 6, cinq en niveau 7. Couverture des domaines : informatique, comptabilité, ressources humaines, commerce, gestion, BTP, électrotechnique, logistique, sanitaire et social.

## Annexe B — Cartographie des questions vers les formations

La pondération de chacune des trente questions vis-à-vis des dix-huit formations est définie dans la table de scoring du schéma de base de données (script `migration_v4_questions.sql`). Cette pondération est la matière première du moteur de recommandation et fait l'objet d'une revue annuelle conjointe avec les Responsables de formation.

## Annexe C — Plan des réunions

Le détail des six réunions formalisées (kickoff M1, ateliers de conception M2 et M3, comité de validation M4, roadmap M5, sync hebdomadaire M6) figure dans `MEETINGS.md`. Chaque réunion produit un compte-rendu archivé dans `docs/cr/AAAA-MM-JJ-MX.md`.

## Annexe D — Glossaire complet

Le glossaire complet des termes métier, techniques et acronymes employés dans la documentation projet figure dans le rapport R4, section dédiée. Le glossaire abrégé figure en § 1.2 du présent CCF.
