
$(function () {

    class DisplayableObjects {
        constructor(map) {
            this.objects = {};
            this.map = map;
        }

        getVisibleObjects() {
            return Object.values(this.objects).filter(object => object.display);
        }

        addObject(object) {
            this.objects[object.id] = object;
            if (object.display) {
                this.buildMarker(object);
            }
        }

        hideObject(object) {
            this.objects[object.id].display = false;
            this.removeMarker(object);
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
            marker.bindPopup(`<h1>${object.name}</h1>`);
            this.objects[object.id].marker = marker;
        }

        // build a method to center the map where I can see all the markers
        centerMap() {
            const group = new L.featureGroup(Object.values(this.getVisibleObjects()).map(object => object.marker));
            this.map.flyToBounds(group.getBounds().pad(0.1), {animate: true, duration: 1});
        }

        removeMarker(object) {
            this.map.removeLayer(this.objects[object.id].marker);
        }

        reset() {
            for (const key in this.objects) {
                if (this.objects.hasOwnProperty(key)) {
                    const element = this.objects[key];
                    if (element instanceof Object) {
                        this.removeMarker(element);
                        delete this.objects[key];
                    }
                }
            }
            // reset map to default position
            this.map.setView([defaultCordinate.defaultLatitude, defaultCordinate.defaultLongitude], defaultCordinate.defaultZoom);
        }
    }

    let displayableObjects;

    const buildMap = function () {
        const {defaultLatitude, defaultLongitude, defaultZoom} = defaultCordinate;

        const map = L.map('map').setView([defaultLatitude, defaultLongitude], defaultZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 20,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        displayableObjects = new DisplayableObjects(map);
    }


    const buildObject = function (jeeObject) {
        jeeObject.display = true; // by default, we display the object
        displayableObjects.addObject(jeeObject);
        return `
<div class="eqLogicDisplayCard cursor displayAsTable" data-object="${jeeObject.id}">
    <img alt="objectIcon" class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.humanName}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <input type="checkbox" name="objectVisible" class="eqLogicVisible" checked data-object-id="${jeeObject.id}">
    </span>
</div>
`;
    }

    // build plugin index page with equipements list and current state
    const buildEqLogicContainer = function (data) {
        const container = $('#eqLogicThumbnailContainer');
        container.find('div').remove();

        if (!data) {
            return;
        }

        const buildItems = function (jeeObject) {
            let items = [];

            if (jeeObject.items.length > 0) {
                items = jeeObject.items.map(equipment => buildObject(equipment));
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

        bindToggleVisibility();

        displayableObjects.centerMap();

        if (0 === items.length) {
            displayableObjects.reset();
            container.append('<div style="margin-top:20px;margin-left:20px"><span class="label label-warning"">Aucun équipement géolocalisable trouvé</span></div>');
        }
    };

    const bindToggleVisibility = function () {
        $('.eqLogicVisible').on('change', function () {
            const objectId = $(this).data('object-id');
            const object = displayableObjects.objects[objectId];
            if ($(this).is(':checked')) {
                object.display = true;
                displayableObjects.buildMarker(object);
                displayableObjects.centerMap();
            } else {
                object.display = false;
                displayableObjects.hideObject(object);
                displayableObjects.centerMap();
            }
        });
    }

    // send ajax call to get equipments from broker and parent object
    const searchEquipments = async function (parentObjectId) {
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
    };

    const initPage = async function () {
        buildMap();
        const objectParent = $('select#parentObjectSelector');

        // build on first load
        const data = await searchEquipments(objectParent.val());
        if (data) {
            buildEqLogicContainer(data);
        }

        // build on select change
        objectParent.on('change', async function () {
            const data = await searchEquipments($(this).val());
            if (data) {
                buildEqLogicContainer(data);
            }
        });

    }

    initPage();
});
