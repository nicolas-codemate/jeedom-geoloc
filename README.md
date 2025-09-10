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

### Permissions requises
- **Accès administrateur** requis pour la configuration et gestion des widgets
- **Lecture** pour l'affichage des widgets sur le dashboard

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

- **📍 Géolocalisation** : Carte interactive principale avec gestion des équipements
- **🏷️ Widgets de carte** : Gestion dédiée des widgets de dashboard

### Créer un widget de carte

1. Accédez à l'onglet **"Widgets de carte"**
2. Cliquez sur **"Créer un widget de carte"**
3. Configurez les paramètres :
   - **Nom du widget** : Nom affiché sur le dashboard
   - **Objet parent** : Équipements de quel objet afficher
   - **Hauteur** : Hauteur de la carte en pixels (200-800px)
   - **Largeur** : Largeur du widget
     - `Automatique` : S'adapte à l'espace disponible
     - `100% de largeur` : Prend toute la largeur disponible
     - `300px, 400px, 500px, 600px, 800px` : Tailles fixes

### Gestion des widgets

Dans l'onglet **"Widgets de carte"**, vous disposez d'un tableau de gestion complet :

| Fonctionnalité | Description |
|----------------|-------------|
| **✏️ Modifier** | Éditer toutes les propriétés du widget |
| **🗑️ Supprimer** | Supprimer le widget avec confirmation |
| **👁️ État** | Visualiser l'état (Actif/Masqué/Inactif) |

### Fonctionnalités des widgets

Les widgets affichent automatiquement :
- **Carte interactive** avec contrôles de zoom
- **Marqueurs colorés** pour chaque équipement géolocalisé
- **Popups informatifs** au clic sur les marqueurs
- **Actualisation automatique** toutes les 60 secondes
- **Compteur d'équipements** affiché en bas du widget
- **Thème adaptatif** (clair/sombre)

### Utilisation sur le dashboard

1. Créez un ou plusieurs widgets via l'interface de gestion
2. Les widgets apparaissent automatiquement sur le dashboard
3. Chaque widget affiche les équipements de l'objet parent configuré
4. La taille s'adapte selon les paramètres définis (hauteur/largeur)

### Avantages des widgets

- **🎯 Ciblage précis** : Un widget par zone/objet de votre domicile
- **📱 Responsive** : S'adapte aux écrans mobiles et desktop
- **⚡ Performance** : Chargement optimisé et actualisation intelligente
- **🎨 Personnalisable** : Taille et affichage adaptables à vos besoins
- **🔄 Temps réel** : Mise à jour automatique des positions

### Créer un équipement géolocalisable

TODO
- Ajouter un bouton pour créer un équipement géolocalisable directement depuis la carte.
- Déterminer s'il s'agit d'un vrai équipement ou d'un équipement virtuel.
