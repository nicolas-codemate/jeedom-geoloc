// Geolocation Dashboard Widget JavaScript
// Mode lecture seule pour visualisation dans le dashboard

window.geolocWidgetInstances = window.geolocWidgetInstances || {};

function initGeolocWidget(widgetId, objectId, objectName) {
    // Éviter les initialisations multiples
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

    // Attendre que Leaflet et GeolocCommon soient disponibles
    if (typeof L === 'undefined' || typeof GeolocCommon === 'undefined') {
        loadDependencies().then(() => initializeWidget(widget));
    } else {
        initializeWidget(widget);
    }
}

function loadDependencies() {
    return Promise.all([loadLeaflet(), loadGeolocCommon()]);
}

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

function initializeWidget(widget) {
    const mapContainer = document.getElementById(`geolocMap_${widget.id}`);
    if (!mapContainer) {
        console.error(`Map container not found for widget ${widget.id}`);
        return;
    }

    // Masquer l'overlay de chargement après initialisation
    GeolocCommon.Utils.hideLoading(`geolocMap_${widget.id}`);

    try {
        // Initialiser la carte Leaflet avec les paramètres communs
        widget.map = GeolocCommon.MapManager.createMap(`geolocMap_${widget.id}`, {
            center: GeolocCommon.Config.DEFAULT_CENTER,
            zoom: GeolocCommon.Config.DEFAULT_ZOOM,
            boxZoom: false,
            keyboard: false
        });

        // Charger les équipements
        loadEquipments(widget);

        // Configurer l'actualisation automatique toutes les 60 secondes
        widget.refreshInterval = setInterval(() => {
            loadEquipments(widget);
        }, 60000);

        console.log(`Widget ${widget.id} initialized successfully`);

    } catch (error) {
        console.error(`Error initializing widget ${widget.id}:`, error);
        GeolocCommon.Utils.showError(`geolocMap_${widget.id}`, 'Erreur lors de l\'initialisation de la carte');
    }
}

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

function processEquipments(widget, data) {
    // Nettoyer les marqueurs existants
    clearMarkers(widget);

    // Collecter et filtrer les équipements avec coordonnées valides
    const allEquipments = GeolocCommon.EquipmentProcessor.collectEquipments(data);
    const validEquipments = GeolocCommon.EquipmentProcessor.filterValidCoordinates(allEquipments);

    // Mettre à jour le compteur
    updateEquipmentCount(widget.id, validEquipments.length);

    if (validEquipments.length === 0) {
        // Pas d'équipements géolocalisables - retour à la vue par défaut
        widget.map.setView(GeolocCommon.Config.DEFAULT_CENTER, GeolocCommon.Config.DEFAULT_ZOOM);
        return;
    }

    // Ajouter les marqueurs
    validEquipments.forEach(equipment => {
        const marker = createMarker(equipment);
        marker.addTo(widget.map);
        widget.markers.push(marker);
    });

    // Ajuster la vue pour inclure tous les marqueurs
    const coordinates = GeolocCommon.EquipmentProcessor.extractCoordinates(validEquipments);
    GeolocCommon.MapManager.fitBoundsToCoordinates(widget.map, coordinates);
}

function createMarker(equipment) {
    const lat = parseFloat(equipment.latitude);
    const lng = parseFloat(equipment.longitude);

    // Utiliser la factory commune pour créer le marqueur
    const marker = GeolocCommon.MarkerFactory.createMarker(lat, lng, {
        color: 'blue'
    });

    // Popup avec informations basiques (mode lecture seule)
    const popupContent = GeolocCommon.MarkerFactory.createPopupContent(equipment, {
        showActions: false
    });

    marker.bindPopup(popupContent, {
        className: 'geoloc-widget-popup',
        maxWidth: 250
    });

    return marker;
}

function clearMarkers(widget) {
    widget.markers.forEach(marker => {
        widget.map.removeLayer(marker);
    });
    widget.markers = [];
}

// Utility functions now handled by GeolocCommon.Utils

function updateEquipmentCount(widgetId, count) {
    const countElement = document.getElementById(`equipmentCount_${widgetId}`);
    if (countElement) {
        countElement.textContent = `${count} équipement(s) géolocalisé(s)`;
    }
}

// Nettoyage lors de la destruction du widget
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

// Gestion du redimensionnement
$(document).on('widget:resized', function(event, widgetId) {
    const widget = window.geolocWidgetInstances[widgetId];
    if (widget && widget.map) {
        setTimeout(() => {
            widget.map.invalidateSize();
        }, 100);
    }
});