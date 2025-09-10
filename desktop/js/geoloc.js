$(async function () {

    const currentTheme = $('body').attr('data-theme');
    let popupClassName = 'light';
    if (currentTheme.endsWith('Dark')) {
        popupClassName = 'dark';
    }

    class DisplayableObjects {
        constructor(map) {
            this.objects = {};
            this.map = map;
        }

        getVisibleObjects() {
            return Object.values(this.objects).filter(object => object.display);
        }

        addObject(object, color = 'red') {
            this.objects[object.id] = object;
            if (object.display) {
                this.buildMarker(object, color);
            }
        }

        updateObject(updatedObject) {
            const object = this.objects[updatedObject.id];
            if (!object) {
                return;
            }
            this.removeMarker(object);
            // update position
            Object.assign(this.objects[object.id], {
                latitude: updatedObject.latitude,
                longitude: updatedObject.longitude
            });
            if (object.display) {
                this.buildMarker(object);
            }
            this.centerMap();
        }

        hideObject(object) {
            this.objects[object.id].display = false;
            this.removeMarker(object);
        }

        removeObject(object) {
            if (!this.objects[object.id]) {
                return;
            }
            this.removeMarker(object);
            delete this.objects[object.id];
        }

        buildPopup(object, marker) {
            let customPopup = `
<h3>
    <img class="lazy" src="plugins/jMQTT/core/img/node_${object.icon}.svg" style="min-height: 24px; height:24px; width:auto;padding-top:1px;">
    ${object.name}
</h3>
<span class="label labelObjectHuman">
    ${object.parents}
</span>
<br>
<br>
<div>
    <a class="btn btn-primary btn-xs map-action" data-action="getHistory" data-eqlogic-id="${object.id}"><i class="fa fa-history"></i> Historique</a>
    <a class="btn btn-warning btn-xs map-action" data-action="updatePosition" data-eqLogic-id="${object.id}"><i class="fa fa-pen"></i> Modifier position</a>
</div>
`;
            marker
                .bindPopup(customPopup, {className: popupClassName})
                .on('popupopen', function () {
                        $('.map-action').off('click').on('click', async function () {
                            await mapActionCallback($(this).data('action'), $(this).data('eqlogicId'));
                        });
                    }
                )
            ;
        }

        buildMarker(object, color = 'red') {
            const marker = L.marker([object.latitude, object.longitude], {
                icon: L.icon({
                    iconUrl: `/plugins/geoloc/desktop/css/images/marker-icon-2x-${color}.png`,
                    shadowUrl: '/plugins/geoloc/desktop/css/images/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(this.map);

            if (object.hasOwnProperty('displayPopup') && object.displayPopup) {
                // don't create popup for the new position marker
                this.buildPopup(object, marker);
            }
            this.objects[object.id].marker = marker;
        }

        centerMap() {
            const visibleObjects = this.getVisibleObjects();
            if (0 === visibleObjects.length) {
                // Force clear any remaining markers when no objects should be visible
                this.clearAllMapMarkers();
                this.resetMapDefaultPosition();
                return;
            }
            
            // Filter objects that actually have markers
            const markersArray = visibleObjects
                .filter(object => object.marker)
                .map(object => object.marker);
                
            if (markersArray.length === 0) {
                // Force clear any remaining markers when no valid markers exist
                this.clearAllMapMarkers();
                this.resetMapDefaultPosition();
                return;
            }
            
            const group = new L.featureGroup(markersArray);
            this.map.flyToBounds(group.getBounds().pad(0.1), {animate: true, duration: 1, maxZoom: 17});
        }

        clearAllMapMarkers() {
            // Force remove all marker-like layers from the map
            this.map.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
                    this.map.removeLayer(layer);
                }
            });
        }

        removeMarker(object) {
            if (this.objects[object.id] && this.objects[object.id].marker) {
                this.map.removeLayer(this.objects[object.id].marker);
                delete this.objects[object.id].marker;
            }
        }

        openPopup(object) {
            if (this.objects[object.id] && this.objects[object.id].marker) {
                this.objects[object.id].marker.openPopup();
            }
        }

        closePopup(object) {
            if (this.objects[object.id] && this.objects[object.id].marker) {
                this.objects[object.id].marker.closePopup();
            }
        }

        resetMapDefaultPosition() {
            this.map.setView(
                [defaultCordinate.defaultLatitude, defaultCordinate.defaultLongitude],
                defaultCordinate.defaultZoom,
                {
                    animate: true, pan: {
                        "duration": 10
                    }
                }
            );
        }

        reset() {
            // Remove all markers from objects
            for (const key in this.objects) {
                if (this.objects.hasOwnProperty(key)) {
                    const element = this.objects[key];
                    if (element instanceof Object) {
                        this.removeMarker(element);
                        delete this.objects[key];
                    }
                }
            }
            
            // Force clear all layers except the tile layer to ensure no ghost markers
            this.map.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
                    this.map.removeLayer(layer);
                }
            });
            
            // Clear the objects collection
            this.objects = {};
            
            this.resetMapDefaultPosition();
        }
    }

    let displayableObjects;

    const mapActionCallback = async function (action, eqLogicId) {
        switch (action) {
            case "updatePosition":
                await initAddGeolocationModal(eqLogicId);
                break;
            case "getHistory":
                await initGeolocationHistory(eqLogicId);
                break;
            default:
                console.error('Unknown action:', action);
        }
    }

    const searchEquipment = async function (equipmentName) {

        const data = `action=getEquipmentsByName&name=${equipmentName}`;

        try {
            const response = await $.ajax({
                url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                type: 'POST',
                data,
                cache: false,
                processData: false,
            });

            const returnData = JSON.parse(response);
            if (returnData.state !== 'ok') {
                $.fn.showAlert({message: returnData.result, level: 'error'});
                return;
            }

            return returnData;
        } catch (error) {
            console.error('Error fetching equipments:', error);
        }
    }

    const buildMap = function (htmlElementId = 'map', customZoom) {
        let {defaultLatitude, defaultLongitude, defaultZoom} = defaultCordinate;

        if (customZoom) {
            defaultZoom = customZoom;
        }

        const mainMap = L.map(htmlElementId).setView([defaultLatitude, defaultLongitude], defaultZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 20,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mainMap);

        return mainMap;
    }

    const initConfirmModal = function (size, title, message, ajaxAction, onShownCallback, onHideCallback) {

        let hasSuccess = false;

        const options = {
            title,
            message,
            size,
            buttons: {
                confirm: {
                    label: 'Valider',
                    className: 'btn-success'
                },
                cancel: {
                    label: 'Annuler',
                    className: 'btn-danger'
                }
            },
            onShown: async function () {
                if (onShownCallback) {
                    onShownCallback();
                }
            },
            onHide: async function () {
                if (onHideCallback) {
                    onHideCallback();
                }
            },
            callback: function (result) {
                if (!result) {
                    return;
                }

                const $acceptButton = $('.bootbox-accept');
                const $cancelButton = $('.bootbox-cancel');
                [$acceptButton, $cancelButton].forEach(button => {
                    button.attr('disabled', 'disabled');
                    button.addClass('disabled');
                });
                $acceptButton.html('Envoi en cours...');

                const formData = new FormData(document.forms['ajaxForm']);
                formData.append('action', ajaxAction);
                formData.delete('eqLogicId');
                formData.append('eqLogicId', $('#eqLogicId').data('selected-id'));
                $.ajax({
                    url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                    type: 'POST',
                    data: formData,
                    async: false,
                    success: function (data) {
                        const returnData = JSON.parse(data);
                        if (returnData.state !== 'ok') {
                            $.fn.showAlert({message: returnData.result, level: 'error'});
                            [$acceptButton, $cancelButton].forEach(button => {
                                button.removeAttr('disabled');
                                button.removeClass('disabled');
                            });
                            $acceptButton.html('Valider');

                            return;
                        }
                        hasSuccess = true;
                        displayableObjects.updateObject(returnData.result);
                        $.fn.showAlert({message: 'Succès', level: 'success'});
                    },
                    cache: false,
                    contentType: false,
                    processData: false,
                });
            }
        }

        bootbox.confirm(options);
    };
    const initDialogModal = function (size, title, message, onShownCallback) {
        const options = {
            title,
            message,
            size,
        };

        if (onShownCallback) {
            options.onShown = onShownCallback;
        }

        bootbox.dialog(options);
    };

    const buildObject = function (jeeObject) {
        jeeObject.display = true; // by default, we display the object
        jeeObject.displayPopup = true; // by default, we display the object
        displayableObjects.addObject(jeeObject);
        return `
<div class="eqLogicDisplayCard cursor displayAsTable" data-object="${jeeObject.id}">
    <img alt="objectIcon" class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.humanName}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <input type="checkbox" name="objectVisible" class="eqLogicVisible" checked data-object-id="${jeeObject.id}">
    </span>
</div>
`;
    }

    // build plugin index page with equipements list and current state
    const buildEqLogicContainer = function (data) {
        displayableObjects.reset();
        const container = $('#eqLogicThumbnailContainer');
        container.find('div').remove();

        if (!data) {
            return;
        }

        const buildItems = function (jeeObject) {
            let items = [];

            if (jeeObject.items.length > 0) {
                items = jeeObject.items.map(equipment => buildObject(equipment));
            }

            if (jeeObject.child.length > 0) {
                jeeObject.child.forEach(child => {
                    items.push(...buildItems(child));
                });
            }

            return items.filter(equipment => equipment.length > 0);
        }

        const items = buildItems(data.result);

        container.append(items.join(''));

        // Restore saved visibility states for this parent object
        const currentParentId = $('select#parentObjectSelector').val();
        const savedVisibility = getChildObjectsVisibility(currentParentId);
        
        if (savedVisibility) {
            // Apply saved visibility states
            Object.keys(savedVisibility).forEach(objectId => {
                const checkbox = $(`input.eqLogicVisible[data-object-id="${objectId}"]`);
                const isVisible = savedVisibility[objectId];
                checkbox.prop('checked', isVisible);
                
                const object = displayableObjects.objects[objectId];
                if (object) {
                    if (isVisible) {
                        object.display = true;
                        displayableObjects.buildMarker(object);
                    } else {
                        object.display = false;
                        displayableObjects.hideObject(object);
                    }
                }
            });
        }

        $('.eqLogicDisplayCard')
            .on('mouseenter', function () {
                const objectId = $(this).data('object');
                displayableObjects.openPopup(displayableObjects.objects[objectId]);
            })
            .on('mouseleave', function () {
                const objectId = $(this).data('object');
                displayableObjects.closePopup(displayableObjects.objects[objectId]);

            });

        $('.eqLogicDisplayCard > span.name').on('click', function () {
            const objectId = $(this).parent().data('object');
            const checkbox = $(`input.eqLogicVisible[data-object-id="${objectId}"]`);
            checkbox.prop('checked', !checkbox.prop('checked'));
            checkbox.trigger('change');
        });


        bindToggleVisibility();

        displayableObjects.centerMap();

        if (0 === items.length) {
            displayableObjects.reset();
            container.append('<div style="margin-top:20px;margin-left:20px"><span class="label label-warning"">Aucun équipement géolocalisable trouvé</span></div>');
        }
    };

    const bindToggleVisibility = function () {
        $('.eqLogicVisible').on('change', function () {
            const objectId = $(this).data('object-id');
            const object = displayableObjects.objects[objectId];
            if ($(this).is(':checked')) {
                object.display = true;
                displayableObjects.buildMarker(object);
            } else {
                object.display = false;
                displayableObjects.hideObject(object);
            }
            
            // Always center map after visibility change (will clear if no visible objects)
            displayableObjects.centerMap();
            
            // Save current visibility state for all child objects of current parent
            const currentParentId = $('select#parentObjectSelector').val();
            const currentVisibility = {};
            $('.eqLogicVisible').each(function() {
                const childObjectId = $(this).data('object-id');
                currentVisibility[childObjectId] = $(this).is(':checked');
            });
            saveChildObjectsVisibility(currentParentId, currentVisibility);
        });
    }

    // send ajax call to get equipments from broker and parent object
    const searchEquipments = async function (parentObjectId) {
        if (!parentObjectId) {
            return [];
        }
        let data = `action=getEquipments&parentObjectId=${parentObjectId}`;

        try {
            const response = await $.ajax({
                url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                type: 'POST',
                data,
                cache: false,
                processData: false,
            });

            const returnData = JSON.parse(response);
            if (returnData.state !== 'ok') {
                $.fn.showAlert({message: returnData.result, level: 'error'});
                return;
            }

            return returnData;
        } catch (error) {
            console.error('Error fetching equipments:', error);
        }
    };
    // send ajax call to get equipments from broker and parent object
    const getEquipment = async function (eqLogicId, getHistory = false, startDate, endDate) {
        let data = `action=getEquipmentById&eqLogicId=${eqLogicId}`;

        if (getHistory) {
            data += '&getHistory=true';
            if (startDate) {
                data += `&startDate=${startDate.toDateString()}`;
            }
            if (endDate) {
                data += `&endDate=${endDate.toDateString()}`;
            }
        }

        try {
            const response = await $.ajax({
                url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                type: 'POST',
                data,
                cache: false,
                processData: false,
            });

            const returnData = JSON.parse(response);
            if (returnData.state !== 'ok') {
                $.fn.showAlert({message: returnData.result, level: 'error'});
                return;
            }

            return returnData;
        } catch (error) {
            console.error('Error fetching equipments:', error);
        }
    };

    const loadEquipmentsList = async function () {
        const objectParent = $('select#parentObjectSelector');
        const data = await searchEquipments(objectParent.val());
        if (data) {
            buildEqLogicContainer(data);
        }
    }

    const initAddGeolocationModal = async function (eqLogicId) {
        let readonly = false;
        let equipmentName = '';
        let equipment;

        if (eqLogicId) {
            const data = await getEquipment(eqLogicId);
            if (data) {
                equipment = data.result;
                equipmentName = equipment.fullHumanName;
                readonly = true;
            }
        }

        let dialog_message = `
<form name="ajaxForm"
    <div class="row" id="searchContainer">
        <div class="form-group col-md-12" style="margin-bottom: 30px">
            <label for="eqLogicId" class="control-label">Nom de l'équipement</label>
            <input type="text" class="form-control" id="eqLogicId" name="eqLogicId" placeholder="Nom de l'équipement" ${readonly ? "readonly" : ''} value="${equipmentName}">
        </div>
    </div>
    <div id="actionForm" style="display: none;">
        <div class="form-group col-lg-4 col-md-5 col-xs-6">
            <div>
                <button type="button" style="margin-bottom: 10px;" id="resetView" class="btn btn-default">Réinitialiser la vue</button>
            </div>
            <label for="latitude" class="control-label">Latitude</label>
            <input type="text" class="form-control" id="latitude" name="latitude" placeholder="Latitude">
            
            <label for="longitude" class="control-label">Longitude</label>
            <input type="text" class="form-control" id="longitude" name="longitude" placeholder="Longitude">
        </div>
        <div class="form-group col-lg-8 col-md-7 col-xs-6">
            <div id="addGeolocationMap" style="height:400px;"></div>
        </div>
    </div>
</form>
        `;
        let addGeolocationMap
        let $latitude;
        let $longitude;
        let $acceptButton;

        const disableAcceptButton = function () {
            $acceptButton.attr('disabled', 'disabled');
            $acceptButton.addClass('disabled');
        }

        const enableAcceptButton = function () {
            $acceptButton.removeAttr('disabled');
            $acceptButton.removeClass('disabled');
        }

        const handleAddLocationForm = function (object) {
            $('#eqLogicId').data('selected-id', object.id);

            $('#actionForm').show();
            if (!addGeolocationMap) {
                addGeolocationMap = buildMap('addGeolocationMap');
            }
            const addGeolocationObject = new DisplayableObjects(addGeolocationMap);
            if (object.latitude && object.longitude) {
                $latitude.val(object.latitude);
                $longitude.val(object.longitude);
                object.display = true;
                addGeolocationObject.addObject(object);
                addGeolocationObject.centerMap();
                enableAcceptButton();
            }

            $('button#resetView').off('click').on('click', function () {
                addGeolocationObject.resetMapDefaultPosition();
            });

            const onclickMap = function (e) {
                addGeolocationObject.removeObject({id: 0}); // remove previously clicked position
                // create a new object with the new position
                addGeolocationObject.addObject({
                        id: 0,
                        name: 'Nouvelle position',
                        latitude: e.latlng.lat,
                        longitude: e.latlng.lng,
                        display: true,
                    },
                    'green');
                $latitude.val(e.latlng.lat);
                $longitude.val(e.latlng.lng);
                enableAcceptButton();
            }
            addGeolocationMap.on('click', onclickMap);
        }

        const handleAutocompleteSelect = async function (event, ui) {
            if (!ui.item.id) {
                $('#actionForm').hide();
                return;
            }

            const object = {
                id: ui.item.id,
                name: ui.item.label,
                latitude: ui.item.latitude,
                longitude: ui.item.longitude,
                display: true
            };

            handleAddLocationForm(object);
        };

        const onHideCallback = async function () {
            if (!equipment) {
                // no equipement, we need to refresh the list to newly position of our equipment
                await loadEquipmentsList();
            }
            // if equipment is provided, we don't need to refresh the list since we are updating the position
        };

        const bindAddGeolocationModal = async function () {
            $acceptButton = $('.bootbox-accept');
            $latitude = $('#latitude');
            $longitude = $('#longitude');

            disableAcceptButton();

            if (equipment) {
                $('#eqLogicId').data('selected-id', equipment.id);
                $latitude.val(equipment.latitude);
                $longitude.val(equipment.longitude);
                if ($latitude.val() && $longitude.val()) {
                    enableAcceptButton();
                }
                handleAddLocationForm(equipment);
                return
            }

            $longitude.on('input', function () {
                if ($(this).val() === '') {
                    disableAcceptButton();
                } else {
                    enableAcceptButton();
                }
            });

            $latitude.on('input', function () {
                if ($(this).val() === '') {
                    disableAcceptButton();
                } else {
                    enableAcceptButton();
                }
            });

            // don't need autocomplete if we already have an equipment
            $('#eqLogicId').autocomplete({
                    appendTo: '#searchContainer',
                    source: async function (request, response) {
                        const data = await searchEquipment(request.term);
                        if (!data || !data.state || data.state !== 'ok' || data.result.length === 0) {
                            response([{value: "", label: "Aucun équipement trouvé", id: null}]);
                            return;
                        }
                        response(data.result.map(equipment => (
                                    {
                                        label: equipment.fullHumanName,
                                        value: equipment.fullHumanName,
                                        id: equipment.id,
                                        latitude: equipment.latitude,
                                        longitude: equipment.longitude
                                    }
                                )
                            )
                        );
                    },
                    minLength: 3,
                    select: handleAutocompleteSelect,
                }
            );
        }

        initConfirmModal('large', "Géolocaliser un équipement", dialog_message, 'addGeolocation', bindAddGeolocationModal, onHideCallback);
    };

    const initGeolocationHistory = async function (eqLogicId) {
        if (!eqLogicId) {
            return;
        }

        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const endDate = new Date();


        const startDateString = startDate.toLocaleDateString('fr', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const endDateString = endDate.toLocaleDateString('fr', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        let dialog_message = `
<div class="container-fluid">
    <div class="col-xs-12" style="margin-bottom:20px" id="historyModalHeader"></div>
    
    <div class="col-md-4">
        <h4>Historique des positions</h4>
            <div class="col-md-6">
                <div class="form-group">
                    <label class="control-label" for="historyStartDate">Date de début:</label>
                    <input type="text" id="historyStartDate" class="form-control input-sm in_datepicker" autocomplete="off" value="${startDateString}">
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label class="control-label" for="historyEndDate">Date de fin:</label>
                    <input type="text" id="historyEndDate" class="form-control input-sm in_datepicker" autocomplete="off" value="${endDateString}">
                </div>
            </div>
        <div id="coordinateHistoryTable"></div>
    </div>
    <div class="col-md-8">
        <div id="historyMap" style="height:600px;"></div>
    </div>
</div>
        `;

        let historyMap;

        const getHistoryPopup = function (history) {
            return `<div>
                <label class="control-label">Date:</label> ${new Date(history.date).toLocaleDateString('fr', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
                <br>
                <label class="control-label">Latitude:</label> ${history.coordinate.latitude.toPrecision(6)}
                <br>
                <label class="control-label">Longitude:</label> ${history.coordinate.longitude.toPrecision(6)}
            </div>`;
        }

        const handleHistoryCoordinates = function (object) {
            const latLngs = [];
            const markers = {};
            object.coordinateHistory.forEach(history => {
                const latLng = [history.coordinate.latitude, history.coordinate.longitude];
                latLngs.push(latLng);
                const marker = L.circleMarker(latLng, {
                    radius: 4,
                    color: "#0000FF",
                    fillColor: "#0000FF",
                    fillOpacity: 1
                }).addTo(historyMap);
                marker.bindPopup(getHistoryPopup(history), {className: popupClassName})
                    .on('mouseover', function () {
                        this.openPopup();
                    })
                    .on('mouseout', function () {
                        this.closePopup();
                    });
                markers[history.date] = marker;
            });

            const historyLine = L.polyline.antPath(latLngs, {
                "delay": 1500,
                "dashArray": [10, 20],
                "weight": 5,
                "color": "#0000FF",
                "pulseColor": "#FFFFFF",
                "paused": false,
                "reverse": false,
                "hardwareAcceleration": true,
            }).addTo(historyMap);
            historyMap.fitBounds(historyLine.getBounds().pad(0.1));

            $('table#coordinateHistoryTable tbody tr')
                .on('mouseenter', function () {
                    const date = $(this).data('date');
                    let currentMarker = markers[date];
                    if (currentMarker) {
                        currentMarker.openPopup();
                    }
                })
                .on('mouseleave', function () {
                    const date = $(this).data('date');
                    let currentMarker = markers[date];
                    if (currentMarker) {
                        currentMarker.closePopup();
                    }
                });
        };

        const handleMap = function (object) {
            if (!historyMap) {
                historyMap = buildMap('historyMap', 8);
            }

            // remove all previous markers and polylines except the map
            historyMap.eachLayer(function (layer) {
                    if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                        historyMap.removeLayer(layer);
                    }
                }
            );

            const addGeolocationObject = new DisplayableObjects(historyMap);
            if (object.coordinateHistory && object.coordinateHistory.length > 0) {
                handleHistoryCoordinates(object);
            } else {
                object.display = true;
                addGeolocationObject.addObject(object);
                addGeolocationObject.centerMap();
            }
        }

        const handleHistoryDateFilter = function() {
            const $startDate = $('#historyStartDate');
            const $endDate = $('#historyEndDate');

            const datepickerCommonOptions = {
                dateFormat: 'dd/mm/yy',
                changeMonth: true,
                changeYear: true,
                maxDate: new Date(),
                gotoCurrent: true,
                showButtonPanel: true,
                todayBtn: 'linked',
            }

            $startDate.datepicker({...datepickerCommonOptions, defaultDate: '-1y'});
            $endDate.datepicker({...datepickerCommonOptions, defaultDate: '0'});

            const buildDateRange = function () {
                const parseDate = function (dateString) {
                    const parts = dateString.split('/');
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                };

                let startDate = parseDate($startDate.val());
                let endDate = parseDate($endDate.val());

                // check if date is valid
                if (isNaN(startDate.getTime())) {
                    startDate = null;
                }

                if (isNaN(endDate.getTime())) {
                    endDate = null;
                }

                return {
                    startDate: startDate,
                    endDate: endDate
                }
            }

            $startDate.on('change', async function () {
                const dateRange = buildDateRange();
                await handleEquipmentHistory(dateRange.startDate, dateRange.endDate);
            });
            $endDate.on('change', async function () {
                const dateRange = buildDateRange();
                await handleEquipmentHistory(dateRange.startDate, dateRange.endDate);
            });
        }

        const handleHistoryModal = async function () {
            handleHistoryDateFilter();
            await handleEquipmentHistory(startDate, endDate);
        }

        const handleEquipmentHistory = async function (startDate, endDate) {
            const data = await getEquipment(eqLogicId, true, startDate, endDate);
            if (!data) {
                $.fn.showAlert({message: 'Erreur lors de la récupération de l\'équipement', level: 'error'});
                return;
            }

            let equipment = data.result;

            if (!equipment.latitude || !equipment.longitude) {
                $.fn.showAlert({message: 'Cet équipement n\'a pas de position géographique', level: 'error'});
                return;
            }

            let cordinationHistory = `<span class="label label-warning">Aucun historique connu</span>`;

            if (equipment.coordinateHistory && equipment.coordinateHistory.length > 0) {
                cordinationHistory = `
                <table class="table table-bordered table-condensed table-striped" id="coordinateHistoryTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipment.coordinateHistory.map(history => `
                            <tr data-date="${history.date}" style="cursor: pointer">
                                <td>
                                    ${new Date(history.date).toLocaleDateString(
                    'fr',
                    {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}
                )}
                                </td>
                                <td>${history.coordinate.latitude.toPrecision(6)}</td>
                                <td>${history.coordinate.longitude.toPrecision(6)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `
            }

            $('#historyModalHeader').html(`
            <h3>
                <img class="lazy" src="plugins/jMQTT/core/img/node_${equipment.icon}.svg" style="min-height: 24px; height:24px; width:auto;padding-top:1px;">
                ${equipment.name}
            </h3>
            <span class="label labelObjectHuman">
                ${equipment.parents}
            </span>
            `);

            $('#coordinateHistoryTable').html(cordinationHistory);
            handleMap(equipment);
        }

        initDialogModal('xl', "Historique des positions", dialog_message, handleHistoryModal);
    };

    const saveSelectedParentObject = function(objectId) {
        localStorage.setItem('geoloc_selected_parent_object', objectId);
    };

    const getSelectedParentObject = function() {
        return localStorage.getItem('geoloc_selected_parent_object');
    };

    const saveChildObjectsVisibility = function(parentObjectId, childObjectsVisibility) {
        const key = `geoloc_child_visibility_${parentObjectId}`;
        localStorage.setItem(key, JSON.stringify(childObjectsVisibility));
    };

    const getChildObjectsVisibility = function(parentObjectId) {
        const key = `geoloc_child_visibility_${parentObjectId}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    };

    const initAddWidgetModal = function () {
        let dialog_message = `
<form name="addWidgetForm">
    <div class="row">
        <div class="form-group col-md-12" style="margin-bottom: 20px">
            <label for="widgetName" class="control-label">Nom du widget de carte</label>
            <input type="text" class="form-control" id="widgetName" name="widgetName" placeholder="Ex: Carte Salon" required>
        </div>
    </div>
    <div class="row">
        <div class="form-group col-md-12" style="margin-bottom: 20px">
            <label for="parentObject" class="control-label">Objet parent (dont afficher les équipements)</label>
            <select class="form-control" id="parentObject" name="parentObject" required>
                <option value="">Sélectionner un objet</option>
            </select>
        </div>
    </div>
    <div class="row">
        <div class="form-group col-md-12">
            <label for="widgetHeight" class="control-label">Hauteur de la carte (px)</label>
            <input type="number" class="form-control" id="widgetHeight" name="widgetHeight" placeholder="300" min="200" max="800" value="300">
        </div>
    </div>
</form>
        `;

        const options = {
            title: "Créer un widget de carte géolocalisation",
            message: dialog_message,
            size: 'normal',
            buttons: {
                confirm: {
                    label: 'Créer le widget',
                    className: 'btn-success'
                },
                cancel: {
                    label: 'Annuler',
                    className: 'btn-danger'
                }
            },
            callback: function (result) {
                if (!result) {
                    return;
                }

                const widgetName = $('#widgetName').val().trim();
                const parentObjectId = $('#parentObject').val();
                const widgetHeight = $('#widgetHeight').val() || 300;

                if (!widgetName || !parentObjectId) {
                    $.fn.showAlert({message: 'Veuillez remplir tous les champs obligatoires', level: 'error'});
                    return false;
                }

                // Désactiver les boutons pendant la création
                const $acceptButton = $('.bootbox-accept');
                const $cancelButton = $('.bootbox-cancel');
                [$acceptButton, $cancelButton].forEach(button => {
                    button.attr('disabled', 'disabled');
                    button.addClass('disabled');
                });
                $acceptButton.html('Création en cours...');

                // Appel AJAX pour créer l'équipement
                createWidgetEquipment(widgetName, parentObjectId, widgetHeight);
            }
        };

        bootbox.confirm(options);
        
        // Peupler le select des objets une fois la modal affichée
        setTimeout(() => {
            populateObjectSelect();
        }, 100);
    };

    const populateObjectSelect = function() {
        // Appel AJAX pour récupérer la liste des objets
        $.ajax({
            type: "POST",
            url: "core/ajax/object.ajax.php",
            data: {
                action: "all"
            },
            dataType: 'json',
            success: function (data) {
                if (data.state === 'ok') {
                    const $select = $('#parentObject');
                    $select.empty();
                    $select.append('<option value="">Sélectionner un objet</option>');
                    
                    data.result.forEach(obj => {
                        $select.append(`<option value="${obj.id}">${obj.name}</option>`);
                    });
                }
            },
            error: function (request, status, error) {
                console.error('Erreur lors du chargement des objets:', error);
            }
        });
    };

    const handleError = function(request, defaultMessage) {
        let message = defaultMessage;
        try {
            const response = JSON.parse(request.responseText);
            if (response.result) {
                message = response.result;
            }
        } catch (e) {
            // Utiliser le message par défaut si parsing échoue
        }
        $.fn.showAlert({message: message, level: 'error'});
        
        // Réactiver les boutons en cas d'erreur
        const $acceptButton = $('.bootbox-accept');
        const $cancelButton = $('.bootbox-cancel');
        [$acceptButton, $cancelButton].forEach(button => {
            button.removeAttr('disabled');
            button.removeClass('disabled');
        });
        $acceptButton.html('Créer le widget');
    };

    const createWidgetEquipment = function(name, objectId, height) {
        // Prepare the equipment data as an array (Jeedom expects an array of equipment)
        const eqLogicData = [{
            name: name,
            logicalId: 'widget_' + Date.now(),
            object_id: parseInt(objectId) || null,
            eqType_name: 'geoloc',
            isEnable: 1,
            isVisible: 1,
            configuration: {
                height: parseInt(height) || 300
            }
        }];
        
        console.log('Creating widget with data:', eqLogicData);
        
        $.ajax({
            type: "POST",
            url: "core/ajax/eqLogic.ajax.php",
            data: {
                action: "save",
                type: "geoloc",  // Required parameter for Jeedom
                eqLogic: JSON.stringify(eqLogicData)
            },
            dataType: 'json',
            error: function (request, status, error) {
                console.error('AJAX Error:', request.responseText);
                handleError(request, 'Erreur lors de la création du widget');
            },
            success: function (data) {
                console.log('Response:', data);
                if (data.state !== 'ok') {
                    console.error('Server Error:', data.result);
                    $.fn.showAlert({message: data.result, level: 'error'});
                    return;
                }

                $.fn.showAlert({message: 'Widget créé avec succès !', level: 'success'});
                
                // Refresh the page to show the new widget in the list
                location.reload();
            }
        });
    };

    const initEditWidgetModal = function (widgetId) {
        // Fetch widget data via AJAX
        $.ajax({
            type: 'POST',
            url: 'core/ajax/eqLogic.ajax.php',
            data: {
                action: 'byId',
                id: widgetId,
            },
            dataType: 'json',
            error: function (request, status, error) {
                handleAjaxError(request, status, error);
            },
            success: function (data) {
                if (data.state !== 'ok') {
                    $.fn.showAlert({
                        message: data.result,
                        level: 'danger'
                    });
                    return;
                }
                
                const widget = data.result;
                
                // Populate modal with widget data
                $('#edit_widget_id').val(widget.id);
                $('#edit_widget_name').val(widget.name);
                $('#edit_parent_object').val(widget.object_id || '');
                $('#edit_height').val(widget.configuration.height || 300);
                $('#edit_is_enable').prop('checked', widget.isEnable == '1');
                $('#edit_is_visible').prop('checked', widget.isVisible == '1');
                
                // Show modal
                $('#editWidgetModal').modal('show');
            }
        });
    };

    const saveWidgetChanges = function () {
        const widgetId = $('#edit_widget_id').val();
        const formData = {
            id: widgetId,
            name: $('#edit_widget_name').val(),
            object_id: $('#edit_parent_object').val(),
            isEnable: $('#edit_is_enable').is(':checked') ? 1 : 0,
            isVisible: $('#edit_is_visible').is(':checked') ? 1 : 0,
            configuration: {
                height: parseInt($('#edit_height').val())
            }
        };
        
        console.log('Saving widget with data:', formData);

        $.ajax({
            type: 'POST',
            url: 'core/ajax/eqLogic.ajax.php',
            data: {
                action: 'save',
                type: 'geoloc',  // Required parameter
                eqLogic: JSON.stringify([formData])  // Wrap in array as expected by Jeedom
            },
            dataType: 'json',
            error: function (request, status, error) {
                handleAjaxError(request, status, error);
            },
            success: function (data) {
                if (data.state !== 'ok') {
                    $.fn.showAlert({
                        message: data.result,
                        level: 'danger'
                    });
                    return;
                }
                
                $('#editWidgetModal').modal('hide');
                $.fn.showAlert({
                    message: 'Widget modifié avec succès',
                    level: 'success'
                });
                
                // Refresh the page to show updated widget info
                location.reload();
            }
        });
    };

    const removeWidget = function (widgetId, widgetName) {
        bootbox.confirm({
            title: 'Confirmation',
            message: `Êtes-vous sûr de vouloir supprimer le widget "${widgetName}" ? Cette action est irréversible.`,
            buttons: {
                confirm: {
                    label: 'Oui, supprimer',
                    className: 'btn-danger'
                },
                cancel: {
                    label: 'Annuler',
                    className: 'btn-default'
                }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        type: 'POST',
                        url: 'core/ajax/eqLogic.ajax.php',
                        data: {
                            action: 'remove',
                            id: widgetId
                        },
                        dataType: 'json',
                        error: function (request, status, error) {
                            handleAjaxError(request, status, error);
                        },
                        success: function (data) {
                            if (data.state !== 'ok') {
                                $.fn.showAlert({
                                    message: data.result,
                                    level: 'danger'
                                });
                                return;
                            }
                            
                            $.fn.showAlert({
                                message: 'Widget supprimé avec succès',
                                level: 'success'
                            });
                            
                            // Remove the row from table
                            $(`tr[data-widget-id="${widgetId}"]`).fadeOut(300, function() {
                                $(this).remove();
                            });
                        }
                    });
                }
            }
        });
    };

    const initPage = async function () {
        const mainMap = buildMap('map');
        displayableObjects = new DisplayableObjects(mainMap);
        const objectParent = $('select#parentObjectSelector');

        // restore previous selection if exists
        const savedObjectId = getSelectedParentObject();
        if (savedObjectId && objectParent.find(`option[value="${savedObjectId}"]`).length > 0) {
            objectParent.val(savedObjectId);
        }

        // build on first load
        await loadEquipmentsList();

        // build on select change
        objectParent.on('change', async function () {
            const selectedObjectId = $(this).val();
            saveSelectedParentObject(selectedObjectId);
            await loadEquipmentsList();
        });

        $('.eqLogicAction[data-action=addGeolocation]').off('click').on('click', function () {
            initAddGeolocationModal();
        });

        // Widget creation from both tabs
        $('.eqLogicAction[data-action=addWidget]').off('click').on('click', function () {
            initAddWidgetModal();
        });

        // Widget management actions
        $('.widget-action[data-action=edit]').off('click').on('click', function () {
            const widgetId = $(this).data('widget-id');
            initEditWidgetModal(widgetId);
        });

        $('.widget-action[data-action=remove]').off('click').on('click', function () {
            const widgetId = $(this).data('widget-id');
            const widgetName = $(this).closest('tr').find('td:first').text();
            removeWidget(widgetId, widgetName);
        });

        // Save widget changes button
        $('#saveWidgetChanges').off('click').on('click', function () {
            saveWidgetChanges();
        });

        // Initialize tabs
        $('#geolocTabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });

        // Handle URL hash to open specific tab
        if (window.location.hash) {
            const hash = window.location.hash;
            if (hash === '#widgets') {
                $('#widgets-tab').tab('show');
            }
        }

        // Update URL hash when tab changes
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            const target = $(e.target).attr('href');
            if (target === '#widgets') {
                window.location.hash = 'widgets';
            } else {
                history.replaceState(null, null, ' ');
            }
        });
    }

    await initPage();
});
