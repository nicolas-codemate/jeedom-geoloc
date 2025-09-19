<?php

include_once __DIR__.'/../../core/class/GeolocalisableEquipment.php';

/**
 * Generate equipment badge HTML for widget table
 * @param string $selectedEquipments Comma-separated equipment IDs
 * @param int $parentObjectId Parent object ID
 * @return string HTML badge
 */
function generateEquipmentBadge($selectedEquipments, $parentObjectId) {
    if (empty($selectedEquipments)) {
        return '<span class="label label-default">Tous</span>';
    }
    
    $equipmentIds = explode(',', $selectedEquipments);
    $equipmentNames = [];
    
    foreach ($equipmentIds as $equipmentId) {
        $equipmentId = trim($equipmentId);
        if (empty($equipmentId)) continue;
        
        $eqLogic = eqLogic::byId($equipmentId);
        if ($eqLogic) {
            $geolocEquipment = new GeolocalisableEquipment($eqLogic);
            if ($geolocEquipment->hasCoordinate()) {
                $equipmentNames[] = $eqLogic->getHumanName();
            }
        }
    }
    
    if (empty($equipmentNames)) {
        return '<span class="label label-warning">Aucun équipement valide</span>';
    }
    
    $count = count($equipmentNames);
    $tooltip = '• ' . implode('<br>• ', $equipmentNames);
    
    return '<span class="label label-info equipment-badge" 
                  data-toggle="tooltip" 
                  data-placement="top" 
                  data-html="true"
                  title="' . htmlspecialchars($tooltip) . '">' 
                  . $count . ' équipement' . ($count > 1 ? 's' : '') . 
           '</span>';
}

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

<!-- Navigation par onglets -->
<ul class="nav nav-tabs" id="geolocTabs" role="tablist">
    <li class="nav-item active">
        <a class="nav-link" id="geolocation-tab" data-toggle="tab" href="#geolocation" role="tab">
            <i class="fas fa-map-marked-alt"></i> {{Géolocalisation}}
        </a>
    </li>
    <li class="nav-item">
        <a class="nav-link" id="widgets-tab" data-toggle="tab" href="#widgets" role="tab">
            <i class="fas fa-th-large"></i> {{Widgets de carte}}
        </a>
    </li>
</ul>

<!-- Contenu des onglets -->
<div class="tab-content" id="geolocTabsContent">
    
    <!-- Onglet Géolocalisation -->
    <div class="tab-pane fade in active" id="geolocation" role="tabpanel">
        <div class="row">
            <div class="col-xs-12 eqLogicThumbnailDisplay">
                <div class="row">
                    <legend><i class="fas fa-cog"></i> {{Gestion}}</legend>
                    <div class="eqLogicThumbnailContainer">
                        <div class="cursor eqLogicAction logoPrimary" data-action="addGeolocation">
                            <i class="fas fa-location-arrow"></i>
                            <br>
                            <span>{{Géolocaliser un équipement}}</span>
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
                <div id="map"></div>
            </div>
        </div>
    </div>

    <!-- Onglet Widgets -->
    <div class="tab-pane fade" id="widgets" role="tabpanel">
        <div class="row" style="margin-top: 20px;">
            <div class="col-xs-12">
                <!-- Actions pour les widgets -->
                <div class="row" style="margin-bottom: 20px;">
                    <div class="col-md-12">
                        <a class="btn btn-success eqLogicAction" data-action="addWidget">
                            <i class="fas fa-plus-circle"></i> {{Créer un widget de carte}}
                        </a>
                    </div>
                </div>
                
                <!-- Tableau des widgets -->
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h3 class="panel-title">
                            <i class="fas fa-th-large"></i> {{Widgets de géolocalisation}}
                        </h3>
                    </div>
                    <div class="panel-body">
                        <table class="table table-condensed table-striped" id="widgetsTable">
                            <thead>
                                <tr>
                                    <th>{{Nom du widget}}</th>
                                    <th>{{Objet parent}}</th>
                                    <th>{{Équipements}}</th>
                                    <th>{{Dimensions}}</th>
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
                                    $width = $widget->getConfiguration('width', 'auto');
                                    $selectedEquipments = $widget->getConfiguration('selectedEquipments', '');
                                    $isEnabled = $widget->getIsEnable();
                                    $isVisible = $widget->getIsVisible();
                                    
                                    echo '<tr data-widget-id="'.$widget->getId().'">';
                                    echo '<td>'.$widget->getName().'</td>';
                                    echo '<td>'.$parentObjectName.'</td>';
                                    echo '<td>'.generateEquipmentBadge($selectedEquipments, $parentObject ? $parentObject->getId() : null).'</td>';
                                    echo '<td>'.$width.' × '.$height.'px</td>';
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
            </div>
        </div>
    </div>
    
</div><!-- /.tab-content -->
    
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
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit_height">{{Hauteur de la carte (px)}}</label>
                                    <input type="number" class="form-control" name="height" id="edit_height" min="200" max="800" value="300">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit_width">{{Largeur du widget}}</label>
                                    <select class="form-control" name="width" id="edit_width">
                                        <option value="auto">Automatique</option>
                                        <option value="100%">100% de largeur</option>
                                        <option value="300px">300px</option>
                                        <option value="400px">400px</option>
                                        <option value="500px">500px</option>
                                        <option value="600px">600px</option>
                                        <option value="800px">800px</option>
                                    </select>
                                </div>
                            </div>
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
                        
                        <div class="form-group">
                            <label>{{Sélection des équipements}}</label>
                            <div class="checkbox" style="margin-bottom: 10px;">
                                <label>
                                    <input type="checkbox" name="show_all_equipment" id="edit_show_all_equipment" checked> {{Afficher tous les équipements de l'objet parent}}
                                </label>
                            </div>
                            <div id="edit_equipment_selection_container" style="display: none;">
                                <label for="edit_selected_equipment">{{Équipements sélectionnés}}</label>
                                <select multiple class="form-control" name="selected_equipment" id="edit_selected_equipment" size="6">
                                    <!-- Options will be populated by JavaScript -->
                                </select>
                                <small class="help-block">{{Maintenez Ctrl (Cmd sur Mac) enfoncé pour sélectionner plusieurs équipements}}</small>
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


    <!-- Inclusion du fichier javascript du plugin (dossier, nom_du_fichier, extension_du_fichier, id_du_plugin) -->
    <?php
    include_file('desktop', 'leaflet', 'css', 'geoloc');
    include_file('desktop', 'custom', 'css', 'geoloc');
    include_file('desktop', 'leaflet', 'js', 'geoloc');
    include_file('desktop', 'leaflet-ant-path', 'js', 'geoloc');
    include_file('desktop', 'geoloc-shared', 'js', 'geoloc');
    include_file('desktop', 'geoloc-admin', 'js', 'geoloc');

    // Inclusion du fichier javascript du core - NE PAS MODIFIER NI SUPPRIMER -->
    include_file('core', 'plugin.template', 'js');
    ?>
