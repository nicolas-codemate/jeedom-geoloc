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
                <div class="cursor eqLogicAction logoPrimary" data-action="add">
                    <i class="fas fa-plus-circle"></i>
                    <br>
                    <span>{{Ajouter un widget de carte}}</span>
                </div>
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

    <div class="col-xs-12">
        <legend><i class="fas fa-list"></i> {{Widgets de géolocalisation}}</legend>
        <div class="table-responsive">
            <table class="table table-condensed tablesorter" id="widgetsTable">
                <thead>
                    <tr>
                        <th>{{Nom du widget}}</th>
                        <th>{{Objet parent}}</th>
                        <th>{{Hauteur}}</th>
                        <th>{{État}}</th>
                        <th>{{Actions}}</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $geolocWidgets = eqLogic::byType('geoloc');
                    foreach ($geolocWidgets as $widget) {
                        $parentObject = $widget->getObject();
                        $parentObjectName = $parentObject ? $parentObject->getName() : 'Aucun';
                        $height = $widget->getConfiguration('height', 300);
                        $isEnabled = $widget->getIsEnable();
                        $isVisible = $widget->getIsVisible();
                        
                        echo '<tr data-widget-id="'.$widget->getId().'">';
                        echo '<td>'.$widget->getName().'</td>';
                        echo '<td>'.$parentObjectName.'</td>';
                        echo '<td>'.$height.'px</td>';
                        echo '<td>';
                        if ($isEnabled && $isVisible) {
                            echo '<span class="label label-success">Actif</span>';
                        } elseif ($isEnabled && !$isVisible) {
                            echo '<span class="label label-warning">Masqué</span>';
                        } else {
                            echo '<span class="label label-danger">Inactif</span>';
                        }
                        echo '</td>';
                        echo '<td>';
                        echo '<a class="btn btn-default btn-xs widget-action" data-action="edit" data-widget-id="'.$widget->getId().'" title="Modifier">';
                        echo '<i class="fas fa-pencil-alt"></i></a>';
                        echo ' <a class="btn btn-danger btn-xs widget-action" data-action="remove" data-widget-id="'.$widget->getId().'" title="Supprimer">';
                        echo '<i class="fas fa-minus-circle"></i></a>';
                        echo '</td>';
                        echo '</tr>';
                    }
                    ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Modal pour modifier les propriétés du widget -->
    <div class="modal fade" id="editWidgetModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                    <h4 class="modal-title">{{Modifier le widget}}</h4>
                </div>
                <div class="modal-body">
                    <form name="editWidgetForm">
                        <input type="hidden" name="widget_id" id="edit_widget_id">
                        
                        <div class="form-group">
                            <label for="edit_widget_name">{{Nom du widget}}</label>
                            <input type="text" class="form-control" name="widget_name" id="edit_widget_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit_parent_object">{{Objet parent}}</label>
                            <select class="form-control" name="parent_object" id="edit_parent_object">
                                <option value="">Sélectionner un objet</option>
                                <?php
                                foreach ($objects as $objectId => $object) {
                                    echo '<option value="'.$objectId.'">'.str_repeat('&nbsp;', $object['parentNumber']).$object['name'].'</option>';
                                }
                                ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit_height">{{Hauteur de la carte (px)}}</label>
                            <input type="number" class="form-control" name="height" id="edit_height" min="200" max="800" value="300">
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" name="is_enable" id="edit_is_enable"> {{Actif}}
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" name="is_visible" id="edit_is_visible"> {{Visible}}
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">{{Annuler}}</button>
                    <button type="button" class="btn btn-primary" id="saveWidgetChanges">{{Sauvegarder}}</button>
                </div>
            </div>
        </div>
    </div>

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
