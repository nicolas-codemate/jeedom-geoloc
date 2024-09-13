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

require_once dirname(__FILE__).'/../../../core/php/core.inc.php';
include_file('core', 'authentification', 'php');
if (!isConnect()) {
    include_file('desktop', '404', 'php');
    die();
}
?>

<form>
    <div class="col-sm-6">
        <legend><i class="fas fa-folder-open"></i>{{Coordonée et zoom par défaut de la carte}}</legend>
        <div class="form-group row">
            <label for="defaultLatitude" class="col-sm-6 col-form-label">{{Latitude}}</label>
            <div class="col-sm-6">
                <input type="number"
                       id="defaultLatitude"
                       class="configKey form-control "
                       placeholder="{{Latitude}}"
                       data-l1key="configuration" data-l2key="defaultLatitude"/>
            </div>
        </div>
        <div class="form-group row">
            <label for="defaultLongitude" class="col-sm-6 col-form-label">{{Longitude}}</label>
            <div class="col-sm-6">
                <input type="number"
                       id="defaultLongitude"
                       class="configKey form-control"
                       placeholder="{{Longitude}}"
                       data-l1key="configuration" data-l2key="defaultLongitude"/>
            </div>
        </div>
        <div class="form-group row">
            <label for="zoom" class="col-sm-6 col-form-label">{{Default Zoom [0-20]}}</label>
            <div class="col-sm-6">
                <input type="number"
                       class="configKey form-control"
                       min="0"
                       max="19"
                       id="zoom"
                       placeholder="{{Zoom}}"
                       data-l1key="configuration" data-l2key="defaultZoom">
            </div>
        </div>
    </div>
</form>
