<?php
/* This file is part of Jeedom.
 *
 * Jeedom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jeedom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
 */

include(__DIR__.'/../class/GeolocalisableEquipment.php');

/**
 * Handler class for geolocation AJAX requests
 * Centralizes all AJAX logic with proper separation of concerns
 */
class GeolocAjaxHandler
{
    /**
     * Execute the requested action
     * @param string $action The action to execute
     * @throws Exception If action is not supported
     */
    public function execute(string $action): void
    {
        switch ($action) {
            case 'getEquipments':
                $this->handleGetEquipments();
                break;
            case 'getEquipmentsByName':
                $this->handleGetEquipmentsByName();
                break;
            case 'getEquipmentById':
                $this->handleGetEquipmentById();
                break;
            case 'addGeolocation':
                $this->handleAddGeolocation();
                break;
            case 'getGeolocationHistory':
                $this->handleGetGeolocationHistory();
                break;
            case 'getObjectEquipments':
                $this->handleGetObjectEquipments();
                break;
            default:
                throw new RuntimeException(__('Aucune méthode correspondante à', __FILE__).' : '.$action);
        }
    }

    /**
     * Check if user has access to an equipment
     * @param eqLogic $eqLogic Equipment to check
     * @throws Exception If access is denied
     */
    private function checkEquipmentAccess(eqLogic $eqLogic): void
    {
        $eqObject = $eqLogic->getObject();
        if ($eqObject && !$eqObject->hasRight('r')) {
            throw new Exception(__('401 - Accès non autorisé à cet équipement', __FILE__));
        }
    }

    /**
     * Check if user has access to an object
     * @param jeeObject $object Object to check
     * @throws Exception If access is denied
     */
    private function checkObjectAccess(jeeObject $object): void
    {
        if (!$object->hasRight('r')) {
            throw new Exception(__('401 - Accès non autorisé à cet objet', __FILE__));
        }
    }

    /**
     * Get parent object by ID or root object
     * @param string|null $parentObjectId Object ID or null for root
     * @return jeeObject The parent object
     * @throws Exception If object not found or access denied
     */
    private function getParentObject(?string $parentObjectId): jeeObject
    {
        if (empty($parentObjectId)) {
            return jeeObject::rootObject(false, true);
        }

        $parentObject = jeeObject::byId($parentObjectId);
        if (null === $parentObject) {
            throw new Exception(__('Objet parent introuvable', __FILE__));
        }

        $this->checkObjectAccess($parentObject);
        return $parentObject;
    }

    /**
     * Get equipment by ID with access check
     * @param string $eqLogicId Equipment ID
     * @return eqLogic The equipment
     * @throws Exception If equipment not found or access denied
     */
    private function getEquipmentById(string $eqLogicId): eqLogic
    {
        $eqLogic = eqLogic::byId($eqLogicId);
        if (!$eqLogic) {
            throw new Exception(__('Équipement introuvable', __FILE__));
        }

        $this->checkEquipmentAccess($eqLogic);
        return $eqLogic;
    }

    /**
     * Handle getEquipments action
     */
    private function handleGetEquipments(): void
    {
        $parentObjectId = init('parentObjectId');
        $eqLogics = eqLogic::all(true);
        $parentObject = $this->getParentObject($parentObjectId);
        $objects = buildTree($parentObject, $eqLogics);
        ajax::success($objects);
    }

    /**
     * Handle getEquipmentsByName action
     */
    private function handleGetEquipmentsByName(): void
    {
        $eqName = init('name');
        $eqLogics = eqLogic::searchByString($eqName);
        
        if (!$eqLogics) {
            ajax::success([]);
            return;
        }

        $foundEquipments = [];
        foreach ($eqLogics as $eqLogic) {
            $foundEquipments[] = new GeolocalisableEquipment($eqLogic);
        }

        ajax::success($foundEquipments);
    }

    /**
     * Handle getEquipmentById action
     */
    private function handleGetEquipmentById(): void
    {
        $eqLogicId = init('eqLogicId');
        $getHistory = init('getHistory', false);
        $startDate = init('startDate', null);
        $endDate = init('endDate', null);

        if ($startDate) {
            $startDate = new DateTime($startDate);
        }

        if ($endDate) {
            $endDate = new DateTime($endDate);
            $endDate->add(new DateInterval('P1D'));
        }

        $eqLogic = $this->getEquipmentById($eqLogicId);
        $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);

        if ($getHistory) {
            $geolocalisableEquipment->buildCoordinateHistory($startDate, $endDate);
        }

        ajax::success($geolocalisableEquipment);
    }

    /**
     * Handle addGeolocation action
     */
    private function handleAddGeolocation(): void
    {
        $eqLogicId = init('eqLogicId');
        $latitude = init('latitude');
        $longitude = init('longitude');

        $eqLogic = $this->getEquipmentById($eqLogicId);

        DB::beginTransaction();

        $cmdLatitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LATITUDE_CMD_NAME);
        if (!$cmdLatitude) {
            $cmdLatitude = geolocCmd::build($eqLogic, geolocCmd::LATITUDE_CMD_NAME);
        }

        $cmdLongitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LONGITUDE_CMD_NAME);
        if (!$cmdLongitude) {
            $cmdLongitude = geolocCmd::build($eqLogic, geolocCmd::LONGITUDE_CMD_NAME);
        }

        $cmdLatitude->event($latitude);
        $cmdLongitude->event($longitude);

        DB::commit();

        $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);
        ajax::success($geolocalisableEquipment);
    }

    /**
     * Handle getGeolocationHistory action
     */
    private function handleGetGeolocationHistory(): void
    {
        $eqLogicId = init('eqLogicId');
        $eqLogic = $this->getEquipmentById($eqLogicId);
        
        $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);
        $geolocalisableEquipment->buildCoordinateHistory();

        ajax::success($geolocalisableEquipment->getCoordinateHistory());
    }

    /**
     * Handle getObjectEquipments action
     */
    private function handleGetObjectEquipments(): void
    {
        $objectId = init('objectId');
        
        if (!$objectId) {
            ajax::error(__('ID de l\'objet requis', __FILE__));
            return;
        }
        
        $object = jeeObject::byId($objectId);
        if (!$object) {
            ajax::error(__('Objet introuvable', __FILE__));
            return;
        }
        
        $this->checkObjectAccess($object);
        
        $eqLogics = eqLogic::byObjectId($objectId, true);
        $geolocalisableEquipments = [];
        
        foreach ($eqLogics as $eqLogic) {
            if (!$eqLogic->hasRight('r')) {
                continue;
            }
            
            $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);
            if ($geolocalisableEquipment->hasCoordinate()) {
                $geolocalisableEquipments[] = [
                    'id' => $eqLogic->getId(),
                    'name' => $eqLogic->getName(),
                    'humanName' => $eqLogic->getHumanName()
                ];
            }
        }
        
        ajax::success($geolocalisableEquipments);
    }
}

function buildTree(jeeObject $parentObject, array $eqLogics): array
{
    $items = buildGeolocalisableItems($parentObject, $eqLogics);

    $toReturn = [
        'id' => $parentObject->getId(),
        'name' => $parentObject->getName(),
        'items' => $items,
        'child' => [],
    ];

    $countItems = count($items);
    foreach ($parentObject->getChild() as $child) {
        // Check if user has access to child object
        if (!$child->hasRight('r')) {
            continue;
        }
        
        $child = buildTree($child, $eqLogics);
        $toReturn['child'][] = $child;
        $countItems += $child['countItems'];
    }

    $toReturn['countItems'] = $countItems;

    return $toReturn;
}

/**
 * @param eqLogic[] $eqLogics
 */
function buildGeolocalisableItems(jeeObject $parentObject, array $eqLogics): array
{
    $geolocalisableItems = [];

    foreach ($eqLogics as $eqLogic) {
        if ($eqLogic->getObject_id() !== $parentObject->getId()) {
            continue;
        }

        // Check if user has access to this equipment
        if (!$eqLogic->hasRight('r')) {
            continue;
        }

        $geolocalisableItem = new GeolocalisableEquipment($eqLogic);
        if ($geolocalisableItem->hasCoordinate()) {
            $geolocalisableItems[] = $geolocalisableItem;
        }
    }

    return $geolocalisableItems;
}


try {
    require_once dirname(__FILE__).'/../../../../core/php/core.inc.php';
    include_file('core', 'authentification', 'php');

    if (!isConnect()) {
        throw new Exception(__('401 - Accès non autorisé', __FILE__));
    }

    require_once __DIR__.'/../../core/class/geoloc.class.php';

    $action = init('action');

    // Actions requiring admin rights
    $adminOnlyActions = ['addGeolocation'];
    if (in_array($action, $adminOnlyActions) && !isConnect('admin')) {
        throw new Exception(__('401 - Droits administrateur requis pour cette action', __FILE__));
    }

    // Use the new handler class
    $handler = new GeolocAjaxHandler();
    $handler->execute($action);
} catch (Exception $e) {
    ajax::error(displayException($e), $e->getCode());
}
