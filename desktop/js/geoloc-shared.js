/**
 * Geoloc Common Library
 * Shared functionality between admin interface and dashboard widgets
 */

// Namespace to avoid conflicts
window.GeolocCommon = window.GeolocCommon || {};

/**
 * Configuration and Constants
 * Shared configuration settings and constants for the geolocation plugin
 */
GeolocCommon.Config = {
    TILE_LAYER_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_LAYER_ATTRIBUTION: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    DEFAULT_CENTER: [46.603354, 1.888334], // France center
    DEFAULT_ZOOM: 6,
    MARKER_COLORS: ['red', 'blue', 'green', 'orange', 'yellow', 'violet', 'grey', 'black', 'gold'],
    MARKER_PATHS: {
        iconPath: '/plugins/geoloc/desktop/css/images/marker-icon-2x-{color}.png',
        shadowPath: '/plugins/geoloc/desktop/css/images/marker-shadow.png'
    },
    MARKER_SIZE: {
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }
};

/**
 * Map Manager - Handles Leaflet map creation and configuration
 * Provides utilities for creating and managing Leaflet maps with standardized settings
 */
GeolocCommon.MapManager = {
    /**
     * Create a new Leaflet map instance
     * @param {string} containerId - HTML element ID for the map container
     * @param {Object} options - Map configuration options
     * @returns {L.Map} Leaflet map instance
     */
    createMap: function(containerId, options = {}) {
        const config = {
            center: options.center || GeolocCommon.Config.DEFAULT_CENTER,
            zoom: options.zoom || GeolocCommon.Config.DEFAULT_ZOOM,
            zoomControl: options.zoomControl !== false,
            attributionControl: options.attributionControl !== false,
            dragging: options.dragging !== false,
            touchZoom: options.touchZoom !== false,
            doubleClickZoom: options.doubleClickZoom !== false,
            scrollWheelZoom: options.scrollWheelZoom !== false,
            boxZoom: options.boxZoom || false,
            keyboard: options.keyboard || false,
            ...options
        };

        const map = L.map(containerId, config);
        
        // Add tile layer
        this.addTileLayer(map);
        
        return map;
    },

    /**
     * Add OpenStreetMap tile layer to map
     * Adds the standard OpenStreetMap tile layer with attribution to the map
     * @param {L.Map} map - Leaflet map instance
     */
    addTileLayer: function(map) {
        L.tileLayer(GeolocCommon.Config.TILE_LAYER_URL, {
            minZoom: 1,
            maxZoom: 20,
            attribution: GeolocCommon.Config.TILE_LAYER_ATTRIBUTION
        }).addTo(map);
    },

    /**
     * Fit map bounds to include all coordinates
     * Adjusts the map view to show all provided coordinates with optional padding
     * @param {L.Map} map - Leaflet map instance
     * @param {Array} coordinates - Array of [lat, lng] coordinate pairs
     * @param {Object} options - Fit bounds options (padding, maxZoom, etc.)
     */
    fitBoundsToCoordinates: function(map, coordinates, options = {}) {
        if (!coordinates || coordinates.length === 0) {
            return;
        }

        const bounds = L.latLngBounds(coordinates);
        if (bounds.isValid()) {
            const fitOptions = {
                padding: options.padding || [10, 10],
                maxZoom: options.maxZoom || 16,
                ...options
            };
            map.fitBounds(bounds, fitOptions);
        }
    }
};

/**
 * Marker Factory - Creates standardized markers
 * Factory methods for creating consistent markers and popups across the application
 */
GeolocCommon.MarkerFactory = {
    /**
     * Create a marker with standard styling
     * Creates a Leaflet marker with consistent styling and custom icon
     * @param {number} lat - Latitude coordinate
     * @param {number} lng - Longitude coordinate
     * @param {Object} options - Marker options (color, draggable, etc.)
     * @returns {L.Marker} Configured Leaflet marker instance
     */
    createMarker: function(lat, lng, options = {}) {
        const color = options.color || 'blue';
        const draggable = options.draggable || false;
        
        const icon = this.createIcon(color);
        
        return L.marker([lat, lng], {
            icon: icon,
            draggable: draggable,
            ...options
        });
    },

    /**
     * Create marker icon with specified color
     * Generates a colored marker icon using the plugin's custom icon set
     * @param {string} color - Marker color (red, blue, green, etc.)
     * @returns {L.Icon} Configured Leaflet icon instance
     */
    createIcon: function(color = 'blue') {
        return L.icon({
            iconUrl: GeolocCommon.Config.MARKER_PATHS.iconPath.replace('{color}', color),
            shadowUrl: GeolocCommon.Config.MARKER_PATHS.shadowPath,
            iconSize: GeolocCommon.Config.MARKER_SIZE.iconSize,
            iconAnchor: GeolocCommon.Config.MARKER_SIZE.iconAnchor,
            popupAnchor: GeolocCommon.Config.MARKER_SIZE.popupAnchor,
            shadowSize: GeolocCommon.Config.MARKER_SIZE.shadowSize
        });
    },

    /**
     * Create popup content for equipment
     * Generates HTML content for equipment popups with optional action buttons
     * @param {Object} equipment - Equipment data object with coordinates and metadata
     * @param {Object} options - Popup options (showActions, showHistoryAction, showUpdateAction)
     * @returns {string} HTML string for popup content
     */
    createPopupContent: function(equipment, options = {}) {
        const showActions = options.showActions || false;
        const showHistoryAction = options.showHistoryAction !== false; // default true
        const showUpdateAction = options.showUpdateAction !== false; // default true

        let content = `
            <div class="geoloc-popup">
                <h4>${equipment.name}</h4>
        `;

        if (equipment.parents) {
            content += `<p><strong>Objet:</strong> ${equipment.parents}</p>`;
        }

        if (showActions) {
            content += `<div>`;

            if (showHistoryAction) {
                content += `
                    <a class="btn btn-primary btn-xs map-action" data-action="getHistory" data-eqlogic-id="${equipment.id}">
                        <i class="fa fa-history"></i> Historique
                    </a>
                `;
            }

            if (showUpdateAction) {
                content += `
                    <a class="btn btn-warning btn-xs map-action" data-action="updatePosition" data-eqLogic-id="${equipment.id}">
                        <i class="fa fa-pen"></i> Modifier position
                    </a>
                `;
            }

            content += `</div>`;
        }

        content += '</div>';
        return content;
    }
};

/**
 * Equipment Processor - Handles equipment data processing
 * Utilities for processing and filtering equipment data from hierarchical structures
 */
GeolocCommon.EquipmentProcessor = {
    /**
     * Collect all equipment from hierarchical data structure
     * Recursively traverses the hierarchical object tree to extract all equipment items
     * @param {Object} data - Hierarchical equipment data with nested child objects
     * @returns {Array} Flattened array of all equipment objects found
     */
    collectEquipments: function(data) {
        const equipments = [];

        function traverse(node) {
            if (node.items && node.items.length > 0) {
                equipments.push(...node.items);
            }
            
            if (node.child && node.child.length > 0) {
                node.child.forEach(traverse);
            }
        }

        if (data) {
            traverse(data);
        }
        
        return equipments;
    },

    /**
     * Filter equipment with valid coordinates
     * Removes equipment items that don't have valid latitude/longitude coordinates
     * @param {Array} equipments - Array of equipment objects to filter
     * @returns {Array} Filtered array containing only equipment with valid coordinates
     */
    filterValidCoordinates: function(equipments) {
        return equipments.filter(eq => 
            eq.latitude && eq.longitude && 
            !isNaN(parseFloat(eq.latitude)) && !isNaN(parseFloat(eq.longitude))
        );
    },

    /**
     * Extract coordinates from equipment array
     * Converts equipment objects to coordinate pairs for map operations
     * @param {Array} equipments - Array of equipment objects with latitude/longitude
     * @returns {Array} Array of [lat, lng] coordinate pairs
     */
    extractCoordinates: function(equipments) {
        return equipments.map(eq => [parseFloat(eq.latitude), parseFloat(eq.longitude)]);
    },

    /**
     * Get marker color by index
     * Returns a color from the predefined color palette using cyclic selection
     * @param {number} index - Index for color selection (cycles through available colors)
     * @returns {string} Color name from the predefined palette
     */
    getMarkerColor: function(index) {
        return GeolocCommon.Config.MARKER_COLORS[index % GeolocCommon.Config.MARKER_COLORS.length];
    }
};

/**
 * AJAX Helper - Handles common AJAX operations
 * Standardized AJAX requests for geolocation plugin operations
 */
GeolocCommon.AjaxHelper = {
    /**
     * Make AJAX request to geoloc plugin
     * Sends a standardized AJAX request to the geoloc plugin endpoint
     * @param {string} action - Action to perform on the server
     * @param {Object} data - Additional data to send with the request
     * @returns {jqXHR} jQuery AJAX promise object
     */
    request: function(action, data = {}) {
        const requestData = {
            action: action,
            ...data
        };

        return $.ajax({
            url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
            type: 'POST',
            data: requestData,
            dataType: 'json',
            cache: false
        });
    },

    /**
     * Load equipment for specific parent object
     * Retrieves all geolocatable equipment belonging to a specific parent object
     * @param {string|number} parentObjectId - ID of the parent object to query
     * @returns {jqXHR} jQuery AJAX promise resolving to equipment data
     */
    loadEquipments: function(parentObjectId) {
        return this.request('getEquipments', { parentObjectId: parentObjectId });
    }
};

/**
 * Utility Functions
 * General purpose utility functions for UI operations and data manipulation
 */
GeolocCommon.Utils = {
    /**
     * Show loading overlay on element
     * Displays a loading spinner overlay on the specified DOM element
     * @param {string} elementId - ID of the DOM element to show loading on
     */
    showLoading: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const overlay = element.querySelector('.loading-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
        }
    },

    /**
     * Hide loading overlay on element
     * Hides the loading spinner overlay on the specified DOM element
     * @param {string} elementId - ID of the DOM element to hide loading from
     */
    hideLoading: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const overlay = element.querySelector('.loading-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    },

    /**
     * Show error message in container
     * Displays an error message with icon in the specified container
     * @param {string} containerId - ID of the container element
     * @param {string} message - Error message text to display
     */
    showError: function(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="geoloc-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    },

    /**
     * Debounce function calls
     * Creates a debounced version of a function to limit rapid successive calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds before execution
     * @returns {Function} Debounced function that delays execution
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

/**
 * History Modal Manager - Handles equipment position history display
 * Provides a unified history modal for both admin interface and widgets
 */
GeolocCommon.HistoryModal = {
    /**
     * Show equipment history modal
     * Creates and displays a modal with position history, date filters, and interactive map
     * @param {string} eqLogicId - Equipment ID to show history for
     * @param {Object} options - Modal options (context: 'admin' or 'widget')
     */
    show: function(eqLogicId, options = {}) {
        const context = options.context || 'widget';
        
        if (!eqLogicId) {
            console.error('Equipment ID is required for history modal');
            return;
        }

        // Default date range (last week)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        
        const startDateString = startDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const endDateString = endDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const modalId = `geolocHistoryModal_${eqLogicId}`;
        const mapId = `geolocHistoryMap_${eqLogicId}`;

        // Create modal HTML with admin-style layout
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document" style="width: 95%; max-width: 1200px;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal">&times;</button>
                            <h4 class="modal-title">Historique des positions</h4>
                        </div>
                        <div class="modal-body">
                            <div class="container-fluid">
                                <div class="col-xs-12" style="margin-bottom:20px" id="historyModalHeader_${eqLogicId}"></div>
                                
                                <div class="col-md-4">
                                    <h4>Filtre et données</h4>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="control-label" for="historyStartDate_${eqLogicId}">Date de début:</label>
                                                <input type="date" id="historyStartDate_${eqLogicId}" class="form-control input-sm" value="${this.formatDateForInput(startDate)}">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-group">
                                                <label class="control-label" for="historyEndDate_${eqLogicId}">Date de fin:</label>
                                                <input type="date" id="historyEndDate_${eqLogicId}" class="form-control input-sm" value="${this.formatDateForInput(endDate)}">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-12">
                                            <button type="button" class="btn btn-primary btn-sm" id="refreshHistory_${eqLogicId}">
                                                <i class="fa fa-refresh"></i> Actualiser
                                            </button>
                                        </div>
                                    </div>
                                    <div id="coordinateHistoryTable_${eqLogicId}" style="margin-top: 15px;"></div>
                                </div>
                                <div class="col-md-8">
                                    <div id="${mapId}" style="height:600px;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal and add new one
        $(`#${modalId}`).remove();
        $('body').append(modalHTML);

        // Initialize modal
        this.initializeModal(modalId, mapId, eqLogicId, startDate, endDate);

        // Show modal
        if (typeof $(`#${modalId}`).modal === 'function') {
            $(`#${modalId}`).modal('show');
        } else {
            // Fallback for contexts without Bootstrap
            $(`#${modalId}`).addClass('in').css('display', 'block');
            $('body').addClass('modal-open');
        }

        // Initialize map when modal is shown (fix map rendering)
        $(`#${modalId}`).on('shown.bs.modal', function () {
            setTimeout(() => {
                const mapInstance = window.geolocHistoryMaps[mapId];
                if (mapInstance) {
                    mapInstance.invalidateSize();
                    // Re-fit the map after invalidateSize
                    const currentBounds = mapInstance._currentBounds;
                    if (currentBounds && currentBounds.length > 0) {
                        GeolocCommon.HistoryModal.fitMapToCoordinates(mapInstance, currentBounds);
                    }
                }
            }, 150);
        });

        // Clean up when modal is hidden
        $(`#${modalId}`).on('hidden.bs.modal', function () {
            // Clean up map instance
            if (window.geolocHistoryMaps && window.geolocHistoryMaps[mapId]) {
                window.geolocHistoryMaps[mapId].remove();
                delete window.geolocHistoryMaps[mapId];
            }
            $(this).remove();
        });
    },

    /**
     * Initialize modal with equipment data and event handlers
     * Sets up the modal content, loads initial data, and binds events
     * @param {string} modalId - Modal DOM ID
     * @param {string} mapId - Map container DOM ID  
     * @param {string} eqLogicId - Equipment ID
     * @param {Date} startDate - Initial start date
     * @param {Date} endDate - Initial end date
     */
    initializeModal: function(modalId, mapId, eqLogicId, startDate, endDate) {
        // Load initial equipment data
        this.loadEquipmentHistory(eqLogicId, startDate, endDate, mapId);

        // Bind refresh button
        $(`#refreshHistory_${eqLogicId}`).on('click', () => {
            const newStartDate = new Date($(`#historyStartDate_${eqLogicId}`).val());
            const newEndDate = new Date($(`#historyEndDate_${eqLogicId}`).val());
            this.loadEquipmentHistory(eqLogicId, newStartDate, newEndDate, mapId);
        });
    },

    /**
     * Load equipment history data and update modal content
     * Fetches equipment data with history and updates both table and map
     * @param {string} eqLogicId - Equipment ID
     * @param {Date} startDate - Start date for history filter
     * @param {Date} endDate - End date for history filter
     * @param {string} mapId - Map container DOM ID
     */
    loadEquipmentHistory: function(eqLogicId, startDate, endDate, mapId) {
        // Show loading state
        $(`#coordinateHistoryTable_${eqLogicId}`).html('<i class="fa fa-spinner fa-spin"></i> Chargement...');

        // Load equipment with history
        GeolocCommon.AjaxHelper.request('getEquipmentById', {
            eqLogicId: eqLogicId,
            getHistory: true,
            startDate: startDate.toDateString(),
            endDate: endDate.toDateString()
        })
        .done((response) => {
            if (response.state !== 'ok') {
                $(`#coordinateHistoryTable_${eqLogicId}`).html(`
                    <div class="alert alert-danger">
                        <i class="fa fa-exclamation-triangle"></i> ${response.result || 'Erreur lors du chargement'}
                    </div>
                `);
                return;
            }

            const equipment = response.result;
            this.updateModalContent(equipment, mapId);
        })
        .fail((xhr, status, error) => {
            console.error('Error loading equipment history:', error);
            $(`#coordinateHistoryTable_${eqLogicId}`).html(`
                <div class="alert alert-danger">
                    <i class="fa fa-exclamation-triangle"></i> Erreur de communication avec le serveur
                </div>
            `);
        });
    },

    /**
     * Update modal content with equipment data
     * Updates the equipment header, history table, and map display
     * @param {Object} equipment - Equipment data with coordinate history
     * @param {string} mapId - Map container DOM ID
     */
    updateModalContent: function(equipment, mapId) {
        // Update modal header with equipment info
        $(`#historyModalHeader_${equipment.id}`).html(`
            <div class="alert alert-info">
                <strong>${equipment.name}</strong>
                ${equipment.parents ? `<br><small>Objet: ${equipment.parents}</small>` : ''}
            </div>
        `);

        // Update history table
        this.updateHistoryTable(equipment);

        // Update map
        this.updateHistoryMap(equipment, mapId);
    },

    /**
     * Update the history data table
     * Creates or updates the table showing coordinate history with dates
     * @param {Object} equipment - Equipment data with coordinate history
     */
    updateHistoryTable: function(equipment) {
        const tableContainer = $(`#coordinateHistoryTable_${equipment.id}`);
        
        if (!equipment.coordinateHistory || equipment.coordinateHistory.length === 0) {
            tableContainer.html(`
                <div class="alert alert-warning">
                    <i class="fa fa-info-circle"></i> Aucun historique de position trouvé pour cette période
                </div>
            `);
            return;
        }

        // Filter valid history entries - handle both widget and admin data formats
        const validHistory = equipment.coordinateHistory.filter(history => {
            // Admin format: history.coordinate.latitude/longitude
            // Widget format: history.latitude/longitude
            const lat = history.coordinate ? history.coordinate.latitude : history.latitude;
            const lng = history.coordinate ? history.coordinate.longitude : history.longitude;
            return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
        });

        if (validHistory.length === 0) {
            tableContainer.html(`
                <div class="alert alert-warning">
                    <i class="fa fa-info-circle"></i> Aucune position valide trouvée dans l'historique
                </div>
            `);
            return;
        }

        let tableHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="table table-bordered table-condensed table-striped" id="coordinateHistoryTable">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        validHistory.forEach(history => {
            // Handle both data formats
            const lat = history.coordinate ? history.coordinate.latitude : history.latitude;
            const lng = history.coordinate ? history.coordinate.longitude : history.longitude;
            
            const date = new Date(history.date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            tableHTML += `
                <tr data-date="${history.date}">
                    <td>${date}</td>
                    <td>${parseFloat(lat).toFixed(6)}</td>
                    <td>${parseFloat(lng).toFixed(6)}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.html(tableHTML);
    },

    /**
     * Update the history map display
     * Creates or updates the map showing current position and historical path
     * @param {Object} equipment - Equipment data with coordinate history
     * @param {string} mapId - Map container DOM ID
     */
    updateHistoryMap: function(equipment, mapId) {
        // Create or get existing map
        if (!window.geolocHistoryMaps) {
            window.geolocHistoryMaps = {};
        }

        let historyMap = window.geolocHistoryMaps[mapId];
        if (!historyMap) {
            historyMap = GeolocCommon.MapManager.createMap(mapId, {
                center: [equipment.latitude, equipment.longitude],
                zoom: 1  // Start with low zoom, will be adjusted later
            });
            window.geolocHistoryMaps[mapId] = historyMap;
        }

        // Clear existing layers
        historyMap.eachLayer(function(layer) {
            if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                historyMap.removeLayer(layer);
            }
        });

        // Add current position marker (red)
        const currentMarker = GeolocCommon.MarkerFactory.createMarker(
            equipment.latitude, 
            equipment.longitude, 
            { color: 'red' }
        );
        
        currentMarker.bindPopup(`
            <div>
                <strong>Position actuelle</strong><br>
                ${equipment.name}
            </div>
        `);
        currentMarker.addTo(historyMap);

        // Store current position for bounds calculation
        const allCoordinates = [[equipment.latitude, equipment.longitude]];

        // Add historical positions if available
        if (equipment.coordinateHistory && equipment.coordinateHistory.length > 0) {
            const validHistory = equipment.coordinateHistory.filter(history => {
                // Handle both data formats
                const lat = history.coordinate ? history.coordinate.latitude : history.latitude;
                const lng = history.coordinate ? history.coordinate.longitude : history.longitude;
                return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
            });
            
            if (validHistory.length > 0) {
                const markers = {};
                const latLngs = [];

                validHistory.forEach(history => {
                    // Handle both data formats
                    const lat = parseFloat(history.coordinate ? history.coordinate.latitude : history.latitude);
                    const lng = parseFloat(history.coordinate ? history.coordinate.longitude : history.longitude);
                    const latLng = [lat, lng];
                    latLngs.push(latLng);

                    const historyMarker = L.circleMarker(latLng, {
                        radius: 4,
                        color: "#0000FF",
                        fillColor: "#0000FF",
                        fillOpacity: 1
                    }).addTo(historyMap);

                    const date = new Date(history.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    historyMarker.bindPopup(`
                        <div>
                            <strong>Date:</strong> ${date}<br>
                            <strong>Position:</strong><br>
                            Latitude: ${lat.toFixed(6)}<br>
                            Longitude: ${lng.toFixed(6)}
                        </div>
                    `);

                    // Store marker for table interaction
                    markers[history.date] = historyMarker;

                    // Show popup on hover
                    historyMarker.on('mouseover', function () {
                        this.openPopup();
                    }).on('mouseout', function () {
                        this.closePopup();
                    });
                });

                // Add animated path if available and multiple points
                if (latLngs.length > 1 && typeof L.polyline !== 'undefined' && typeof L.polyline.antPath === 'function') {
                    try {
                        const historyLine = L.polyline.antPath(latLngs, {
                            "delay": 1500,
                            "dashArray": [10, 20],
                            "weight": 5,
                            "color": "#0000FF",
                            "pulseColor": "#FFFFFF",
                            "paused": false,
                            "reverse": false,
                            "hardwareAcceleration": true
                        }).addTo(historyMap);
                        
                        // Fit map to show all positions including path
                        const allCoordinates = [
                            [equipment.latitude, equipment.longitude],
                            ...latLngs
                        ];
                        this.fitMapToCoordinates(historyMap, allCoordinates);
                    } catch (error) {
                        console.warn('Ant path not available, using standard polyline:', error);
                        // Fallback to standard polyline
                        const historyLine = L.polyline(latLngs, {
                            color: "#0000FF",
                            weight: 3,
                            dashArray: "5, 10"
                        }).addTo(historyMap);
                        
                        const allCoordinates = [
                            [equipment.latitude, equipment.longitude],
                            ...latLngs
                        ];
                        this.fitMapToCoordinates(historyMap, allCoordinates);
                    }
                } else {
                    // Fallback: standard polyline if ant path not available
                    if (latLngs.length > 1) {
                        const historyLine = L.polyline(latLngs, {
                            color: "#0000FF",
                            weight: 3,
                            dashArray: "5, 10"
                        }).addTo(historyMap);
                    }
                    
                    // Fit map to show all positions
                    const allCoordinates = [
                        [equipment.latitude, equipment.longitude],
                        ...latLngs
                    ];
                    this.fitMapToCoordinates(historyMap, allCoordinates);
                }

                // Update coordinates array with historical data
                allCoordinates.push(...latLngs);

                // Store coordinates for later use (modal shown event)
                historyMap._currentBounds = allCoordinates;

                // Bind table-map interaction
                $('table#coordinateHistoryTable tbody tr')
                    .off('mouseenter mouseleave') // Remove existing handlers
                    .on('mouseenter', function () {
                        const date = $(this).data('date');
                        const currentMarker = markers[date];
                        if (currentMarker) {
                            currentMarker.openPopup();
                        }
                    })
                    .on('mouseleave', function () {
                        const date = $(this).data('date');
                        const currentMarker = markers[date];
                        if (currentMarker) {
                            currentMarker.closePopup();
                        }
                    });
            }
        } else {
            // No historical data - just store current position
            historyMap._currentBounds = allCoordinates;
        }

        // Apply fit with delay to ensure proper rendering (for all cases)
        setTimeout(() => {
            this.fitMapToCoordinates(historyMap, allCoordinates);
        }, 200);
    },

    /**
     * Format date for HTML input[type="date"]
     * Converts Date object to YYYY-MM-DD format
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForInput: function(date) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Fit map to show all coordinates with proper bounds
     * Fixes issue where fitBounds doesn't work correctly
     * @param {L.Map} map - Leaflet map instance
     * @param {Array} coordinates - Array of [lat, lng] coordinate pairs
     */
    fitMapToCoordinates: function(map, coordinates) {
        if (!coordinates || coordinates.length === 0) {
            return;
        }

        try {
            if (coordinates.length === 1) {
                // Single point - just center on it
                map.setView(coordinates[0], 15);
            } else {
                // Multiple points - calculate bounds
                const group = new L.featureGroup(
                    coordinates.map(coord => L.marker(coord))
                );
                
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 16
                    });
                } else {
                    // Fallback if bounds calculation fails
                    const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
                    const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
                    map.setView([centerLat, centerLng], 15);
                }
            }
        } catch (error) {
            console.error('Error fitting map to coordinates:', error);
            // Ultimate fallback
            if (coordinates.length > 0) {
                map.setView(coordinates[0], 15);
            }
        }
    }
};

/**
 * Multi-Vehicle History Modal Manager
 * Shows trajectories for multiple selected equipments simultaneously
 */
GeolocCommon.MultiVehicleHistoryModal = {
    /**
     * Color palette for multi-vehicle visualization (15 distinct colors)
     */
    TRAJECTORY_COLORS: [
        '#e41a1c', // red
        '#377eb8', // blue
        '#4daf4a', // green
        '#984ea3', // purple
        '#ff7f00', // orange
        '#ffff33', // yellow
        '#a65628', // brown
        '#f781bf', // pink
        '#999999', // grey
        '#66c2a5', // teal
        '#fc8d62', // coral
        '#8da0cb', // light blue
        '#e78ac3', // magenta
        '#a6d854', // lime
        '#ffd92f'  // gold
    ],

    /**
     * Show multi-vehicle history modal
     * @param {Array} equipmentIds - Array of equipment IDs to show history for
     * @param {Object} options - Modal options
     */
    show: function(equipmentIds, options = {}) {
        if (!equipmentIds || equipmentIds.length === 0) {
            console.warn('No equipment IDs provided for multi-vehicle history');
            return;
        }

        const modalId = 'geolocMultiHistoryModal';
        const mapId = 'geolocMultiHistoryMap';

        // Default to current day
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const modalHTML = this.buildModalHTML(modalId, mapId, startDate, endDate);

        // Remove existing and add new modal
        $(`#${modalId}`).remove();
        $('body').append(modalHTML);

        // Initialize modal
        this.initializeModal(modalId, mapId, equipmentIds, startDate, endDate);

        // Show modal
        $(`#${modalId}`).modal('show');

        // Handle map rendering after modal shown
        $(`#${modalId}`).on('shown.bs.modal', () => {
            setTimeout(() => {
                const mapInstance = window.geolocMultiHistoryMap;
                if (mapInstance) {
                    mapInstance.invalidateSize();
                }
            }, 150);
        });

        // Cleanup on hide
        $(`#${modalId}`).on('hidden.bs.modal', function() {
            if (window.geolocMultiHistoryMap) {
                window.geolocMultiHistoryMap.remove();
                delete window.geolocMultiHistoryMap;
            }
            $(this).remove();
        });
    },

    /**
     * Build modal HTML structure
     * @param {string} modalId - Modal DOM ID
     * @param {string} mapId - Map container DOM ID
     * @param {Date} startDate - Initial start date
     * @param {Date} endDate - Initial end date
     * @returns {string} HTML string for modal
     */
    buildModalHTML: function(modalId, mapId, startDate, endDate) {
        return `
            <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document" style="width: 95%; max-width: 1400px;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal">&times;</button>
                            <h4 class="modal-title">
                                <i class="fa fa-route"></i> Historique multi-vehicules
                            </h4>
                        </div>
                        <div class="modal-body">
                            <div class="container-fluid">
                                <div class="row" style="margin-bottom: 15px;">
                                    <div class="col-md-3">
                                        <label>Date de debut:</label>
                                        <input type="date" id="multiHistoryStartDate" class="form-control input-sm"
                                               value="${this.formatDateForInput(startDate)}">
                                    </div>
                                    <div class="col-md-3">
                                        <label>Date de fin:</label>
                                        <input type="date" id="multiHistoryEndDate" class="form-control input-sm"
                                               value="${this.formatDateForInput(endDate)}">
                                    </div>
                                    <div class="col-md-2" style="padding-top: 25px;">
                                        <button type="button" class="btn btn-primary btn-sm" id="multiHistoryRefresh">
                                            <i class="fa fa-refresh"></i> Appliquer
                                        </button>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-3">
                                        <h5>Legende</h5>
                                        <div id="multiHistoryLegend" class="multi-history-legend">
                                            <div style="padding: 15px; text-align: center;">
                                                <i class="fa fa-spinner fa-spin"></i> Chargement...
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-9">
                                        <div id="${mapId}" style="height: 600px; position: relative;">
                                            <div class="loading-overlay" style="display: flex;">
                                                <i class="fa fa-spinner fa-spin"></i>
                                                <span>Chargement des historiques...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Fermer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Initialize modal with event handlers and load data
     * @param {string} modalId - Modal DOM ID
     * @param {string} mapId - Map container DOM ID
     * @param {Array} equipmentIds - Array of equipment IDs
     * @param {Date} startDate - Initial start date
     * @param {Date} endDate - Initial end date
     */
    initializeModal: function(modalId, mapId, equipmentIds, startDate, endDate) {
        // Store equipment IDs for refresh
        this._currentEquipmentIds = equipmentIds;

        // Create map
        window.geolocMultiHistoryMap = GeolocCommon.MapManager.createMap(mapId, {
            center: GeolocCommon.Config.DEFAULT_CENTER,
            zoom: GeolocCommon.Config.DEFAULT_ZOOM
        });

        // Load histories
        this.loadMultipleHistories(equipmentIds, startDate, endDate, mapId);

        // Bind refresh button
        $('#multiHistoryRefresh').on('click', () => {
            const newStartDate = new Date($('#multiHistoryStartDate').val());
            const newEndDate = new Date($('#multiHistoryEndDate').val());

            // Validate dates
            if (newEndDate < newStartDate) {
                $.fn.showAlert({
                    message: 'La date de fin doit etre superieure a la date de debut',
                    level: 'warning'
                });
                return;
            }

            this.loadMultipleHistories(this._currentEquipmentIds, newStartDate, newEndDate, mapId);
        });
    },

    /**
     * Load history for multiple equipments
     * @param {Array} equipmentIds - Array of equipment IDs
     * @param {Date} startDate - Start date for history filter
     * @param {Date} endDate - End date for history filter
     * @param {string} mapId - Map container DOM ID
     */
    loadMultipleHistories: function(equipmentIds, startDate, endDate, mapId) {
        const legendContainer = $('#multiHistoryLegend');
        legendContainer.html('<div style="padding: 15px; text-align: center;"><i class="fa fa-spinner fa-spin"></i> Chargement des historiques...</div>');

        // Show loading overlay on map
        $(`#${mapId} .loading-overlay`).css('display', 'flex');

        // Batch load all equipment histories
        const promises = equipmentIds.map(eqId =>
            GeolocCommon.AjaxHelper.request('getEquipmentById', {
                eqLogicId: eqId,
                getHistory: true,
                startDate: startDate.toDateString(),
                endDate: endDate.toDateString()
            })
        );

        Promise.all(promises)
            .then(responses => {
                const equipmentsWithHistory = responses
                    .filter(r => r.state === 'ok')
                    .map(r => r.result);

                this.renderMultipleTrajectories(equipmentsWithHistory, mapId);
            })
            .catch(error => {
                console.error('Error loading multi-vehicle history:', error);
                legendContainer.html('<div class="alert alert-danger">Erreur lors du chargement des historiques</div>');
                $(`#${mapId} .loading-overlay`).hide();
            });
    },

    /**
     * Render trajectories for multiple equipments on the map
     * @param {Array} equipments - Array of equipment objects with coordinate history
     * @param {string} mapId - Map container DOM ID
     */
    renderMultipleTrajectories: function(equipments, mapId) {
        const map = window.geolocMultiHistoryMap;
        const legendContainer = $('#multiHistoryLegend');

        // Clear existing layers (except tile layer)
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        const allCoordinates = [];
        let legendHtml = '';
        let totalPoints = 0;

        equipments.forEach((equipment, index) => {
            const color = this.TRAJECTORY_COLORS[index % this.TRAJECTORY_COLORS.length];
            const history = equipment.coordinateHistory || [];

            // Filter valid history entries
            const validHistory = history.filter(h => {
                const lat = h.coordinate ? h.coordinate.latitude : h.latitude;
                const lng = h.coordinate ? h.coordinate.longitude : h.longitude;
                return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
            });

            // Add to legend
            legendHtml += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color};"></span>
                    <span class="legend-name" title="${equipment.name}">${equipment.name}</span>
                    <span class="legend-count">(${validHistory.length} pts)</span>
                </div>
            `;

            if (validHistory.length === 0) {
                return; // Skip equipment with no history
            }

            totalPoints += validHistory.length;

            // Extract coordinates
            const latLngs = validHistory.map(h => {
                const lat = h.coordinate ? h.coordinate.latitude : h.latitude;
                const lng = h.coordinate ? h.coordinate.longitude : h.longitude;
                return [parseFloat(lat), parseFloat(lng)];
            });

            allCoordinates.push(...latLngs);

            // Add current position marker with equipment color
            if (equipment.latitude && equipment.longitude) {
                const currentLatLng = [parseFloat(equipment.latitude), parseFloat(equipment.longitude)];
                const currentMarker = L.marker(currentLatLng, {
                    icon: this.createColoredIcon(color)
                }).addTo(map);

                currentMarker.bindPopup(`
                    <div class="geoloc-popup">
                        <h4>${equipment.name}</h4>
                        <p><strong>Position actuelle</strong></p>
                    </div>
                `);
            }

            // Draw trajectory
            if (latLngs.length > 1) {
                if (typeof L.polyline.antPath === 'function') {
                    try {
                        L.polyline.antPath(latLngs, {
                            delay: 1500,
                            dashArray: [10, 20],
                            weight: 4,
                            color: color,
                            pulseColor: '#FFFFFF',
                            paused: false,
                            reverse: false,
                            hardwareAcceleration: true
                        }).addTo(map);
                    } catch (e) {
                        // Fallback to standard polyline
                        L.polyline(latLngs, {
                            color: color,
                            weight: 4,
                            opacity: 0.8
                        }).addTo(map);
                    }
                } else {
                    L.polyline(latLngs, {
                        color: color,
                        weight: 4,
                        opacity: 0.8
                    }).addTo(map);
                }
            }

            // Add history point markers
            latLngs.forEach((latLng, pointIndex) => {
                const historyEntry = validHistory[pointIndex];
                const date = new Date(historyEntry.date).toLocaleString('fr-FR');

                L.circleMarker(latLng, {
                    radius: 4,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8
                }).bindPopup(`
                    <div class="geoloc-popup">
                        <h4>${equipment.name}</h4>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Lat:</strong> ${latLng[0].toFixed(6)}</p>
                        <p><strong>Lng:</strong> ${latLng[1].toFixed(6)}</p>
                    </div>
                `).addTo(map);
            });
        });

        // Update legend
        if (legendHtml) {
            legendContainer.html(legendHtml);
        } else {
            legendContainer.html('<div class="text-muted" style="padding: 15px; text-align: center;">Aucun equipement selectionne</div>');
        }

        // Hide loading overlay
        $(`#${mapId} .loading-overlay`).hide();

        // Fit map to show all trajectories
        if (allCoordinates.length > 0) {
            GeolocCommon.HistoryModal.fitMapToCoordinates(map, allCoordinates);
        } else {
            // No data - show message
            legendContainer.append(`
                <div class="alert alert-info" style="margin-top: 10px;">
                    <i class="fa fa-info-circle"></i> Aucune donnee d'historique pour cette periode
                </div>
            `);
        }
    },

    /**
     * Create a colored marker icon
     * @param {string} color - Hex color for the marker
     * @returns {L.DivIcon} Leaflet div icon with color
     */
    createColoredIcon: function(color) {
        // Use default icon with color tint via CSS filter or SVG
        // Fallback to standard colored markers if available
        const availableColors = ['red', 'blue', 'green', 'orange', 'yellow', 'violet', 'grey', 'black', 'gold'];
        const colorMap = {
            '#e41a1c': 'red',
            '#377eb8': 'blue',
            '#4daf4a': 'green',
            '#984ea3': 'violet',
            '#ff7f00': 'orange',
            '#ffff33': 'yellow',
            '#a65628': 'orange',
            '#f781bf': 'red',
            '#999999': 'grey',
            '#66c2a5': 'green',
            '#fc8d62': 'orange',
            '#8da0cb': 'blue',
            '#e78ac3': 'red',
            '#a6d854': 'green',
            '#ffd92f': 'gold'
        };

        const markerColor = colorMap[color] || 'blue';
        return GeolocCommon.MarkerFactory.createIcon(markerColor);
    },

    /**
     * Format date for HTML input[type="date"]
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string (YYYY-MM-DD)
     */
    formatDateForInput: function(date) {
        return date.toISOString().split('T')[0];
    }
};
