/**
 * Geolocation Dashboard Widget
 * Read-only map widget for Jeedom dashboard displaying geolocated equipment
 */

window.GeolocDashboard = (function() {
    'use strict';
    
    const instances = {};
    const REFRESH_INTERVAL = 60000; // 60 seconds
    
    class DashboardMapWidget {
        constructor(objectId) {
            this.objectId = objectId;
            this.map = null;
            this.markers = [];
            this.refreshTimer = null;
            this.mapContainer = `geoloc-map-${objectId}`;
            this.isInitialized = false;
        }
        
        async init() {
            try {
                await this.initializeMap();
                await this.loadEquipments();
                this.startAutoRefresh();
                this.isInitialized = true;
            } catch (error) {
                console.error('GeolocDashboard: Error initializing widget for object', this.objectId, error);
                this.showError('Erreur lors de l\'initialisation de la carte');
            }
        }
        
        initializeMap() {
            return new Promise((resolve, reject) => {
                try {
                    const mapElement = document.getElementById(this.mapContainer);
                    if (!mapElement) {
                        reject(new Error(`Map container not found: ${this.mapContainer}`));
                        return;
                    }
                    
                    // Clear loading message
                    mapElement.innerHTML = '';
                    
                    // Initialize Leaflet map
                    this.map = L.map(this.mapContainer, {
                        zoomControl: true,
                        scrollWheelZoom: true,
                        dragging: true,
                        touchZoom: true,
                        doubleClickZoom: true,
                        boxZoom: false
                    }).setView([46.603354, 1.888334], 6); // Center of France as default
                    
                    // Add OpenStreetMap tiles
                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                        maxZoom: 18
                    }).addTo(this.map);
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        }
        
        async loadEquipments() {
            try {
                const data = await this.fetchEquipments();
                this.clearMarkers();
                
                if (data && data.result) {
                    const equipments = this.extractEquipmentsFromTree(data.result);
                    const validEquipments = equipments.filter(eq => 
                        eq.latitude && eq.longitude && 
                        !isNaN(parseFloat(eq.latitude)) && !isNaN(parseFloat(eq.longitude))
                    );
                    
                    this.updateEquipmentCount(validEquipments.length);
                    
                    if (validEquipments.length > 0) {
                        this.addMarkersForEquipments(validEquipments);
                        this.fitMapToMarkers();
                    } else {
                        this.showMessage('Aucun équipement géolocalisé trouvé');
                    }
                } else {
                    this.updateEquipmentCount(0);
                    this.showMessage('Aucun équipement trouvé');
                }
            } catch (error) {
                console.error('GeolocDashboard: Error loading equipments:', error);
                this.showError('Erreur lors du chargement des équipements');
            }
        }
        
        fetchEquipments() {
            return new Promise((resolve, reject) => {
                const data = `action=getEquipments&parentObjectId=${this.objectId}`;
                
                $.ajax({
                    url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
                    type: 'POST',
                    data: data,
                    cache: false,
                    processData: false,
                    success: function(response) {
                        try {
                            const returnData = JSON.parse(response);
                            if (returnData.state !== 'ok') {
                                reject(new Error(returnData.result || 'Erreur inconnue'));
                                return;
                            }
                            resolve(returnData);
                        } catch (parseError) {
                            reject(parseError);
                        }
                    },
                    error: function(xhr, status, error) {
                        reject(new Error(`AJAX Error: ${status} - ${error}`));
                    }
                });
            });
        }
        
        extractEquipmentsFromTree(treeNode) {
            let equipments = [];
            
            // Add equipments from current node
            if (treeNode.items && Array.isArray(treeNode.items)) {
                equipments = equipments.concat(treeNode.items);
            }
            
            // Recursively add equipments from child nodes
            if (treeNode.child && Array.isArray(treeNode.child)) {
                treeNode.child.forEach(child => {
                    equipments = equipments.concat(this.extractEquipmentsFromTree(child));
                });
            }
            
            return equipments;
        }
        
        addMarkersForEquipments(equipments) {
            equipments.forEach(equipment => {
                try {
                    const lat = parseFloat(equipment.latitude);
                    const lng = parseFloat(equipment.longitude);
                    
                    if (isNaN(lat) || isNaN(lng)) {
                        console.warn('GeolocDashboard: Invalid coordinates for equipment', equipment.name);
                        return;
                    }
                    
                    const marker = L.marker([lat, lng], {
                        icon: L.icon({
                            iconUrl: '/plugins/geoloc/desktop/css/images/marker-icon-2x-blue.png',
                            shadowUrl: '/plugins/geoloc/desktop/css/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        })
                    }).addTo(this.map);
                    
                    // Create popup content
                    const popupContent = `
                        <div class="geoloc-popup">
                            <h4>${equipment.name || 'Équipement sans nom'}</h4>
                            <p><strong>Position:</strong><br>
                            Lat: ${lat.toFixed(6)}<br>
                            Lng: ${lng.toFixed(6)}</p>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    this.markers.push(marker);
                } catch (error) {
                    console.error('GeolocDashboard: Error creating marker for equipment', equipment.name, error);
                }
            });
        }
        
        clearMarkers() {
            this.markers.forEach(marker => {
                this.map.removeLayer(marker);
            });
            this.markers = [];
        }
        
        fitMapToMarkers() {
            if (this.markers.length === 0) return;
            
            if (this.markers.length === 1) {
                // Single marker - center on it with reasonable zoom
                const marker = this.markers[0];
                this.map.setView(marker.getLatLng(), 15);
            } else {
                // Multiple markers - fit bounds
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds().pad(0.1), {
                    maxZoom: 16
                });
            }
        }
        
        updateEquipmentCount(count) {
            const statusElement = document.querySelector(`[data-object_id="${this.objectId}"] .geoloc-equipment-count`);
            if (statusElement) {
                statusElement.textContent = count;
            }
        }
        
        showMessage(message) {
            const mapElement = document.getElementById(this.mapContainer);
            if (mapElement && !this.map) {
                mapElement.innerHTML = `
                    <div class="geoloc-message" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; text-align: center;">
                        <div>
                            <i class="fa fa-info-circle" style="font-size: 24px; margin-bottom: 8px;"></i><br>
                            ${message}
                        </div>
                    </div>
                `;
            }
        }
        
        showError(message) {
            const mapElement = document.getElementById(this.mapContainer);
            if (mapElement) {
                mapElement.innerHTML = `
                    <div class="geoloc-error" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #d9534f; text-align: center;">
                        <div>
                            <i class="fa fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i><br>
                            ${message}
                        </div>
                    </div>
                `;
            }
            console.error('GeolocDashboard: Error -', message);
        }
        
        startAutoRefresh() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
            
            this.refreshTimer = setInterval(() => {
                if (this.isInitialized) {
                    this.loadEquipments();
                }
            }, REFRESH_INTERVAL);
        }
        
        stopAutoRefresh() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        }
        
        destroy() {
            this.stopAutoRefresh();
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
            this.markers = [];
            this.isInitialized = false;
        }
    }
    
    // Public API
    return {
        initWidget: function(objectId) {
            if (!objectId) {
                console.error('GeolocDashboard: Object ID is required');
                return;
            }
            
            // Clean up existing instance if any
            if (instances[objectId]) {
                instances[objectId].destroy();
                delete instances[objectId];
            }
            
            // Create new instance
            instances[objectId] = new DashboardMapWidget(objectId);
            
            // Initialize with a small delay to ensure DOM is ready
            setTimeout(() => {
                instances[objectId].init();
            }, 100);
        },
        
        refreshWidget: function(objectId) {
            if (instances[objectId] && instances[objectId].isInitialized) {
                instances[objectId].loadEquipments();
            }
        },
        
        destroyWidget: function(objectId) {
            if (instances[objectId]) {
                instances[objectId].destroy();
                delete instances[objectId];
            }
        },
        
        destroyAll: function() {
            Object.keys(instances).forEach(objectId => {
                this.destroyWidget(objectId);
            });
        }
    };
})();

// Global cleanup on page unload
$(window).on('beforeunload', function() {
    if (window.GeolocDashboard) {
        window.GeolocDashboard.destroyAll();
    }
});