// Geolocation Dashboard Widget JavaScript
// Read-only mode for dashboard visualization

// Configuration constants
const MAX_AUTO_OPEN_POPUPS = 5;

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
    const selectedEquipments = $(`.eqLogic-widget[data-eqlogic_id="${widgetId}"]`).attr('data-selected-equipments') || '';

    const widget = {
        id: widgetId,
        objectId: objectId,
        objectName: objectName,
        selectedEquipments: selectedEquipments,
        map: null,
        markers: [],
        refreshInterval: null,
        isLoading: false,
        // Control panel state
        equipments: [],
        selectedEquipmentIds: [],
        controlPanelVisible: false
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

        // Initialize control panel
        initControlPanel(widget);

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

    // Filter by selected equipments if configured (widget-level filter)
    if (widget.selectedEquipments && widget.selectedEquipments.trim() !== '') {
        const selectedIds = widget.selectedEquipments.split(',').map(id => parseInt(id.trim()));
        validEquipments = validEquipments.filter(equipment =>
            selectedIds.includes(parseInt(equipment.id))
        );
    }

    // Store equipments for control panel
    widget.equipments = validEquipments;

    // Initialize all equipment as selected (checked) by default
    // Only reset selection if this is first load or equipments changed
    const currentIds = validEquipments.map(eq => parseInt(eq.id));
    const needsReset = widget.selectedEquipmentIds.length === 0 ||
        !currentIds.every(id => widget.selectedEquipmentIds.includes(id) || !widget.selectedEquipmentIds.includes(id));

    if (needsReset || widget.selectedEquipmentIds.length === 0) {
        widget.selectedEquipmentIds = currentIds;
    }

    // Update equipment counter
    updateEquipmentCount(widget.id, validEquipments.length);

    // Render equipment list in control panel
    renderEquipmentList(widget);

    if (validEquipments.length === 0) {
        // No geolocatable equipment - return to default view
        widget.map.setView(GeolocCommon.Config.DEFAULT_CENTER, GeolocCommon.Config.DEFAULT_ZOOM);
        return;
    }

    // Add markers to map
    validEquipments.forEach((equipment, index) => {
        const marker = createMarker(equipment);
        const eqId = parseInt(equipment.id);

        // Store equipment ID on marker for later reference
        marker._equipmentId = eqId;

        // Only add to map if selected
        if (widget.selectedEquipmentIds.includes(eqId)) {
            marker.addTo(widget.map);
        }

        widget.markers.push(marker);

        // Auto-open popups for up to MAX_AUTO_OPEN_POPUPS equipments (only if selected)
        if (validEquipments.length <= MAX_AUTO_OPEN_POPUPS && widget.selectedEquipmentIds.includes(eqId)) {
            setTimeout(() => {
                marker.openPopup();
            }, 300 + (index * 100)); // Stagger popup opening
        }
    });

    // Adjust view to include only visible markers
    const visibleEquipments = validEquipments.filter(eq =>
        widget.selectedEquipmentIds.includes(parseInt(eq.id))
    );

    if (visibleEquipments.length > 0) {
        const coordinates = GeolocCommon.EquipmentProcessor.extractCoordinates(visibleEquipments);
        GeolocCommon.MapManager.fitBoundsToCoordinates(widget.map, coordinates);
    }
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

    // Configure popup - HIDE History button in widget mode (use control panel instead)
    const popupContent = GeolocCommon.MarkerFactory.createPopupContent(equipment, {
        showActions: true,
        showHistoryAction: false,  // History is now in control panel
        showUpdateAction: false
    });

    // Configure popup to allow multiple simultaneous display
    marker.bindPopup(popupContent, {
        className: 'geoloc-widget-popup',
        maxWidth: 250,
        autoClose: false,  // Don't auto-close when another popup opens
        closeOnClick: false  // Don't close when clicking on map
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
 * Update equipment counter display
 * Updates the equipment count text displayed in the widget
 * @param {string} widgetId - Widget identifier
 * @param {number} count - Number of geolocated equipment to display
 */
function updateEquipmentCount(widgetId, count) {
    const countElement = document.getElementById(`equipmentCount_${widgetId}`);
    if (countElement) {
        countElement.textContent = `${count} équipement(s)`;

        // Add visual emphasis with a subtle animation when count changes
        countElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 200);
    }
}

// ============================================
// Control Panel Functions
// ============================================

/**
 * Initialize control panel event handlers
 * Sets up toggle, close, check/uncheck all, and history button events
 * @param {Object} widget - Widget instance object
 */
function initControlPanel(widget) {
    const toggleBtn = $(`#controlToggle_${widget.id}`);
    const panel = $(`#controlPanel_${widget.id}`);
    const closeBtn = panel.find('.control-panel-close');
    const checkAllBtn = $(`#checkAll_${widget.id}`);
    const uncheckAllBtn = $(`#uncheckAll_${widget.id}`);
    const historyBtn = $(`#multiHistoryBtn_${widget.id}`);

    // Toggle panel visibility
    toggleBtn.on('click', () => toggleControlPanel(widget));
    closeBtn.on('click', () => hideControlPanel(widget));

    // Check/Uncheck all buttons
    checkAllBtn.on('click', () => setAllEquipmentSelection(widget, true));
    uncheckAllBtn.on('click', () => setAllEquipmentSelection(widget, false));

    // Multi-vehicle history button
    historyBtn.on('click', () => showMultiVehicleHistory(widget));
}

/**
 * Toggle control panel visibility
 * @param {Object} widget - Widget instance object
 */
function toggleControlPanel(widget) {
    widget.controlPanelVisible = !widget.controlPanelVisible;
    const panel = $(`#controlPanel_${widget.id}`);
    const toggleBtn = $(`#controlToggle_${widget.id}`);

    if (widget.controlPanelVisible) {
        panel.show();
        toggleBtn.addClass('active');
    } else {
        panel.hide();
        toggleBtn.removeClass('active');
    }
}

/**
 * Hide control panel
 * @param {Object} widget - Widget instance object
 */
function hideControlPanel(widget) {
    widget.controlPanelVisible = false;
    $(`#controlPanel_${widget.id}`).hide();
    $(`#controlToggle_${widget.id}`).removeClass('active');
}

/**
 * Render equipment list in control panel
 * Creates checkbox items for each equipment
 * @param {Object} widget - Widget instance object
 */
function renderEquipmentList(widget) {
    const listContainer = $(`#equipmentList_${widget.id}`);
    listContainer.empty();

    if (widget.equipments.length === 0) {
        listContainer.html('<div style="padding: 15px; text-align: center; color: #888;">Aucun equipement</div>');
        updateHistoryButtonVisibility(widget);
        return;
    }

    widget.equipments.forEach(equipment => {
        const eqId = parseInt(equipment.id);
        const isChecked = widget.selectedEquipmentIds.includes(eqId);
        const itemHtml = `
            <div class="control-panel-item" data-equipment-id="${eqId}">
                <input type="checkbox" ${isChecked ? 'checked' : ''}
                       id="eq_${widget.id}_${eqId}">
                <label class="equipment-name" for="eq_${widget.id}_${eqId}"
                       title="${equipment.name}">${equipment.name}</label>
            </div>
        `;
        listContainer.append(itemHtml);
    });

    // Bind checkbox change events
    listContainer.find('input[type="checkbox"]').on('change', function() {
        const eqId = parseInt($(this).closest('.control-panel-item').data('equipment-id'));
        handleEquipmentSelectionChange(widget, eqId, $(this).is(':checked'));
    });

    // Bind label click to toggle checkbox
    listContainer.find('.equipment-name').on('click', function(e) {
        e.preventDefault();
        const checkbox = $(this).siblings('input[type="checkbox"]');
        checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
    });

    updateHistoryButtonVisibility(widget);
}

/**
 * Handle equipment selection change
 * Updates selection state and marker visibility
 * @param {Object} widget - Widget instance object
 * @param {number} equipmentId - Equipment ID that changed
 * @param {boolean} isSelected - Whether equipment is now selected
 */
function handleEquipmentSelectionChange(widget, equipmentId, isSelected) {
    if (isSelected) {
        if (!widget.selectedEquipmentIds.includes(equipmentId)) {
            widget.selectedEquipmentIds.push(equipmentId);
        }
    } else {
        widget.selectedEquipmentIds = widget.selectedEquipmentIds.filter(id => id !== equipmentId);
    }

    // Update marker visibility
    updateMarkerVisibility(widget, equipmentId, isSelected);
    updateHistoryButtonVisibility(widget);

    // Refit map to visible equipments
    fitMapToVisibleEquipments(widget);
}

/**
 * Update marker visibility on map
 * Shows or hides marker based on selection state
 * @param {Object} widget - Widget instance object
 * @param {number} equipmentId - Equipment ID
 * @param {boolean} isVisible - Whether marker should be visible
 */
function updateMarkerVisibility(widget, equipmentId, isVisible) {
    const marker = widget.markers.find(m => m._equipmentId === equipmentId);
    if (marker) {
        if (isVisible) {
            if (!widget.map.hasLayer(marker)) {
                marker.addTo(widget.map);
            }
        } else {
            if (widget.map.hasLayer(marker)) {
                widget.map.removeLayer(marker);
            }
        }
    }
}

/**
 * Set all equipment selection state
 * Checks or unchecks all equipment checkboxes
 * @param {Object} widget - Widget instance object
 * @param {boolean} selectAll - True to select all, false to deselect all
 */
function setAllEquipmentSelection(widget, selectAll) {
    if (selectAll) {
        widget.selectedEquipmentIds = widget.equipments.map(eq => parseInt(eq.id));
    } else {
        widget.selectedEquipmentIds = [];
    }

    // Update checkboxes
    $(`#equipmentList_${widget.id} input[type="checkbox"]`).prop('checked', selectAll);

    // Update all markers
    widget.equipments.forEach(eq => {
        updateMarkerVisibility(widget, parseInt(eq.id), selectAll);
    });

    updateHistoryButtonVisibility(widget);

    // Refit map to visible equipments
    fitMapToVisibleEquipments(widget);
}

/**
 * Update history button visibility
 * Shows button only if at least one equipment is selected
 * @param {Object} widget - Widget instance object
 */
function updateHistoryButtonVisibility(widget) {
    const footer = $(`#controlPanelFooter_${widget.id}`);
    const hasSelection = widget.selectedEquipmentIds.length > 0;

    if (hasSelection) {
        footer.show();
    } else {
        footer.hide();
    }
}

/**
 * Fit map to show only visible (selected) equipments
 * @param {Object} widget - Widget instance object
 */
function fitMapToVisibleEquipments(widget) {
    const visibleEquipments = widget.equipments.filter(eq =>
        widget.selectedEquipmentIds.includes(parseInt(eq.id))
    );

    if (visibleEquipments.length > 0) {
        const coordinates = GeolocCommon.EquipmentProcessor.extractCoordinates(visibleEquipments);
        GeolocCommon.MapManager.fitBoundsToCoordinates(widget.map, coordinates);
    } else {
        // No visible equipments - reset to default view
        widget.map.setView(GeolocCommon.Config.DEFAULT_CENTER, GeolocCommon.Config.DEFAULT_ZOOM);
    }
}

/**
 * Show multi-vehicle history modal
 * Opens the history modal for all selected equipments
 * @param {Object} widget - Widget instance object
 */
function showMultiVehicleHistory(widget) {
    if (widget.selectedEquipmentIds.length === 0) {
        $.fn.showAlert({
            message: 'Veuillez selectionner au moins un equipement',
            level: 'warning'
        });
        return;
    }

    // Get selected equipments with their current positions
    const selectedEquipments = widget.equipments.filter(eq =>
        widget.selectedEquipmentIds.includes(parseInt(eq.id))
    );

    GeolocCommon.MultiVehicleHistoryModal.show(widget.selectedEquipmentIds, {
        context: 'widget',
        equipments: selectedEquipments
    });
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
