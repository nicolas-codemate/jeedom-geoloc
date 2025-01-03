<?php

include_once __DIR__.'/../../core/class/Coordinate.php';

if (!isConnect('admin')) {
    throw new Exception('{{401 - Accès non autorisé}}');
}
// Déclaration des variables obligatoires
$plugin = plugin::byId('geoloc');

$defaultCordinate = config::byKey(
    'configuration',
    'geoloc',
    ['defaultLatitude' => 48.8575, 'defaultLongitude' => 2.3514, 'defaultZoom' => 12] // Paris will be used by default
);

$objects = [];
foreach (jeeObject::buildTree() as $object) {
    $objects[$object->getId()] = [
        'name' => $object->getName(),
        'parentNumber' => $object->getConfiguration('parentNumber'),
    ];
}

sendVarToJS('defaultCordinate', $defaultCordinate);
sendVarToJS('eqType', $plugin->getId());

?>

<div class="row row-overflow">
    <div class="col-xs-12 eqLogicThumbnailDisplay">
        <div class="row">
            <legend><i class="fas fa-cog"></i> {{Gestion}}</legend>
            <div class="eqLogicThumbnailContainer">
                <div class="cursor eqLogicAction logoPrimary" data-action="addGeolocation">
                    <i class="fas fa-location-arrow"></i>
                    <br>
                    <span>{{Géolocaliser un équipement}}</span>
                </div>
                <!--                TODO ?-->
                <!--                <div class="cursor eqLogicAction logoPrimary" data-action="addGeolocalisableEquipment">-->
                <!--                    <i class="fas fa-plus-circle"></i>-->
                <!--                    <br>-->
                <!--                    <span>{{Ajouter un équipement géolocalisable}}</span>-->
                <!--                </div>-->
                <div class="cursor eqLogicAction logoSecondary" data-action="gotoPluginConf">
                    <i class="fas fa-wrench"></i>
                    <br>
                    <span>{{Configuration}}</span>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-4">
        <legend><i class="fas fa-map"></i>&nbsp;{{Liste des équipements géolocalisables}}</legend>

        <div class="input-group" style="margin:5px;">
            <label for="parentObjectSelector">{{Objet parent}}</label>
            <select id="parentObjectSelector" class="form-control" style="width: 100%;">
                <?php
                foreach ($objects as $objectId => $object) {
                    echo '<option value="'.$objectId.'">'.str_repeat('&nbsp;', $object['parentNumber']).$object['name'].'</option>';
                }
                ?>
            </select>
        </div>

        <div class="eqLogicThumbnailContainer" id="eqLogicThumbnailContainer">
        </div>
    </div>

    <div class="col-lg-8">
        <div id="map" style="height: 800px;"></div>
    </div><!-- /.row row-overflow -->

    <!-- Inclusion du fichier javascript du plugin (dossier, nom_du_fichier, extension_du_fichier, id_du_plugin) -->
    <?php
    include_file('desktop', 'leaflet', 'css', 'geoloc');
    include_file('desktop', 'custom-leaflet', 'css', 'geoloc');
    include_file('desktop', 'custom', 'css', 'geoloc');
    include_file('desktop', 'leaflet', 'js', 'geoloc');
    include_file('desktop', 'leaflet-ant-path', 'js', 'geoloc');
    include_file('desktop', 'geoloc', 'js', 'geoloc');

    // Inclusion du fichier javascript du core - NE PAS MODIFIER NI SUPPRIMER -->
    include_file('core', 'plugin.template', 'js');
    ?>
