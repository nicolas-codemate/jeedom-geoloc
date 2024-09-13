$(function () {
    const {defaultLatitude, defaultLongitude, defaultZoom} = defaultCordinate;

    let map = L.map('map').setView([defaultLatitude, defaultLongitude], defaultZoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    geolocalisableItems.forEach(function (item) {
        const marker = L.marker([item.latitude, item.longitude]).addTo(map);
        marker.bindPopup(item.name);
    });
});
