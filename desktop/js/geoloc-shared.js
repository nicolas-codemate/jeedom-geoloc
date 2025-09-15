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
     * @param {Object} options - Popup options (showActions, etc.)
     * @returns {string} HTML string for popup content
     */
    createPopupContent: function(equipment, options = {}) {
        const showActions = options.showActions || false;
        
        let content = `
            <div class="geoloc-popup">
                <h4>${equipment.name}</h4>
        `;

        if (equipment.parents) {
            content += `<p><strong>Objet:</strong> ${equipment.parents}</p>`;
        }

        if (showActions) {
            content += `
                <div>
                    <a class="btn btn-primary btn-xs map-action" data-action="getHistory" data-eqlogic-id="${equipment.id}">
                        <i class="fa fa-history"></i> Historique
                    </a>
                    <a class="btn btn-warning btn-xs map-action" data-action="updatePosition" data-eqLogic-id="${equipment.id}">
                        <i class="fa fa-pen"></i> Modifier position
                    </a>
                </div>
            `;
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
