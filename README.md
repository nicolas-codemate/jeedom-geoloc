# geoloc

Ce plugin permet d'afficher sur une carte des équipements géolocalisables.

## Configuration
Dans la partie configuration du plugin, vous pouvez définir les paramètres suivants :
- Latitude et Longitude par défaut de la carte.
- Zoom par défaut de la carte.

Ces paramètres sont utilisés pour centrer la carte si aucun équipement n'est géolocalisé

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

### Créer un équipement géolocalisable

TODO
- Ajouter un bouton pour créer un équipement géolocalisable directement depuis la carte.
- Déterminer s'il s'agit d'un vrai équipement ou d'un équipement virtuel.
