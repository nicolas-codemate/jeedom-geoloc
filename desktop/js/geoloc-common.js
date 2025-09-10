/**
 * Geoloc Common Library
 * Shared functionality between admin interface and dashboard widgets
 */

// Namespace pour éviter les conflits
window.GeolocCommon = window.GeolocCommon || {};

/**
 * Configuration and Constants
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
     * Fit map bounds to include all markers
     * @param {L.Map} map - Leaflet map instance
     * @param {Array} coordinates - Array of [lat, lng] coordinates
     * @param {Object} options - Fit bounds options
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
 */
GeolocCommon.MarkerFactory = {
    /**
     * Create a marker with standard styling
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} options - Marker options
     * @returns {L.Marker} Leaflet marker
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
     * @param {string} color - Marker color
     * @returns {L.Icon} Leaflet icon
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
     * @param {Object} equipment - Equipment data
     * @param {Object} options - Popup options
     * @returns {string} HTML content for popup
     */
    createPopupContent: function(equipment, options = {}) {
        const showActions = options.showActions || false;
        const lat = parseFloat(equipment.latitude);
        const lng = parseFloat(equipment.longitude);
        
        let content = `
            <div class="geoloc-popup">
                <h4>${equipment.humanName || equipment.name}</h4>
                <p><strong>Position:</strong><br>
                Latitude: ${lat.toFixed(6)}<br>
                Longitude: ${lng.toFixed(6)}</p>
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
 */
GeolocCommon.EquipmentProcessor = {
    /**
     * Collect all equipment from hierarchical data structure
     * @param {Object} data - Hierarchical equipment data
     * @returns {Array} Flat array of equipment objects
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
     * @param {Array} equipments - Array of equipment objects
     * @returns {Array} Filtered equipment with valid coordinates
     */
    filterValidCoordinates: function(equipments) {
        return equipments.filter(eq => 
            eq.latitude && eq.longitude && 
            !isNaN(parseFloat(eq.latitude)) && !isNaN(parseFloat(eq.longitude))
        );
    },

    /**
     * Extract coordinates from equipment array
     * @param {Array} equipments - Array of equipment objects
     * @returns {Array} Array of [lat, lng] coordinates
     */
    extractCoordinates: function(equipments) {
        return equipments.map(eq => [parseFloat(eq.latitude), parseFloat(eq.longitude)]);
    },

    /**
     * Get next color for marker
     * @param {number} index - Index for color selection
     * @returns {string} Color name
     */
    getMarkerColor: function(index) {
        return GeolocCommon.Config.MARKER_COLORS[index % GeolocCommon.Config.MARKER_COLORS.length];
    }
};

/**
 * AJAX Helper - Handles common AJAX operations
 */
GeolocCommon.AjaxHelper = {
    /**
     * Make AJAX request to geoloc plugin
     * @param {string} action - Action to perform
     * @param {Object} data - Additional data to send
     * @returns {Promise} jQuery AJAX promise
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
     * @param {string|number} parentObjectId - Parent object ID
     * @returns {jqXHR} jQuery AJAX promise
     */
    loadEquipments: function(parentObjectId) {
        return this.request('getEquipments', { parentObjectId: parentObjectId });
    }
};

/**
 * Utility functions
 */
GeolocCommon.Utils = {
    /**
     * Show loading overlay on element
     * @param {string} elementId - Element ID
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
     * @param {string} elementId - Element ID
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
     * @param {string} containerId - Container element ID
     * @param {string} message - Error message
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
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
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

// Log successful loading
console.log('GeolocCommon library loaded successfully');