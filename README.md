# Yams Scorekeeper 🎲

Une application web simple et élégante pour comptabiliser les scores du jeu de Yams (Yahtzee). L'application permet de gérer plusieurs pistes de jeu simultanément et sauvegarde automatiquement les scores dans le navigateur.

## Fonctionnalités

- **Multi-pistes** : Gérez jusqu'à plusieurs joueurs/pistes simultanément
- **Calcul automatique** : Les totaux, bonus et scores sont calculés en temps réel
- **Sauvegarde automatique** : Les scores sont persistés dans le localStorage du navigateur
- **Validation des scores** : Vérifie que les scores saisis sont valides selon les règles du Yams
- **Mode biffer** : Permet de barrer une case sans la remplir
- **Configurations prédéfinies** : Modes 3 pistes (Montée, Descente, Libre) et 4 pistes (+ Premier)
- **Interface responsive** : Fonctionne sur desktop et mobile

## Installation

### Option 1 : Docker (recommandé)

#### Prérequis
- Docker
- Docker Compose

#### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/geriwald/yams.git
   cd yams
   ```

2. **Construire et démarrer le conteneur**
   ```bash
   docker-compose up -d
   ```

   L'application sera accessible sur [http://localhost:8081](http://localhost:8081)

#### Commandes utiles

- Arrêter l'application :
  ```bash
  docker-compose down
  ```

- Voir les logs :
  ```bash
  docker-compose logs -f
  ```

- Reconstruire l'image :
  ```bash
  docker-compose up -d --build
  ```

### Option 2 : Serveur web local

#### Prérequis
- Un serveur web (nginx, Apache, ou tout serveur HTTP)

#### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/geriwald/yams.git
   cd yams
   ```

2. **Servir les fichiers statiques**
   
   Avec Python :
   ```bash
   python3 -m http.server 8080
   ```

   Avec Node.js :
   ```bash
   npx serve .
   ```

   Avec PHP :
   ```bash
   php -S localhost:8080
   ```

3. **Accéder à l'application**
   
   Ouvrez votre navigateur à l'adresse indiquée (par exemple [http://localhost:8080](http://localhost:8080))

### Option 3 : Ouvrir directement le fichier HTML

Pour un usage simple, vous pouvez ouvrir directement le fichier `index.html` dans votre navigateur. Cependant, certaines fonctionnalités comme le localStorage peuvent ne pas fonctionner correctement selon les paramètres de sécurité du navigateur.

## Utilisation

1. **Ajouter des joueurs** : Cliquez sur "Pistes" puis choisissez une configuration prédéfinie ou ajoutez des joueurs individuellement

2. **Saisir les scores** : Cliquez sur les cases et entrez les scores. Les totaux se calculent automatiquement

3. **Biffer une case** : Cliquez sur "Biffer" puis sur la case à barrer

4. **Réinitialiser** : Utilisez le bouton "Vider" pour effacer tous les scores

5. **Renommer un joueur** : Cliquez sur le nom du joueur en haut de la colonne

## Technologies utilisées

- HTML5
- CSS3
- JavaScript Vanilla (ES6+)
- Docker & Docker Compose
- Nginx (pour le déploiement)

## Structure du projet

```
yams/
├── index.html              # Page principale
├── assets/
│   ├── app.js             # Logique de l'application
│   └── styles.css         # Styles CSS
├── Dockerfile             # Configuration Docker
├── docker-compose.yml     # Orchestration Docker
├── build-and-save.sh      # Script de build Docker
└── README.md              # Ce fichier
```

## Licence

© 2025 Hubac Family

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
