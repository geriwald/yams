# Historique des versions - Yams Scorekeeper

## v3.3 (Version actuelle)
*Date : Novembre 2025*

### Modifications des fichiers
- **assets/app.js** : 116 lignes modifiées (+97, -19)
- **assets/styles.css** : 16 lignes modifiées (+13, -3)
- **index.html** : 42 lignes modifiées (+22, -20)
- **.vscode/launch.json** : 33 lignes ajoutées (nouveau fichier)

### Améliorations principales

#### 1. Restructuration de l'interface HTML
- Ajout d'un conteneur `app-container` pour améliorer la mise en page centrée
- Modification du titre de la page : "Compteur de Yams" → "Yams Scorekeeper"
- Refonte de la structure avec un conteneur flex pour une meilleure organisation
- Affichage dynamique de la version dans le footer via JavaScript

#### 2. Gestion améliorée du mode biffure (cross mode)
- Nouvelle fonction `setCrossMode()` pour gérer l'activation/désactivation du mode biffure
- Préservation de la référence au bouton toggle même après re-render
- Meilleure gestion de l'état du bouton entre les rendus
- Désactivation automatique du mode après utilisation

#### 3. Gestion du focus et de la sélection dans les inputs
- Conservation du focus sur l'input actif lors des re-renders
- Préservation de la position du curseur et de la sélection de texte
- Amélioration de l'expérience utilisateur lors de la saisie continue

#### 4. Amélioration de l'affichage des valeurs
- Les valeurs `0` sont désormais affichées comme chaînes vides pour plus de clarté
- Affichage amélioré des bonus : "+X" pour positif, vide pour 0
- Cohérence dans l'affichage du total global (vide si 0)

#### 5. Modifications de validation et sanitization
- Acceptation des scores de valeur 0 (auparavant rejetés)
- Normalisation des entrées : traitement des chaînes vides
- Plage de validation : scores entre 0 et 999

#### 6. Ajustements textuels et de libellés
- "Full" → "Full House"
- "Somme supérieure" → "Score"
- "Total général" → "Total"
- "Total global" → "Somme des pistes"
- Suppression de lignes de section redondantes

#### 7. Améliorations CSS
- Ajout du conteneur `.app-container` avec largeur maximale de 700px
- Centrage automatique du contenu
- Amélioration du style des cellules de totaux avec fond sombre
- Suppression du fond semi-transparent des tableaux de scores
- Ajustements responsive pour petits écrans

#### 8. Configuration de développement
- Ajout de `.vscode/launch.json` pour déboguer avec Firefox
- Trois configurations : serveur local, fichier direct, et attach
- Support du rechargement automatique

### Résumé des différences marquantes
Cette version se concentre sur l'**expérience utilisateur** et la **cohérence visuelle** :
- Interface plus centrée et organisée
- Meilleure gestion de la saisie avec préservation du focus
- Affichage plus clair (valeurs vides au lieu de 0)
- Mode biffure plus robuste et fiable
- Amélioration de la configuration de développement

---

## v3.2
*Date : Novembre 2025*

### Modifications des fichiers
- **README.md** : 133 lignes ajoutées (nouveau fichier)
- **assets/app.js** : 18 lignes modifiées (+16, -2)
- **assets/styles.css** : 14 lignes modifiées (+11, -3)
- **docker-compose.yml** : 2 lignes modifiées (+1, -1)
- **index.html** : 2 lignes modifiées (+1, -1)

### Améliorations principales

#### 1. Documentation complète
- **Création du README.md** avec documentation exhaustive :
  - Description de l'application et fonctionnalités
  - Instructions d'installation (Docker, serveur local, fichier direct)
  - Guide d'utilisation détaillé
  - Structure du projet
  - Technologies utilisées
  - Informations de licence et contribution

#### 2. Validation de la catégorie "Chance"
- Ajout d'une validation spécifique : les scores doivent être entre 5 et 30
- Indication visuelle (classe `invalid`) si la valeur est hors limites

#### 3. Gestion du total global multi-pistes
- Affichage conditionnel : le total global n'apparaît que s'il y a plus d'une piste
- Mise à jour automatique du total global lors de modifications de scores
- Calcul de la somme des totaux généraux de toutes les pistes

#### 4. Ajustements CSS
- Amélioration du padding des cellules de catégories (8px 12px)
- Réduction de la largeur minimale des cellules d'en-tête : 140px → 110px
- Ajustements responsive : cellules d'en-tête de 80px → 70px sur mobile
- Correction du padding des en-têtes de tableaux pour les petits écrans

#### 5. Configuration Docker
- Changement de port : 8080 → 8081 dans docker-compose.yml
- Évite les conflits de port avec d'autres services locaux

#### 6. Mise à jour de version
- Version affichée dans le footer : v3.1 → v3.2

### Résumé des différences marquantes
Cette version marque l'**ajout de la documentation officielle** et améliore la **validation des données** :
- Première vraie documentation du projet (README complet)
- Validation plus stricte des scores
- Meilleure gestion du cas multi-pistes
- Optimisation de l'espace d'affichage

---

## v3.1
*Date : Novembre 2025*

### Modifications des fichiers
Depuis le premier commit jusqu'à v3.1 :
- **assets/app.js** : 584 lignes modifiées (refonte majeure)
- **assets/styles.css** : 282 lignes modifiées (refonte majeure)
- **index.html** : 46 lignes modifiées
- **.dockerignore** : 6 lignes ajoutées (nouveau fichier)
- **.gitignore** : 2 lignes ajoutées (nouveau fichier)
- **Dockerfile** : 10 lignes ajoutées (nouveau fichier)
- **build-and-save.sh** : 22 lignes ajoutées (nouveau fichier)
- **docker-compose.yml** : 15 lignes ajoutées (nouveau fichier)

### Améliorations principales

#### 1. Refonte complète de l'interface utilisateur
- Nouveau design moderne avec palette de couleurs sombre
- Restructuration HTML pour une meilleure sémantique
- Titre : "Feuille de Yams" avec interface épurée
- Footer avec copyright et version affichée

#### 2. Système de gestion multi-pistes
- Support de plusieurs joueurs/pistes simultanés
- Configurations prédéfinies :
  - Trois pistes : Descente, Montée, Libre
  - Quatre pistes : Descente, Montée, Libre, Premier
- Possibilité d'ajouter/supprimer des pistes individuellement
- Renommage des pistes en cliquant sur l'en-tête

#### 3. Fonctionnalités de score avancées
- **Calcul automatique des totaux** :
  - Total supérieur avec numérotation des catégories (As=1, Deux=2, etc.)
  - Bonus si score supérieur ≥ 63 (35 points)
  - Total inférieur
  - Total général
  - Total global pour toutes les pistes
- **Avance sur bonus** : affichage de l'avance ou du retard pour obtenir le bonus
- **Validation des scores** :
  - Brelan : multiples de 3 entre 3 et 30
  - Carré : multiples de 4 (4, 8, 12, 16, 20, 24)
  - Scores fixes pour Full (25), Petite suite (30), Grande suite (40), Yams (50)
  - Indication visuelle des valeurs invalides

#### 4. Mode biffure
- Bouton "Biffer" pour activer le mode
- Permet de barrer une case sans y mettre de score
- Style visuel distinct (texte barré, grisé, cursor not-allowed)
- Les cases biffées ne comptent pas dans le total

#### 5. Gestion de l'état et persistance
- Sauvegarde automatique dans localStorage du navigateur
- Restauration des scores au chargement de la page
- Système d'état complet avec gestion de plusieurs tableaux
- Bouton "Vider" pour réinitialiser tous les scores

#### 6. Conteneurisation Docker
- **Dockerfile** : image basée sur nginx:alpine
- **docker-compose.yml** : configuration pour déploiement
  - Port 8080 exposé
  - Health check configuré
  - Restart automatique
- **build-and-save.sh** : script pour construire et sauvegarder l'image
- **.dockerignore** et **.gitignore** : gestion des fichiers

#### 7. Interface responsive
- Adaptation mobile avec ajustement des tailles de police
- Réduction des paddings sur petits écrans
- Largeur minimale des cellules ajustée
- Scrolling horizontal/vertical préservé lors des re-renders

#### 8. Architecture et qualité du code
- Code JavaScript modularisé avec IIFE (Immediately Invoked Function Expression)
- Mode strict activé
- Fonctions pures pour calculs et rendus
- Gestion événementielle centralisée
- CSS variables pour thématisation cohérente

### Résumé des différences marquantes
La version v3.1 représente la **première version complète et fonctionnelle** de l'application :
- Transformation d'un simple compteur en application web complète
- Architecture professionnelle avec séparation des préoccupations
- Déploiement facilité avec Docker
- Expérience utilisateur moderne et intuitive
- Base solide pour les évolutions futures

---

## Notes générales

### Technologies utilisées
- **Frontend** : HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Stockage** : localStorage API
- **Déploiement** : Docker + nginx
- **Versioning** : Git avec tags sémantiques

### Évolution du projet
Le projet a suivi une progression logique :
1. **v3.1** : Base fonctionnelle complète avec Docker
2. **v3.2** : Documentation et validation renforcée
3. **v3.3** : Peaufinage UX et robustesse technique

Chaque version apporte des améliorations ciblées sans régression, démontrant une approche itérative et qualitative du développement.
