/**
 * Geoloc Admin Interface
 * Main administration interface for geolocation plugin
 */

// Namespace to avoid conflicts
window.GeolocAdmin = window.GeolocAdmin || {};

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
                            await GeolocAdmin.MapActions.callback($(this).data('action'), $(this).data('eqlogicId'));
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

    /**
     * Map Action Handlers
     * Handles user interactions with map popups and equipment actions
     */
    GeolocAdmin.MapActions = {
        /**
         * Handle map popup actions
         * Routes map popup actions to appropriate modal functions
         * @param {string} action - Action to perform (updatePosition, getHistory)
         * @param {string} eqLogicId - Equipment ID to perform action on
         */
        callback: async function (action, eqLogicId) {
            switch (action) {
                case "updatePosition":
                    await GeolocAdmin.Modals.initAddGeolocationModal(eqLogicId);
                    break;
                case "getHistory":
                    await GeolocAdmin.Modals.initGeolocationHistory(eqLogicId);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        }
    };

    /**
     * Equipment Management Functions
     * Provides AJAX operations for equipment search, retrieval, and management
     */
    GeolocAdmin.Equipment = {
        /**
         * Search equipment by name
         * Performs AJAX search for equipment matching the given name
         * @param {string} equipmentName - Name or partial name to search for
         * @returns {Promise<Object>} Equipment search results
         */
        searchEquipment: async function (equipmentName) {
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
        },

        /**
         * Search equipment by parent object
         * Retrieves all geolocatable equipment belonging to a specific parent object
         * @param {string|number} parentObjectId - ID of the parent object
         * @returns {Promise<Object>} Equipment data grouped by parent object
         */
        searchEquipments: async function (parentObjectId) {
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
        },

        /**
         * Get equipment by ID with optional history
         * Retrieves detailed equipment information with optional coordinate history
         * @param {string|number} eqLogicId - Equipment ID to retrieve
         * @param {boolean} getHistory - Whether to include coordinate history
         * @param {Date} startDate - Start date for history filter
         * @param {Date} endDate - End date for history filter
         * @returns {Promise<Object>} Equipment data with optional history
         */
        getEquipment: async function (eqLogicId, getHistory = false, startDate, endDate) {
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
        },

        /**
         * Load and display equipment list
         * Fetches equipment for the currently selected parent object and updates UI
         */
        loadEquipmentsList: async function () {
            const objectParent = $('select#parentObjectSelector');
            const data = await GeolocAdmin.Equipment.searchEquipments(objectParent.val());
            if (data) {
                GeolocAdmin.UI.buildEqLogicContainer(data);
            }
        }
    };

    /**
     * Map Management Functions
     * Utilities for creating and configuring Leaflet maps in the admin interface
     */
    GeolocAdmin.MapManager = {
        /**
         * Build a Leaflet map instance
         * Creates a new Leaflet map with OpenStreetMap tiles and default configuration
         * @param {string} htmlElementId - HTML element ID to contain the map
         * @param {number} customZoom - Optional custom zoom level
         * @returns {L.Map} Configured Leaflet map instance
         */
        buildMap: function (htmlElementId = 'map', customZoom) {
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
    };

    /**
     * Modal Management Functions
     * Handles creation and management of modal dialogs for equipment operations
     */
    GeolocAdmin.Modals = {
        /**
         * Initialize a confirmation modal dialog
         * Creates a bootbox confirmation modal with custom callbacks and AJAX handling
         * @param {string} size - Modal size (large, normal, etc.)
         * @param {string} title - Modal title text
         * @param {string} message - Modal body HTML content
         * @param {string} ajaxAction - AJAX action to perform on confirmation
         * @param {Function} onShownCallback - Callback when modal is shown
         * @param {Function} onHideCallback - Callback when modal is hidden
         */
        initConfirmModal: function (size, title, message, ajaxAction, onShownCallback, onHideCallback) {
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
        },

        /**
         * Initialize a dialog modal
         * Creates a bootbox dialog modal with custom content and callbacks
         * @param {string} size - Modal size (xl, large, normal, etc.)
         * @param {string} title - Modal title text
         * @param {string} message - Modal body HTML content
         * @param {Function} onShownCallback - Optional callback when modal is shown
         */
        initDialogModal: function (size, title, message, onShownCallback) {
            const options = {
                title,
                message,
                size,
            };

            if (onShownCallback) {
                options.onShown = onShownCallback;
            }

            bootbox.dialog(options);
        },

        /**
         * Initialize add geolocation modal
         * Opens a modal for adding or updating equipment geolocation coordinates
         * @param {string|number} eqLogicId - Optional equipment ID for editing existing location
         */
        initAddGeolocationModal: async function (eqLogicId) {
            let readonly = false;
            let equipmentName = '';
            let equipment;

            if (eqLogicId) {
                const data = await GeolocAdmin.Equipment.getEquipment(eqLogicId);
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
                    addGeolocationMap = GeolocAdmin.MapManager.buildMap('addGeolocationMap');
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
                // Always refresh the equipment list to show updated positions on the map
                await GeolocAdmin.Equipment.loadEquipmentsList();
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
                            const data = await GeolocAdmin.Equipment.searchEquipment(request.term);
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

            GeolocAdmin.Modals.initConfirmModal('large', "Géolocaliser un équipement", dialog_message, 'addGeolocation', bindAddGeolocationModal, onHideCallback);
        },

        initGeolocationHistory: async function (eqLogicId) {
            if (!eqLogicId) {
                return;
            }

            // Use the shared history modal from GeolocCommon
            GeolocCommon.HistoryModal.show(eqLogicId, {
                context: 'admin'
            });
        }
    };

    /**
     * Storage Management Functions
     * Manages browser localStorage for user preferences and widget state
     */
    GeolocAdmin.Storage = {
        /**
         * Save selected parent object to localStorage
         * Persists the user's selected parent object for the next session
         * @param {string|number} objectId - ID of the selected parent object
         */
        saveSelectedParentObject: function(objectId) {
            localStorage.setItem('geoloc_selected_parent_object', objectId);
        },

        /**
         * Get selected parent object from localStorage
         * Retrieves the previously selected parent object from storage
         * @returns {string|null} ID of the selected parent object or null
         */
        getSelectedParentObject: function() {
            return localStorage.getItem('geoloc_selected_parent_object');
        },

        /**
         * Save child objects visibility state to localStorage
         * Stores the visibility settings for child objects of a specific parent
         * @param {string} parentObjectId - ID of the parent object
         * @param {Object} childObjectsVisibility - Object mapping child IDs to visibility states
         */
        saveChildObjectsVisibility: function(parentObjectId, childObjectsVisibility) {
            const key = `geoloc_child_visibility_${parentObjectId}`;
            localStorage.setItem(key, JSON.stringify(childObjectsVisibility));
        },

        /**
         * Get child objects visibility state from localStorage
         * Retrieves the stored visibility settings for child objects
         * @param {string} parentObjectId - ID of the parent object
         * @returns {Object|null} Object mapping child IDs to visibility states or null
         */
        getChildObjectsVisibility: function(parentObjectId) {
            const key = `geoloc_child_visibility_${parentObjectId}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        }
    };

    /**
     * Widget Management Functions
     * Handles creation, editing, and deletion of geolocation dashboard widgets
     */
    GeolocAdmin.Widgets = {
        /**
         * Initialize modal for adding a new geolocation widget
         * Creates a modal form for configuring and creating dashboard widgets
         */
        initAddWidgetModal: function () {
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
            <label for="parentObject" class="control-label">Objet parent</label>
            <select class="form-control" id="parentObject" name="parentObject" required>
                <option value="">Sélectionner un objet</option>
            </select>
        </div>
    </div>
    <div class="row">
        <div class="form-group col-md-6">
            <label for="widgetHeight" class="control-label">Hauteur de la carte (px)</label>
            <input type="number" class="form-control" id="widgetHeight" name="widgetHeight" placeholder="300" min="200" max="800" value="300">
        </div>
        <div class="form-group col-md-6">
            <label for="widgetWidth" class="control-label">Largeur du widget</label>
            <select class="form-control" name="widgetWidth" id="widgetWidth">
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
                    const widgetWidth = $('#widgetWidth').val() || 'auto';

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
                    GeolocAdmin.Widgets.createWidgetEquipment(widgetName, parentObjectId, widgetHeight, widgetWidth);
                }
            };

            bootbox.confirm(options);
            
            // Peupler le select des objets une fois la modal affichée
            setTimeout(() => {
                GeolocAdmin.Widgets.populateObjectSelect();
            }, 100);
        },

        /**
         * Populate the object selection dropdown
         * Fetches all available parent objects via AJAX and populates select options
         */
        populateObjectSelect: function() {
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
        },

        /**
         * Handle AJAX error responses
         * Parses error response and displays appropriate error message
         * @param {Object} request - jQuery AJAX request object
         * @param {string} defaultMessage - Default error message if parsing fails
         */
        handleError: function(request, defaultMessage) {
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
        },

        /**
         * Create a new widget equipment via AJAX
         * Sends request to create a geolocation widget with specified parameters
         * @param {string} name - Widget name
         * @param {string|number} objectId - Parent object ID
         * @param {number} height - Widget height in pixels
         * @param {string} width - Widget width (e.g., 'auto', '100%', '300px')
         */
        createWidgetEquipment: function(name, objectId, height, width) {
            // Prepare the equipment data as an array (Jeedom expects an array of equipment)
            const eqLogicData = [{
                name: name,
                logicalId: 'widget_' + Date.now(),
                object_id: parseInt(objectId) || null,
                eqType_name: 'geoloc',
                isEnable: 1,
                isVisible: 1,
                configuration: {
                    height: parseInt(height) || 300,
                    width: width || 'auto'
                }
            }];
            
            
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
                    GeolocAdmin.Widgets.handleError(request, 'Erreur lors de la création du widget');
                },
                success: function (data) {
                    if (data.state !== 'ok') {
                        $.fn.showAlert({message: data.result, level: 'error'});
                        return;
                    }

                    $.fn.showAlert({message: 'Widget créé avec succès !', level: 'success'});
                    
                    // Add the new widget to the table instead of reloading
                    GeolocAdmin.Widgets.addWidgetToTable(data.result);
                }
            });
        },

        /**
         * Add a new widget to the widgets table
         * Updates the DOM to display the newly created widget
         * @param {Object} widget - Widget data object from server response
         */
        addWidgetToTable: function(widget) {
            // Get object name for display
            const objectName = widget.object_id ? 
                $(`#parentObjectId option[value="${widget.object_id}"]`).text() || 'Aucun' : 
                'Aucun';
            
            const height = widget.configuration?.height || 300;
            const width = widget.configuration?.width || 'auto';
            const selectedEquipments = widget.configuration?.selectedEquipments || '';
            const isEnable = widget.isEnable == '1';
            const isVisible = widget.isVisible == '1';
            
            let statusHtml;
            if (isEnable && isVisible) {
                statusHtml = '<span class="label label-success">Actif</span>';
            } else if (isEnable && !isVisible) {
                statusHtml = '<span class="label label-warning">Masqué</span>';
            } else {
                statusHtml = '<span class="label label-danger">Inactif</span>';
            }
            
            // Create row with placeholder for equipment badge
            const newRow = `
                <tr data-widget-id="${widget.id}">
                    <td>${widget.name}</td>
                    <td>${objectName}</td>
                    <td class="equipment-cell">
                        <span class="label label-secondary">Chargement...</span>
                    </td>
                    <td>${width} × ${height}px</td>
                    <td>${statusHtml}</td>
                    <td>
                        <a class="btn btn-default btn-xs widget-action" data-action="edit" data-widget-id="${widget.id}" title="Modifier">
                            <i class="fas fa-pencil-alt"></i>
                        </a>
                        <a class="btn btn-danger btn-xs widget-action" data-action="remove" data-widget-id="${widget.id}" title="Supprimer">
                            <i class="fas fa-minus-circle"></i>
                        </a>
                    </td>
                </tr>
            `;
            
            $('#widgetsTable tbody').append(newRow);
            
            // Load equipment badge asynchronously
            const $newRow = $(`tr[data-widget-id="${widget.id}"]`);
            GeolocAdmin.Widgets.formatEquipmentBadge(selectedEquipments, widget.object_id)
                .then(badgeHtml => {
                    $newRow.find('.equipment-cell').html(badgeHtml);
                    // Initialize Bootstrap tooltips
                    $newRow.find('[data-toggle="tooltip"]').tooltip();
                });
            
            // Bind events for the new row
            $newRow.find('.widget-action[data-action=edit]').on('click', function () {
                const widgetId = $(this).data('widget-id');
                GeolocAdmin.Widgets.initEditWidgetModal(widgetId);
            });
            $newRow.find('.widget-action[data-action=remove]').on('click', function () {
                const widgetId = $(this).data('widget-id');
                const widgetName = $(this).closest('tr').find('td:first').text();
                GeolocAdmin.Widgets.removeWidget(widgetId, widgetName);
            });
        },

        /**
         * Initialize modal for editing an existing widget
         * Fetches widget data and populates edit form modal
         * @param {string|number} widgetId - ID of the widget to edit
         */
        initEditWidgetModal: function (widgetId) {
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
                    GeolocAdmin.Utils.handleAjaxError(request, status, error);
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
                    $('#edit_width').val(widget.configuration.width || 'auto');
                    $('#edit_is_enable').prop('checked', widget.isEnable == '1');
                    $('#edit_is_visible').prop('checked', widget.isVisible == '1');
                    
                    // Handle equipment selection
                    const selectedEquipments = widget.configuration.selectedEquipments || '';
                    if (selectedEquipments === '') {
                        $('#edit_show_all_equipment').prop('checked', true);
                        $('#equipment_selection_container').hide();
                    } else {
                        $('#edit_show_all_equipment').prop('checked', false);
                        $('#equipment_selection_container').show();
                        // Load equipment list for current object
                        GeolocAdmin.Widgets.loadObjectEquipments(widget.object_id || '', selectedEquipments);
                    }
                    
                    // Show modal
                    $('#editWidgetModal').modal('show');
                }
            });
        },

        /**
         * Save changes to an existing widget
         * Collects form data and sends update request via AJAX
         */
        saveWidgetChanges: function () {
            const widgetId = $('#edit_widget_id').val();
            const formData = {
                id: widgetId,
                name: $('#edit_widget_name').val(),
                object_id: $('#edit_parent_object').val(),
                isEnable: $('#edit_is_enable').is(':checked') ? 1 : 0,
                isVisible: $('#edit_is_visible').is(':checked') ? 1 : 0,
                configuration: {
                    height: parseInt($('#edit_height').val()),
                    width: $('#edit_width').val(),
                    selectedEquipments: GeolocAdmin.Widgets.getSelectedEquipments()
                }
            };
            

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
                    GeolocAdmin.Utils.handleAjaxError(request, status, error);
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
                    
                    // Update the row in the table instead of reloading
                    GeolocAdmin.Widgets.updateWidgetTableRow(widgetId, formData);
                }
            });
        },

        /**
         * Update a widget row in the widgets table
         * Updates table row data without full page refresh
         * @param {string|number} widgetId - ID of the widget to update
         * @param {Object} formData - Updated widget data
         */
        updateWidgetTableRow: function(widgetId, formData) {
            const $row = $(`tr[data-widget-id="${widgetId}"]`);
            if ($row.length === 0) return;
            
            // Update the row data
            $row.find('td:eq(0)').text(formData.name); // Name
            
            // Get object name for display
            const objectName = formData.object_id ? 
                $(`#edit_parent_object option[value="${formData.object_id}"]`).text() : 
                'Aucun';
            $row.find('td:eq(1)').text(objectName); // Object parent
            
            // Update equipment badge (column 2)
            const $equipmentCell = $row.find('td:eq(2)');
            $equipmentCell.html('<span class="label label-secondary">Mise à jour...</span>');
            GeolocAdmin.Widgets.formatEquipmentBadge(formData.configuration.selectedEquipments, formData.object_id)
                .then(badgeHtml => {
                    $equipmentCell.html(badgeHtml);
                    // Initialize Bootstrap tooltips for new content
                    $equipmentCell.find('[data-toggle="tooltip"]').tooltip();
                });
            
            $row.find('td:eq(3)').text(formData.configuration.width + ' × ' + formData.configuration.height + 'px'); // Dimensions
            
            // Update status (column 4)
            const $statusCell = $row.find('td:eq(4)');
            $statusCell.empty();
            if (formData.isEnable && formData.isVisible) {
                $statusCell.html('<span class="label label-success">Actif</span>');
            } else if (formData.isEnable && !formData.isVisible) {
                $statusCell.html('<span class="label label-warning">Masqué</span>');
            } else {
                $statusCell.html('<span class="label label-danger">Inactif</span>');
            }
        },

        /**
         * Remove a widget with confirmation dialog
         * Shows confirmation modal and deletes widget on confirmation
         * @param {string|number} widgetId - ID of the widget to remove
         * @param {string} widgetName - Name of the widget for confirmation message
         */
        removeWidget: function (widgetId, widgetName) {
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
                                GeolocAdmin.Utils.handleAjaxError(request, status, error);
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
        },

        /**
         * Load equipment list for a specific object
         * Fetches available equipment for the selected parent object
         * @param {string|number} objectId - ID of the parent object
         * @param {string} selectedEquipments - Comma-separated list of selected equipment IDs
         */
        loadObjectEquipments: function(objectId, selectedEquipments) {
            if (!objectId) {
                $('#edit_selected_equipment').empty();
                return;
            }

            $.ajax({
                type: 'POST',
                url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                data: {
                    action: 'getObjectEquipments',
                    objectId: objectId
                },
                dataType: 'json',
                error: function(request, status, error) {
                    console.error('Error loading equipment list:', error);
                    $('#edit_selected_equipment').empty();
                },
                success: function(data) {
                    const $select = $('#edit_selected_equipment');
                    $select.empty();

                    if (data.state === 'ok' && data.result.length > 0) {
                        const selectedIds = selectedEquipments ? selectedEquipments.split(',') : [];
                        
                        data.result.forEach(equipment => {
                            const isSelected = selectedIds.includes(equipment.id.toString());
                            $select.append(`<option value="${equipment.id}" ${isSelected ? 'selected' : ''}>${equipment.humanName}</option>`);
                        });
                    } else {
                        $select.append('<option value="">Aucun équipement géolocalisable trouvé</option>');
                    }
                }
            });
        },

        /**
         * Get selected equipment IDs from the form
         * Returns comma-separated list of selected equipment IDs or empty string for "show all"
         * @returns {string} Comma-separated equipment IDs or empty string
         */
        getSelectedEquipments: function() {
            if ($('#edit_show_all_equipment').is(':checked')) {
                return '';
            }
            
            const selectedValues = $('#edit_selected_equipment').val();
            return Array.isArray(selectedValues) ? selectedValues.join(',') : '';
        },

        /**
         * Format equipment badge for table display
         * @param {string} selectedEquipments Comma-separated equipment IDs
         * @param {string|number} objectId Parent object ID
         * @returns {Promise<string>} Promise resolving to badge HTML
         */
        formatEquipmentBadge: function(selectedEquipments, objectId) {
            return new Promise((resolve) => {
                if (!selectedEquipments || selectedEquipments.trim() === '') {
                    resolve('<span class="label label-default">Tous</span>');
                    return;
                }

                // Get equipment names via AJAX
                $.ajax({
                    type: 'POST',
                    url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                    data: {
                        action: 'getObjectEquipments',
                        objectId: objectId
                    },
                    dataType: 'json',
                    success: function(data) {
                        if (data.state === 'ok' && data.result.length > 0) {
                            const selectedIds = selectedEquipments.split(',').map(id => id.trim());
                            const selectedEquipmentNames = data.result
                                .filter(eq => selectedIds.includes(eq.id.toString()))
                                .map(eq => eq.humanName);

                            if (selectedEquipmentNames.length === 0) {
                                resolve('<span class="label label-warning">Aucun équipement valide</span>');
                                return;
                            }

                            const count = selectedEquipmentNames.length;
                            const tooltip = selectedEquipmentNames.join('<br>• ');
                            const badge = `<span class="label label-info equipment-badge" 
                                                 data-toggle="tooltip" 
                                                 data-placement="top" 
                                                 data-html="true"
                                                 title="• ${tooltip}">
                                                 ${count} équipement${count > 1 ? 's' : ''}
                                           </span>`;
                            resolve(badge);
                        } else {
                            resolve('<span class="label label-warning">Erreur de chargement</span>');
                        }
                    },
                    error: function() {
                        resolve('<span class="label label-danger">Erreur</span>');
                    }
                });
            });
        }
    };

    /**
     * UI Management Functions
     * Manages the admin interface elements and user interactions
     */
    GeolocAdmin.UI = {
        /**
         * Build HTML for an equipment object card
         * Creates the HTML representation of an equipment object for the UI list
         * @param {Object} jeeObject - Equipment object with metadata and coordinates
         * @returns {string} HTML string for the equipment card
         */
        buildObject: function (jeeObject) {
            jeeObject.display = true; // by default, we display the object
            jeeObject.displayPopup = true; // by default, we display the object
            displayableObjects.addObject(jeeObject);
            return `
<div class="geoloc-equipment-card cursor displayAsTable" data-object="${jeeObject.id}">
    <img alt="objectIcon" class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.humanName}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <input type="checkbox" name="objectVisible" class="eqLogicVisible" checked data-object-id="${jeeObject.id}">
    </span>
</div>
`;
        },

        /**
         * Build the equipment container with objects hierarchy
         * Creates the UI container showing equipment objects in a hierarchical structure
         * @param {Object} data - Equipment data object containing nested objects and items
         */
        buildEqLogicContainer: function (data) {
            displayableObjects.reset();
            const container = $('#eqLogicThumbnailContainer');
            container.find('div').remove();

            if (!data) {
                return;
            }

            const buildItems = function (jeeObject) {
                let items = [];

                if (jeeObject.items.length > 0) {
                    items = jeeObject.items.map(equipment => GeolocAdmin.UI.buildObject(equipment));
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
            const savedVisibility = GeolocAdmin.Storage.getChildObjectsVisibility(currentParentId);
            
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

            $('.geoloc-equipment-card')
                .on('mouseenter', function () {
                    const objectId = $(this).data('object');
                    displayableObjects.openPopup(displayableObjects.objects[objectId]);
                })
                .on('mouseleave', function () {
                    const objectId = $(this).data('object');
                    displayableObjects.closePopup(displayableObjects.objects[objectId]);

                });

            $('.geoloc-equipment-card > span.name').on('click', function () {
                const objectId = $(this).parent().data('object');
                const checkbox = $(`input.eqLogicVisible[data-object-id="${objectId}"]`);
                checkbox.prop('checked', !checkbox.prop('checked'));
                checkbox.trigger('change');
            });


            GeolocAdmin.UI.bindToggleVisibility();
            
            // Support for Jeedom's table/grid display toggle
            GeolocAdmin.UI.handleDisplayMode();
            
            // Support for Jeedom's table/grid display toggle
            GeolocAdmin.UI.handleDisplayMode();

            displayableObjects.centerMap();

            if (0 === items.length) {
                displayableObjects.reset();
                container.append('<div style="margin-top:20px;margin-left:20px"><span class="label label-warning"">Aucun équipement géolocalisable trouvé</span></div>');
            }
        },

        /**
         * Handle display mode (table/grid) compatibility with Jeedom
         * Ensures our custom cards work with Jeedom's display toggle
         */
        handleDisplayMode: function () {
            // Check if table mode is active
            const isTableMode = (typeof getCookie !== 'undefined' && getCookie('jeedom_displayAsTable') == 'true') || 
                               (window.jeedom && window.jeedom.theme && window.jeedom.theme.theme_displayAsTable == 1);
            
            if (isTableMode) {
                $('.geoloc-equipment-card').addClass('displayAsTable');
                $('.geoloc-equipment-card .hiddenAsCard').removeClass('hidden');
                $('#eqLogicThumbnailContainer').addClass('containerAsTable');
            }
        },

        /**
         * Bind visibility toggle events for equipment objects
         * Sets up event handlers for showing/hiding objects on the map
         */
        bindToggleVisibility: function () {
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
                GeolocAdmin.Storage.saveChildObjectsVisibility(currentParentId, currentVisibility);
            });
        }
    };

    /**
     * Utility Functions
     * General purpose utility functions for error handling and common operations
     */
    GeolocAdmin.Utils = {
        /**
         * Handle AJAX errors with consistent error display
         * Logs error to console and shows user-friendly error message
         * @param {Object} request - jQuery AJAX request object
         * @param {string} status - HTTP status text
         * @param {string} error - Error message
         */
        handleAjaxError: function(request, status, error) {
            console.error('AJAX Error:', status, error);
            $.fn.showAlert({
                message: 'Erreur de communication avec le serveur',
                level: 'error'
            });
        }
    };

    /**
     * Page Initialization
     * Main initialization logic for the admin interface
     */
    GeolocAdmin.Init = {
        /**
         * Initialize the admin page
         * Main initialization function that sets up maps, event handlers, and UI
         */
        initPage: async function () {
            // Only initialize map if geolocation tab is active or will be active
            const isGeolocationTabActive = $('#geolocation').hasClass('active') || !window.location.hash || window.location.hash !== '#widgets';
            
            let mainMap = null;
            if (isGeolocationTabActive) {
                mainMap = GeolocAdmin.MapManager.buildMap('map');
                displayableObjects = new DisplayableObjects(mainMap);
            }
            
            const objectParent = $('select#parentObjectSelector');

            // restore previous selection if exists
            const savedObjectId = GeolocAdmin.Storage.getSelectedParentObject();
            if (savedObjectId && objectParent.find(`option[value="${savedObjectId}"]`).length > 0) {
                objectParent.val(savedObjectId);
            }

            // Only load equipments if geolocation tab is active
            if (isGeolocationTabActive) {
                // build on first load
                await GeolocAdmin.Equipment.loadEquipmentsList();

                // build on select change
                objectParent.on('change', async function () {
                    const selectedObjectId = $(this).val();
                    GeolocAdmin.Storage.saveSelectedParentObject(selectedObjectId);
                    await GeolocAdmin.Equipment.loadEquipmentsList();
                });
            }

            $('.eqLogicAction[data-action=addGeolocation]').off('click').on('click', function () {
                GeolocAdmin.Modals.initAddGeolocationModal();
            });

            // Widget creation from both tabs
            $('.eqLogicAction[data-action=addWidget]').off('click').on('click', function () {
                GeolocAdmin.Widgets.initAddWidgetModal();
            });

            // Widget management actions
            $('.widget-action[data-action=edit]').off('click').on('click', function () {
                const widgetId = $(this).data('widget-id');
                GeolocAdmin.Widgets.initEditWidgetModal(widgetId);
            });

            $('.widget-action[data-action=remove]').off('click').on('click', function () {
                const widgetId = $(this).data('widget-id');
                const widgetName = $(this).closest('tr').find('td:first').text();
                GeolocAdmin.Widgets.removeWidget(widgetId, widgetName);
            });

            // Save widget changes button
            $('#saveWidgetChanges').off('click').on('click', function () {
                GeolocAdmin.Widgets.saveWidgetChanges();
            });

            // Equipment selection management
            $('#edit_show_all_equipment').off('change').on('change', function () {
                const showAll = $(this).is(':checked');
                if (showAll) {
                    $('#equipment_selection_container').hide();
                } else {
                    $('#equipment_selection_container').show();
                    // Load equipment for current object if not already loaded
                    const objectId = $('#edit_parent_object').val();
                    if (objectId) {
                        GeolocAdmin.Widgets.loadObjectEquipments(objectId, '');
                    }
                }
            });

            // Object parent change handler for equipment loading
            $('#edit_parent_object').off('change').on('change', function () {
                const objectId = $(this).val();
                if (!$('#edit_show_all_equipment').is(':checked')) {
                    GeolocAdmin.Widgets.loadObjectEquipments(objectId, '');
                }
            });

            // Initialize tabs
            $('#geolocTabs a').click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });

            // Initialize Bootstrap tooltips for equipment badges
            setTimeout(() => {
                $('[data-toggle="tooltip"]').tooltip();
            }, 500);

            // Handle URL hash to open specific tab
            if (window.location.hash) {
                const hash = window.location.hash;
                if (hash === '#widgets') {
                    $('#widgets-tab').tab('show');
                }
            }

            // Update URL hash when tab changes and initialize map if needed
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                const target = $(e.target).attr('href');
                if (target === '#widgets') {
                    window.location.hash = 'widgets';
                } else if (target === '#geolocation') {
                    history.replaceState(null, null, ' ');
                    
                    // Initialize map if not already done
                    if (!mainMap) {
                        mainMap = GeolocAdmin.MapManager.buildMap('map');
                        displayableObjects = new DisplayableObjects(mainMap);
                        
                        // Load equipments for the first time
                        const objectParent = $('select#parentObjectSelector');
                        const savedObjectId = GeolocAdmin.Storage.getSelectedParentObject();
                        if (savedObjectId && objectParent.find(`option[value="${savedObjectId}"]`).length > 0) {
                            objectParent.val(savedObjectId);
                        }
                        GeolocAdmin.Equipment.loadEquipmentsList();
                        
                        // Bind change event
                        objectParent.on('change', async function () {
                            const selectedObjectId = $(this).val();
                            GeolocAdmin.Storage.saveSelectedParentObject(selectedObjectId);
                            await GeolocAdmin.Equipment.loadEquipmentsList();
                        });
                    }
                }
            });
        }
    };


    await GeolocAdmin.Init.initPage();
});
