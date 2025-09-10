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

    console.log(`Initializing geolocation widget ${widgetId} for object ${objectId}`);

    const widget = {
        id: widgetId,
        objectId: objectId,
        objectName: objectName,
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
 * Ensures both Leaflet and GeolocCommon libraries are loaded before widget initialization
 * @returns {Promise} Promise that resolves when all dependencies are loaded
 */
function loadDependencies() {
    return Promise.all([loadLeaflet(), loadGeolocCommon()]);
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
        script.src = 'plugins/geoloc/desktop/js/geoloc-common.js';
        script.onload = resolve;
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

        console.log(`Widget ${widget.id} initialized successfully`);

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
    const validEquipments = GeolocCommon.EquipmentProcessor.filterValidCoordinates(allEquipments);

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

    // Popup with basic information (read-only mode)
    const popupContent = GeolocCommon.MarkerFactory.createPopupContent(equipment, {
        showActions: false
    });

    marker.bindPopup(popupContent, {
        className: 'geoloc-widget-popup',
        maxWidth: 250
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

// Utility functions are now handled by GeolocCommon.Utils

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
