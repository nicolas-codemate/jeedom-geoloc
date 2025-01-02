$(function () {

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
            marker.bindPopup(`<h1>${object.name}</h1>`);
            this.objects[object.id].marker = marker;
        }

        // build a method to center the map where I can see all the markers
        centerMap() {
            if (0 === this.getVisibleObjects().length) {
                this.resetMapDefaultPosition();
                return;
            }
            const group = new L.featureGroup(Object.values(this.getVisibleObjects()).map(object => object.marker));
            this.map.flyToBounds(group.getBounds().pad(0.1), {animate: true, duration: 1});
        }

        removeMarker(object) {
            this.map.removeLayer(this.objects[object.id].marker);
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
            for (const key in this.objects) {
                if (this.objects.hasOwnProperty(key)) {
                    const element = this.objects[key];
                    if (element instanceof Object) {
                        this.removeMarker(element);
                        delete this.objects[key];
                    }
                }
            }
            this.resetMapDefaultPosition();
        }
    }

    let displayableObjects;

    const searchEquipment = async function (equipmentName) {

        const data = `action=getEquipment&name=${equipmentName}`;

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

    const buildMap = function (htmlElementId = 'map') {
        const {defaultLatitude, defaultLongitude, defaultZoom} = defaultCordinate;

        const mainMap = L.map(htmlElementId).setView([defaultLatitude, defaultLongitude], defaultZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 20,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mainMap);

        return mainMap;
    }

    const initModal = function (size, title, message, ajaxAction, onShownCallback) {
        bootbox.confirm({
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
                await loadEquipmentsList();
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
                        // loadEquipmentsList();
                        $.fn.showAlert({message: 'Succès', level: 'success'});
                    },
                    cache: false,
                    contentType: false,
                    processData: false,
                });
            }
        });
    };

    const buildObject = function (jeeObject) {
        jeeObject.display = true; // by default, we display the object
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
                displayableObjects.centerMap();
            } else {
                object.display = false;
                displayableObjects.hideObject(object);
                displayableObjects.centerMap();
            }
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

    const loadEquipmentsList = async function () {
        const objectParent = $('select#parentObjectSelector');
        const data = await searchEquipments(objectParent.val());
        if (data) {
            buildEqLogicContainer(data);
        }
    }

    const initPage = async function () {
        const mainMap = buildMap('map');
        displayableObjects = new DisplayableObjects(mainMap);
        const objectParent = $('select#parentObjectSelector');

        // build on first load
        await loadEquipmentsList();

        // build on select change
        objectParent.on('change', async function () {
            await loadEquipmentsList();
        });

        $('.eqLogicAction[data-action=addGeolocation]').off('click').on('click', function () {
            let dialog_message = `
<form name="ajaxForm"
    <div class="row" id="searchContainer">
        <div class="form-group col-md-12" style="margin-bottom: 30px">
            <label for="eqLogicId" class="control-label">Nom de l'équipement</label>
            <input type="text" class="form-control" id="eqLogicId" name="eqLogicId" placeholder="Nom de l'équipement">
        </div>
    </div>
    <div id="actionForm" style="display: none;">
        <div class="form-group col-lg-4">
            <div>
                <button type="button" style="margin-bottom: 10px;" id="resetView" class="btn btn-default">Réinitialiser la vue</button>
            </div>
            <label for="latitude" class="control-label">Latitude</label>
            <input type="text" class="form-control" id="latitude" name="latitude" placeholder="Latitude">
            
            <label for="longitude" class="control-label">Longitude</label>
            <input type="text" class="form-control" id="longitude" name="longitude" placeholder="Longitude">
        </div>
        <div class="form-group col-lg-8">
            <div id="addGeolocationMap" style="height:400px;"></div>
        </div>
    </div>
</form>
        `;
            let addGeolocationMap

            const handleAutocompleteSelect = async function (event, ui) {
                const $actionForm = $('#actionForm');
                if (!ui.item.id) {
                    $actionForm.hide();
                    return;
                }

                const object = {
                    id: ui.item.id,
                    name: ui.item.label,
                    latitude: ui.item.latitude,
                    longitude: ui.item.longitude,
                    display: true
                };

                $('#eqLogicId').data('selected-id', ui.item.id);
                $('#latitude').val(object.latitude);
                $('#longitude').val(object.longitude);

                $actionForm.show();
                if (!addGeolocationMap) {
                    addGeolocationMap = buildMap('addGeolocationMap');
                }
                const addGeolocationObject = new DisplayableObjects(addGeolocationMap);
                if (object.latitude && object.longitude) {
                    addGeolocationObject.addObject(object);
                    addGeolocationObject.centerMap();
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
                    $('#latitude').val(e.latlng.lat);
                    $('#longitude').val(e.latlng.lng);
                }
                addGeolocationMap.on('click', onclickMap);
            };

            const bindAddGeolocationModal = async function () {
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

            initModal('large', "Géolocaliser un équipement", dialog_message, 'addGeolocation', bindAddGeolocationModal);
        });

    }

    initPage();
});
