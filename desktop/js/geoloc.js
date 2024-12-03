$(function () {
    const buildMap = function() {
        const {defaultLatitude, defaultLongitude, defaultZoom} = defaultCordinate;

        let map = L.map('map').setView([defaultLatitude, defaultLongitude], defaultZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 1,
            maxZoom: 20,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // iterate over all checked items and add them to the map

        // geolocalisableItems.forEach(function (item) {
        //     const marker = L.marker([item.latitude, item.longitude]).addTo(map);
        //     marker.bindPopup(`<h2>${item.name}</h2>`);
        // });
    }

    const buildObject = function (jeeObject) {
        return `
<div class="eqLogicDisplayCard cursor displayAsTable" data-object="${jeeObject.id}">
    <img alt="objectIcon" class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.humanName}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <input type="checkbox" name="objectVisible" class="eqLogicVisible" checked>
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
        container.append(items);
    };

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
        buildMap();
    }


    initPage();
});
