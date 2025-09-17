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

    switch ($action) {
        case "getEquipments":
        {
            $parentObjectId = init('parentObjectId');

            $eqLogics = eqLogic::all(true);

            if (empty($parentObjectId)) {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::rootObject(false, true);
            } else {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::byId($parentObjectId);
                if (null === $parentObject) {
                    ajax::success([]);
                }
                
                // Check if user has access to this object
                if (!$parentObject->hasRight('r')) {
                    throw new Exception(__('401 - Accès non autorisé à cet objet', __FILE__));
                }
            }

            $objects = buildTree($parentObject, $eqLogics);

            ajax::success($objects);

            return;
        }
        case "getEquipmentsByName":
        {
            $eqName = init('name');

            /** @var eqLogic[] $eqLogics */
            $eqLogics = eqLogic::searchByString($eqName);
            if (!$eqLogics) {
                ajax::success([]);
            }

            $foundEquipments = [];

            foreach ($eqLogics as $eqLogic) {
                $foundEquipments[] = new GeolocalisableEquipment($eqLogic);
            }

            ajax::success($foundEquipments);

            return;
        }
        case "getEquipmentById":
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
                $endDate->add(new DateInterval('P1D')); // the query SQL don't manage the time, so we need to add one day to the end date
            }

            /** @var eqLogic|null $eqLogic */
            $eqLogic = eqLogic::byId($eqLogicId);
            if (!$eqLogic) {
                ajax::error(__('Équipement introuvable', __FILE__));
            }

            // Check if user has access to this equipment's object
            $eqObject = $eqLogic->getObject();
            if ($eqObject && !$eqObject->hasRight('r')) {
                throw new Exception(__('401 - Accès non autorisé à cet équipement', __FILE__));
            }

            $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);

            if ($getHistory) {
                $geolocalisableEquipment->buildCoordinateHistory($startDate, $endDate);
            }

            ajax::success($geolocalisableEquipment);

            return;
        }
        case "addGeolocation":
        {
            $eqLogicId = init('eqLogicId');
            $latitude = init('latitude');
            $longitude = init('longitude');

            /** @var eqLogic|null $eqLogic */
            $eqLogic = eqLogic::byId($eqLogicId);
            if (!$eqLogicId) {
                ajax::error(__('Équipement introuvable', __FILE__));
            }

            DB::beginTransaction();

            // first check if the command already exists
            // otherwise create it

            /** @var cmd|null $cmdLatitude */
            $cmdLatitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LATITUDE_CMD_NAME);
            if (!$cmdLatitude) {
                $cmdLatitude = geolocCmd::build($eqLogic, geolocCmd::LATITUDE_CMD_NAME);
            }

            /** @var cmd|null $cmdLongitude */
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
        case "getGeolocationHistory": {
            $eqLogicId = init('eqLogicId');

            /** @var eqLogic|null $eqLogic */
            $eqLogic = eqLogic::byId($eqLogicId);
            if (null === $eqLogicId) {
                ajax::error(__('Équipement introuvable', __FILE__));
            }

            $geolocalisableEquipment = new GeolocalisableEquipment($eqLogic);
            $geolocalisableEquipment->buildCoordinateHistory();

            ajax::success($geolocalisableEquipment->getCoordinateHistory());

        }
        default:
            throw new RuntimeException(__('Aucune méthode correspondante à', __FILE__).' : '.$action);
    }
} catch (Exception $e) {
    ajax::error(displayException($e), $e->getCode());
}
