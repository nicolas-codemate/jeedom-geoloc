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

function buildTree(jeeObject $parentObject, array $jMQTTs): array
{
    $items = buildGeolocalisableItems($parentObject, $jMQTTs);

    $toReturn = [
        'id' => $parentObject->getId(),
        'name' => $parentObject->getName(),
        'items' => $items,
        'child' => [],
    ];

    $countItems = count($items);
    foreach ($parentObject->getChild() as $child) {
        $child = buildTree($child, $jMQTTs);
        $toReturn['child'][] = $child;
        $countItems += $child['countItems'];
    }

    $toReturn['countItems'] = $countItems;

    return $toReturn;
}

/**
 * @param jMQTT[] $jMQTTs
 */
function buildGeolocalisableItems(jeeObject $parentObject, array $jMQTTs): array
{
    $geolocalisableItems = [];

    foreach ($jMQTTs as $jMQTT) {
        if (false === $jMQTT instanceof jMQTT) {
            continue;
        }

        if ($jMQTT->getObject_id() !== $parentObject->getId()) {
            continue;
        }

        $geolocalisableItem = new GeolocalisableEquipment($jMQTT);
        if ($geolocalisableItem->hasCoordinate()) {
            $geolocalisableItems[] = $geolocalisableItem;
        }
    }

    return $geolocalisableItems;
}


try {
    require_once dirname(__FILE__).'/../../../../core/php/core.inc.php';
    include_file('core', 'authentification', 'php');

    if (!isConnect('admin')) {
        throw new Exception(__('401 - Accès non autorisé', __FILE__));
    }

    require_once __DIR__.'/../../core/class/geoloc.class.php';

    $action = init('action');

    switch ($action) {
        case "getEquipments":
        {
            $parentObjectId = init('parentObjectId');

            $jMQTTs = jMQTT::all(true);

            if (empty($parentObjectId)) {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::rootObject(false, true);
            } else {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::byId($parentObjectId);
                if (null === $parentObject) {
                    ajax::success([]);
                }
            }

            $objects = buildTree($parentObject, $jMQTTs);

            ajax::success($objects);

            return;
        }
        default:
            throw new RuntimeException(__('Aucune méthode correspondante à', __FILE__).' : '.$action);
    }
} catch (Exception $e) {
    ajax::error(displayException($e), $e->getCode());
}
