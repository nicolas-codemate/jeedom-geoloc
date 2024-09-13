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

/** @var jMQTT $eqLogics */
$eqLogics = jMQTT::all(true);

$geolocalisableItems = [];

foreach ($eqLogics as $eqLogic) {
    $coordinate = new Coordinate($eqLogic);
    if ($coordinate->isValid()) {
        $geolocalisableItems[] = $coordinate;
    }
}

sendVarToJS('defaultCordinate', $defaultCordinate);
sendVarToJS('geolocalisableItems', $geolocalisableItems);
sendVarToJS('eqType', $plugin->getId());

?>

<div class="row row-overflow">
    <!-- Page d'accueil du plugin -->
    <div class="col-xs-8">
        <legend><i class="fas fa-map"></i>&nbsp;{{Liste des équipements géolocalisables}}
            <legend>

                <?php
                foreach ($geolocalisableItems as $geolocalisableItem) {
                    $eqLogic = $geolocalisableItem->getEqLogic();
                    $latitude = $geolocalisableItem->getLatitude();
                    $longitude = $geolocalisableItem->getLongitude();

                    echo '<div class="eqLogicThumbnailContainer">'.$eqLogic->getName(
                        ).'Latitude : '.$latitude.' Longitude : '.$longitude.'</div>';
                }
                ?>
    </div>
    <div class="col-xs-4">
        <div class="cursor eqLogicAction" data-action="gotoPluginConf">
            <i class="fas fa-wrench"></i>&nbsp;<span>{{Configuration}}</span>
        </div>
    </div>
</div>
<div class="row row-overflow">
    <div class="col-xs-12">
        <div id="map" style="height: 600px;"></div>
    </div><!-- /.row row-overflow -->

    <!-- Inclusion du fichier javascript du plugin (dossier, nom_du_fichier, extension_du_fichier, id_du_plugin) -->
    <?php
    include_file('desktop', 'leaflet', 'css', 'geoloc');
    include_file('desktop', 'leaflet', 'js', 'geoloc');
    include_file('desktop', 'geoloc', 'js', 'geoloc');

    // Inclusion du fichier javascript du core - NE PAS MODIFIER NI SUPPRIMER -->
    include_file('core', 'plugin.template', 'js'); ?>
    ?>
