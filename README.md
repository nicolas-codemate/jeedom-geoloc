# geoloc

Ce plugin permet d'afficher sur une carte des équipements géolocalisables.

## Installation et Configuration

### Installation
1. Téléchargez et installez le plugin via le Market Jeedom
2. Activez le plugin dans **Plugins > Gestion des plugins**
3. Le plugin sera accessible dans **Plugins > Objets connectés > Géolocalisation**

### Configuration du plugin
Dans la partie configuration du plugin, vous pouvez définir les paramètres suivants :
- **Latitude par défaut** : Latitude de centrage de la carte (ex: 48.8575 pour Paris)
- **Longitude par défaut** : Longitude de centrage de la carte (ex: 2.3514 pour Paris)  
- **Zoom par défaut** : Niveau de zoom initial de la carte (1-20)

Ces paramètres sont utilisés pour centrer la carte si aucun équipement n'est géolocalisé.


## Utilisation
Le plugin va rechercher dans l'ensemble des équipements configurés les commandes de type `info` et de type `numeric` et dont le nom est exactement `latitude` et `longitude`. Si ces commandes sont présentes, l'équipement sera affiché sur la carte.

Il est possible de filtrer les équipements par objet parent. Pour cela, il suffit de sélectionner l'objet parent dans la liste déroulante. La carte se met à jour automatiquement en fonction des équipements sélectionnés.

Il est possible de désélectionner un équipement en cliquant sur le nom de l'équipement dans la liste des équipements.

### Modifier une position
Pour modifier la position d'un équipement, il suffit de cliquer sur le marqueur de l'équipement sur la carte, de déplacer le marqueur et d'appuyer sur le bouton `Modifier la position`. Une modale s'ouvre alors. Il suffit de cliquer sur la carte pour y définir la nouvelle position de l'équipement.

Cela aura pour effet de mettre à jour la valeur des commandes `latitude` et `longitude` de l'équipement. Ces valeurs seront historisées et pourront être utilisées pour afficher l'équipement sur la carte. Si un paramétrage ou un broker est configuré pour mettre à jour ces commandes, la nouvelle position enregistrée manuellement sera alors remplacée.

### Localiser un équipement
Il est possible de localiser n'importe quel équipement en cliquant sur le bouton `Géolocaliser un équipement`.

Dans la modale qui s'ouvre, il est possible de chercher n'importe quel équipement par son nom (3 caractères minimum). Une fois l'équipement trouvé, il suffit de cliquer sur la carte pour enregistrer la position.

Si l'équipement n'a pas encore les commandes `latitude` et `longitude`, elles seront créées automatiquement. Ces commandes pourront alors être utilisées dans n'importe quel dashboard. Par défaut, les valeurs de ces commandes seront historisées.

### Consulter l'historique des positions
En cliquant sur le marqueur d'un équipement sur la carte, il est possible de consulter l'historique des positions de l'équipement en cliquant sur le bouton `Historique`.

Par défaut, seul l'historique de la dernière année est remonté pour limiter l'impact sur la base de données. En effet, la requête peut être lourde pour la base de données selon le nombre de positions historisées pour chaque commande `latitude` et `longitude`.

Il est possible de modifier la période de recherche en modifiant les dates de début et de fin.

## Widgets de géolocalisation

Le plugin propose un système complet de widgets personnalisables pour afficher vos équipements géolocalisés directement sur le dashboard de Jeedom.

### Interface de gestion

L'interface du plugin est organisée en **deux onglets** :

- **Géolocalisation** : Carte interactive principale avec gestion des équipements
- **Widgets de carte** : Gestion dédiée des widgets de dashboard

### Créer un widget de carte

1. Accédez à l'onglet **"Widgets de carte"**
2. Cliquez sur **"Créer un widget de carte"**
3. Configurez les paramètres :
   - **Nom du widget** : Nom affiché dans le titre du widget sur le dashboard
   - **Objet parent** : Sélectionner l'objet dont afficher les équipements
   - **Hauteur** : Hauteur de la carte en pixels (200-800px)
   - **Largeur** : Largeur du widget
     - `Automatique` : S'adapte à l'espace disponible
     - `100% de largeur` : Prend toute la largeur disponible
     - `300px, 400px, 500px, 600px, 800px` : Tailles fixes

### Sélection d'équipements

Lors de la création ou modification d'un widget, vous pouvez choisir quels équipements afficher :

#### **Afficher tous les équipements** (par défaut)
- ✅ **Coché** : Affiche automatiquement tous les équipements géolocalisables de l'objet parent
- Idéal pour des vues d'ensemble ou des objets contenant peu d'équipements

#### **Sélection spécifique d'équipements**
- ❌ **Décoché** : Permet de choisir précisément quels équipements afficher
- Une liste déroulante multiple apparaît avec tous les équipements géolocalisables de l'objet parent
- **Tri alphabétique** : Les équipements sont triés automatiquement par ordre alphabétique
- **Sélection multiple** : Maintenez `Ctrl` (ou `Cmd` sur Mac) enfoncé pour sélectionner plusieurs équipements
- **Pratique pour** :
  - Créer des vues thématiques (ex: seulement les capteurs extérieurs)
  - Réduire l'encombrement sur la carte
  - Créer plusieurs widgets avec des focus différents

> **💡 Astuce** : Après sélection de l'objet parent, la liste des équipements se met à jour automatiquement. Seuls les équipements possédant des commandes `latitude` et `longitude` valides apparaissent dans la liste.

### Gestion des widgets

Dans l'onglet **"Widgets de carte"**, vous disposez d'un tableau de gestion complet :

| Fonctionnalité | Description |
|----------------|-------------|
| **Nom du widget** | Affiche le nom personnalisé du widget |
| **Objet parent** | Indique l'objet source des équipements |
| **Équipements** | Badge intelligent montrant le nombre et la liste des équipements sélectionnés |
| **Dimensions** | Affichage des dimensions configurées (largeur × hauteur) |
| **État** | Statut du widget (Actif/Masqué/Inactif) |
| **Actions** | Boutons pour modifier ou supprimer le widget |

### Fonctionnalités des widgets

#### **Affichage sur le dashboard**
- **Titre personnalisé** : Le nom du widget apparaît dans l'en-tête
- **Compteur d'équipements** : Badge dans le titre affichant le nombre d'équipements actifs
- **Carte interactive** avec contrôles de zoom
- **Marqueurs colorés** pour chaque équipement géolocalisé
- **Adaptation automatique** de la vue pour inclure tous les marqueurs

#### **Interactions et popups**
- **Popups multiples** : Jusqu'à 5 équipements peuvent avoir leur popup ouverte simultanément pour une vue d'ensemble
- **Informations détaillées** : Chaque popup affiche le nom complet et les coordonnées de l'équipement
- **Accès à l'historique** : Bouton direct vers l'historique des positions depuis chaque popup
- **Fermeture flexible** : Les popups restent ouvertes jusqu'à fermeture manuelle

#### **Performances et mise à jour**
- **Actualisation automatique** toutes les 60 secondes
- **Chargement optimisé** : Seuls les équipements géolocalisables sont traités
- **Gestion d'erreurs** : Affichage informatif en cas d'absence d'équipements

#### **Thème et responsive**
- **Thème adaptatif** : Support automatique des thèmes clair/sombre de Jeedom
- **Design responsive** : Adaptation aux différentes tailles d'écran
- **Animations fluides** : Transitions et effets visuels pour une meilleure expérience utilisateur

### Utilisation sur le dashboard

1. **Création** : Créez un ou plusieurs widgets via l'interface de gestion
2. **Affichage automatique** : Les widgets apparaissent automatiquement sur le dashboard de Jeedom
3. **Contenu personnalisé** : Chaque widget affiche :
   - Les équipements de l'objet parent configuré (tous ou sélection spécifique)
   - Le nom personnalisé du widget dans le titre
   - Un badge indiquant le nombre d'équipements géolocalisés
4. **Adaptation visuelle** : La taille et l'apparence s'adaptent selon :
   - Les dimensions configurées (hauteur/largeur)
   - Le thème actif de Jeedom (clair/sombre)
   - L'espace disponible sur le dashboard

#### **Exemples d'usage**
- **Vue générale maison** : Widget "Tous mes équipements" affichant l'ensemble de la maison
- **Surveillance extérieure** : Widget "Capteurs jardin" avec sélection des équipements outdoor
- **Véhicules** : Widget "Trackers voitures" pour le suivi des véhicules familiaux
- **Sécurité** : Widget "Détecteurs périmètre" pour les équipements de sécurité


### Créer un équipement géolocalisable

TODO
- Ajouter un bouton pour créer un équipement géolocalisable directement depuis la carte.
- Déterminer s'il s'agit d'un vrai équipement ou d'un équipement virtuel.

## Améliorations récentes

### ✅ Widgets de dashboard configurables
- Interface de gestion dédiée avec onglet "Widgets de carte"
- Création et modification de widgets personnalisés
- Sélection fine des équipements à afficher (tous ou spécifique)
- Dimensions configurables et thème adaptatif

### ✅ Interface utilisateur améliorée
- Titre personnalisé pour chaque widget
- Badge compteur d'équipements proéminent
- Tri alphabétique automatique des équipements
- Popups multiples pour une meilleure vue d'ensemble (jusqu'à 5 simultanées)

### ✅ Optimisations techniques
- Refactorisation complète du code JavaScript
- Gestion robuste des erreurs et états de chargement
- Amélioration des performances et de la maintenabilité
- Support complet des thèmes clair/sombre
