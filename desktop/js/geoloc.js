console.log(geolocalisableItems);

const map = L.map('map').setView([48.9709, 2.3035], 15);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

geolocalisableItems.forEach(function (item) {
    const marker = L.marker([item.latitude, item.longitude]).addTo(map);
    marker.bindPopup(item.name);
});

// var marker = L.marker([48.9609, 2.3135]).addTo(map);
