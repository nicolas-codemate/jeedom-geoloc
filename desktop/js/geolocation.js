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

    // Attendre que Leaflet soit disponible
    if (typeof L === 'undefined') {
        loadLeaflet().then(() => initializeWidget(widget));
    } else {
        initializeWidget(widget);
    }
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

function initializeWidget(widget) {
    const mapContainer = document.getElementById(`geolocMap_${widget.id}`);
    if (!mapContainer) {
        console.error(`Map container not found for widget ${widget.id}`);
        return;
    }

    // Masquer l'overlay de chargement après initialisation
    hideLoadingOverlay(widget.id);

    try {
        // Initialiser la carte Leaflet
        widget.map = L.map(`geolocMap_${widget.id}`, {
            center: [46.603354, 1.888334], // Centre de la France par défaut
            zoom: 6,
            zoomControl: true,
            attributionControl: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            boxZoom: false,
            keyboard: false
        });

        // Ajouter les tuiles OpenStreetMap
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(widget.map);

        // Charger les équipements
        loadEquipments(widget);

        // Configurer l'actualisation automatique toutes les 60 secondes
        widget.refreshInterval = setInterval(() => {
            loadEquipments(widget);
        }, 60000);

        console.log(`Widget ${widget.id} initialized successfully`);

    } catch (error) {
        console.error(`Error initializing widget ${widget.id}:`, error);
        showError(widget.id, 'Erreur lors de l\'initialisation de la carte');
    }
}

function loadEquipments(widget) {
    if (widget.isLoading) {
        return;
    }

    widget.isLoading = true;
    showLoadingOverlay(widget.id);

    const data = `action=getEquipments&parentObjectId=${widget.objectId}`;

    $.ajax({
        url: 'plugins/geoloc/core/ajax/geoloc.ajax.php',
        type: 'POST',
        data: data,
        cache: false,
        processData: false
    })
    .done(function(response) {
        try {
            const returnData = JSON.parse(response);
            if (returnData.state !== 'ok') {
                showError(widget.id, returnData.result || 'Erreur lors du chargement');
                return;
            }

            processEquipments(widget, returnData.result);
        } catch (error) {
            console.error(`Error parsing response for widget ${widget.id}:`, error);
            showError(widget.id, 'Erreur lors du traitement des données');
        }
    })
    .fail(function(xhr, status, error) {
        console.error(`AJAX error for widget ${widget.id}:`, error);
        showError(widget.id, 'Erreur de communication avec le serveur');
    })
    .always(function() {
        widget.isLoading = false;
        hideLoadingOverlay(widget.id);
    });
}

function processEquipments(widget, data) {
    // Nettoyer les marqueurs existants
    clearMarkers(widget);

    // Collecter tous les équipements géolocalisables
    const equipments = collectEquipments(data);

    // Filtrer les équipements avec coordonnées valides
    const validEquipments = equipments.filter(eq => 
        eq.latitude && eq.longitude && 
        !isNaN(parseFloat(eq.latitude)) && !isNaN(parseFloat(eq.longitude))
    );

    // Mettre à jour le compteur
    updateEquipmentCount(widget.id, validEquipments.length);

    if (validEquipments.length === 0) {
        // Pas d'équipements géolocalisables
        widget.map.setView([46.603354, 1.888334], 6);
        return;
    }

    // Ajouter les marqueurs
    const bounds = L.latLngBounds();
    
    validEquipments.forEach(equipment => {
        const marker = createMarker(equipment);
        marker.addTo(widget.map);
        widget.markers.push(marker);

        bounds.extend([equipment.latitude, equipment.longitude]);
    });

    // Ajuster la vue pour inclure tous les marqueurs
    if (bounds.isValid()) {
        widget.map.fitBounds(bounds, { padding: [10, 10], maxZoom: 16 });
    }
}

function collectEquipments(data) {
    const equipments = [];

    function traverse(node) {
        if (node.items && node.items.length > 0) {
            equipments.push(...node.items);
        }
        
        if (node.child && node.child.length > 0) {
            node.child.forEach(traverse);
        }
    }

    traverse(data);
    return equipments;
}

function createMarker(equipment) {
    const lat = parseFloat(equipment.latitude);
    const lng = parseFloat(equipment.longitude);

    const marker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: '/plugins/geoloc/desktop/css/images/marker-icon-blue.png',
            shadowUrl: '/plugins/geoloc/desktop/css/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    });

    // Popup avec informations basiques
    const popupContent = `
        <div class="geoloc-popup">
            <h4>${equipment.humanName || equipment.name}</h4>
            <p><strong>Position:</strong><br>
            Latitude: ${lat.toFixed(6)}<br>
            Longitude: ${lng.toFixed(6)}</p>
            ${equipment.parents ? `<p><strong>Objet:</strong> ${equipment.parents}</p>` : ''}
        </div>
    `;

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

function showLoadingOverlay(widgetId) {
    const overlay = document.querySelector(`#geolocMap_${widgetId} .loading-overlay`);
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay(widgetId) {
    const overlay = document.querySelector(`#geolocMap_${widgetId} .loading-overlay`);
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showError(widgetId, message) {
    const mapContainer = document.getElementById(`geolocMap_${widgetId}`);
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="geoloc-error">
                <i class="fa fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

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