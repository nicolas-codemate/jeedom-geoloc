// Geolocation Dashboard Widget JavaScript
// Read-only mode for dashboard visualization

window.geolocWidgetInstances = window.geolocWidgetInstances || {};

/**
 * Initialize a geolocation widget
 * Creates and initializes a new geolocation widget for dashboard display
 * @param {string} widgetId - Unique identifier for the widget instance
 * @param {string} objectId - ID of the parent object to display equipment from
 * @param {string} objectName - Human-readable name of the parent object
 */
function initGeolocWidget(widgetId, objectId, objectName) {
    // Avoid multiple initializations
    if (window.geolocWidgetInstances[widgetId]) {
        return;
    }

    // Get selected equipments from widget data attribute
    const selectedEquipments = $(`.eqLogic-widget[data-eqlogic_id="${widgetId}"]`).data('selected-equipments') || '';

    const widget = {
        id: widgetId,
        objectId: objectId,
        objectName: objectName,
        selectedEquipments: selectedEquipments,
        map: null,
        markers: [],
        refreshInterval: null,
        isLoading: false
    };

    window.geolocWidgetInstances[widgetId] = widget;

    // Wait for Leaflet and GeolocCommon to be available
    if (typeof L === 'undefined' || typeof GeolocCommon === 'undefined') {
        loadDependencies().then(() => initializeWidget(widget));
    } else {
        initializeWidget(widget);
    }
}

/**
 * Load required dependencies
 * Ensures Leaflet, GeolocCommon and optional plugins are loaded before widget initialization
 * @returns {Promise} Promise that resolves when all dependencies are loaded
 */
function loadDependencies() {
    return Promise.all([loadLeaflet(), loadGeolocCommon(), loadLeafletAntPath()]);
}

/**
 * Load Leaflet library
 * Dynamically loads the Leaflet CSS and JavaScript files if not already present
 * @returns {Promise} Promise that resolves when Leaflet is loaded
 */
function loadLeaflet() {
    return new Promise((resolve) => {
        if (typeof L !== 'undefined') {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'plugins/geoloc/desktop/css/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'plugins/geoloc/desktop/js/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

/**
 * Load GeolocCommon library
 * Dynamically loads the shared geolocation common library
 * @returns {Promise} Promise that resolves when GeolocCommon is loaded
 */
function loadGeolocCommon() {
    return new Promise((resolve) => {
        if (typeof GeolocCommon !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'plugins/geoloc/desktop/js/geoloc-shared.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

/**
 * Load Leaflet Ant Path plugin
 * Dynamically loads the ant path plugin for animated paths
 * @returns {Promise} Promise that resolves when plugin is loaded
 */
function loadLeafletAntPath() {
    return new Promise((resolve) => {
        if (typeof L !== 'undefined' && typeof L.polyline !== 'undefined' && typeof L.polyline.antPath === 'function') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'plugins/geoloc/desktop/js/leaflet-ant-path.js';
        script.onload = resolve;
        script.onerror = () => {
            console.warn('Leaflet Ant Path plugin not found, will use standard polylines');
            resolve(); // Continue even if plugin is not available
        };
        document.head.appendChild(script);
    });
}

/**
 * Initialize the widget map and setup
 * Creates the Leaflet map instance and configures the widget for display
 * @param {Object} widget - Widget instance object containing configuration
 */
function initializeWidget(widget) {
    const mapContainer = document.getElementById(`geolocMap_${widget.id}`);
    if (!mapContainer) {
        console.error(`Map container not found for widget ${widget.id}`);
        return;
    }

    // Hide loading overlay after initialization
    GeolocCommon.Utils.hideLoading(`geolocMap_${widget.id}`);

    try {
        // Initialize Leaflet map with common parameters
        widget.map = GeolocCommon.MapManager.createMap(`geolocMap_${widget.id}`, {
            center: GeolocCommon.Config.DEFAULT_CENTER,
            zoom: GeolocCommon.Config.DEFAULT_ZOOM,
            boxZoom: false,
            keyboard: false
        });

        // Load equipment
        loadEquipments(widget);

        // Configure automatic refresh every 60 seconds
        widget.refreshInterval = setInterval(() => {
            loadEquipments(widget);
        }, 60000);

    } catch (error) {
        console.error(`Error initializing widget ${widget.id}:`, error);
        GeolocCommon.Utils.showError(`geolocMap_${widget.id}`, 'Erreur lors de l\'initialisation de la carte');
    }
}

/**
 * Load equipment data for the widget
 * Fetches geolocatable equipment from the server and updates the map display
 * @param {Object} widget - Widget instance object
 */
function loadEquipments(widget) {
    if (widget.isLoading) {
        return;
    }

    widget.isLoading = true;
    GeolocCommon.Utils.showLoading(`geolocMap_${widget.id}`);

    GeolocCommon.AjaxHelper.loadEquipments(widget.objectId)
        .done(function(response) {
            if (response.state !== 'ok') {
                console.error(`Error loading equipments for widget ${widget.id}:`, response.result);
                GeolocCommon.Utils.showError(`geolocMap_${widget.id}`, response.result || 'Erreur lors du chargement');
                return;
            }
            processEquipments(widget, response.result);
        })
        .fail(function(xhr, status, error) {
            console.error(`AJAX error for widget ${widget.id}:`, error);
            GeolocCommon.Utils.showError(`geolocMap_${widget.id}`, 'Erreur de communication avec le serveur');
        })
        .always(function() {
            widget.isLoading = false;
            GeolocCommon.Utils.hideLoading(`geolocMap_${widget.id}`);
        });
}

/**
 * Process and display equipment on the map
 * Handles equipment data processing and marker creation for the widget
 * @param {Object} widget - Widget instance object
 * @param {Object} data - Equipment data received from server
 */
function processEquipments(widget, data) {
    // Clear existing markers
    clearMarkers(widget);

    // Collect and filter equipment with valid coordinates
    const allEquipments = GeolocCommon.EquipmentProcessor.collectEquipments(data);
    let validEquipments = GeolocCommon.EquipmentProcessor.filterValidCoordinates(allEquipments);
    
    // Filter by selected equipments if configured
    if (widget.selectedEquipments && widget.selectedEquipments.trim() !== '') {
        const selectedIds = widget.selectedEquipments.split(',').map(id => parseInt(id.trim()));
        validEquipments = validEquipments.filter(equipment => 
            selectedIds.includes(parseInt(equipment.id))
        );
    }

    // Update equipment counter
    updateEquipmentCount(widget.id, validEquipments.length);

    if (validEquipments.length === 0) {
        // No geolocatable equipment - return to default view
        widget.map.setView(GeolocCommon.Config.DEFAULT_CENTER, GeolocCommon.Config.DEFAULT_ZOOM);
        return;
    }

    // Add markers to map
    validEquipments.forEach(equipment => {
        const marker = createMarker(equipment);
        marker.addTo(widget.map);
        widget.markers.push(marker);
    });

    // Adjust view to include all markers
    const coordinates = GeolocCommon.EquipmentProcessor.extractCoordinates(validEquipments);
    GeolocCommon.MapManager.fitBoundsToCoordinates(widget.map, coordinates);
}

/**
 * Create a marker for equipment
 * Creates a Leaflet marker with popup for displaying equipment on the map
 * @param {Object} equipment - Equipment object with coordinates and metadata
 * @returns {L.Marker} Configured Leaflet marker instance
 */
function createMarker(equipment) {
    const lat = parseFloat(equipment.latitude);
    const lng = parseFloat(equipment.longitude);

    // Use common factory to create the marker
    const marker = GeolocCommon.MarkerFactory.createMarker(lat, lng, {
        color: 'blue'
    });

    // Popup with history action for widgets (no update position)
    const popupContent = GeolocCommon.MarkerFactory.createPopupContent(equipment, {
        showActions: true,
        showUpdateAction: false
    });

    marker.bindPopup(popupContent, {
        className: 'geoloc-widget-popup',
        maxWidth: 250
    });

    // Add event handler for popup actions
    marker.on('popupopen', function () {
        $('.map-action').off('click').on('click', function () {
            const action = $(this).data('action');
            const eqLogicId = $(this).data('eqlogicId');
            handleMapAction(action, eqLogicId);
        });
    });

    return marker;
}

/**
 * Clear all markers from the widget map
 * Removes all markers from the map and clears the markers array
 * @param {Object} widget - Widget instance object
 */
function clearMarkers(widget) {
    widget.markers.forEach(marker => {
        widget.map.removeLayer(marker);
    });
    widget.markers = [];
}

/**
 * Handle map popup actions in widget context
 * Processes actions triggered from map popups, specifically history viewing
 * @param {string} action - Action to perform (getHistory, updatePosition)
 * @param {string} eqLogicId - Equipment ID to perform action on
 */
function handleMapAction(action, eqLogicId) {
    switch (action) {
        case "getHistory":
            showEquipmentHistory(eqLogicId);
            break;
        case "updatePosition":
            // Not supported in widget mode - redirect to admin page
            $.fn.showAlert({
                message: 'Pour modifier la position, veuillez utiliser la page d\'administration du plugin',
                level: 'warning'
            });
            break;
        default:
            console.error('Unknown action:', action);
    }
}

/**
 * Show equipment history in modal
 * Opens a modal dialog displaying the position history for the specified equipment
 * @param {string} eqLogicId - Equipment ID to show history for
 */
function showEquipmentHistory(eqLogicId) {
    // Use the shared history modal from GeolocCommon
    GeolocCommon.HistoryModal.show(eqLogicId, {
        context: 'widget'
    });
}


/**
 * Update equipment counter display
 * Updates the equipment count text displayed in the widget
 * @param {string} widgetId - Widget identifier
 * @param {number} count - Number of geolocated equipment to display
 */
function updateEquipmentCount(widgetId, count) {
    const countElement = document.getElementById(`equipmentCount_${widgetId}`);
    if (countElement) {
        countElement.textContent = `${count} équipement(s) géolocalisé(s)`;
    }
}

// Cleanup when widget is destroyed
$(document).on('widget:destroyed', function(event, widgetId) {
    const widget = window.geolocWidgetInstances[widgetId];
    if (widget) {
        if (widget.refreshInterval) {
            clearInterval(widget.refreshInterval);
        }
        if (widget.map) {
            widget.map.remove();
        }
        delete window.geolocWidgetInstances[widgetId];
    }
});

// Handle widget resizing
$(document).on('widget:resized', function(event, widgetId) {
    const widget = window.geolocWidgetInstances[widgetId];
    if (widget && widget.map) {
        setTimeout(() => {
            widget.map.invalidateSize();
        }, 100);
    }
});
