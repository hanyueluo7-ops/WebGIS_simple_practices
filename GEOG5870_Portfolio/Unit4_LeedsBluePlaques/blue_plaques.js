let map;
let allMarkers = [];
let markerClusterGroup = L.markerClusterGroup();
let currentFilters = { searchText: '', yearFrom: null, yearTo: null };
let selectedMarker = null;
let plaqueIcon, plaqueIconSelected;

function clearSelection() {
    if (!selectedMarker) return;
    if (selectedMarker.closePopup) selectedMarker.closePopup();
    if (selectedMarker.popup) map.closePopup(selectedMarker.popup);
    if (selectedMarker.listItem) selectedMarker.listItem.classList.remove('selected');
    selectedMarker.setIcon(plaqueIcon);
    selectedMarker = null;
}

function selectMarker(marker) {
    clearSelection();
    selectedMarker = marker;

    if (marker.listItem) {
        marker.listItem.classList.add('selected');
        marker.listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    marker.setIcon(plaqueIconSelected);

    if (marker.markerLocation) {
        map.closePopup();
        markerClusterGroup.zoomToShowLayer(marker, function() {
            L.popup()
                .setLatLng(marker.markerLocation)
                .setContent(marker.popupContent)
                .openOn(map);
        });
    }
}

function initialize() {
    map = L.map('mapdiv', { closePopupOnClick: false });
    map.setView([53.802659, -1.548291], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    map.addLayer(markerClusterGroup);

    plaqueIcon = L.icon({
        iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><defs><linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23004fa3;stop-opacity:1"/><stop offset="100%" style="stop-color:%23001a4d;stop-opacity:1"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/></filter></defs><circle cx="25" cy="22" r="20" fill="url(%23blueGrad)" filter="url(%23shadow)"/><circle cx="25" cy="22" r="20" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/><g transform="translate(25, 22)"><path d="M -6 -8 L -10 0 L -6 8 L 6 8 L 10 0 L 6 -8 Z" fill="white" opacity="0.9"/><circle cx="0" cy="2" r="2" fill="white" opacity="0.8"/></g><circle cx="25" cy="45" r="4" fill="white" opacity="0.7"/></svg>',
        iconSize: [50, 50],
        iconAnchor: [25, 45],
        popupAnchor: [350, 10],
        className: 'plaque-icon'
    });

    plaqueIconSelected = L.icon({
        iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><defs><linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23FFD700;stop-opacity:1"/><stop offset="100%" style="stop-color:%23FFA500;stop-opacity:1"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/></filter></defs><circle cx="25" cy="22" r="20" fill="url(%23yellowGrad)" filter="url(%23shadow)"/><circle cx="25" cy="22" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.8"/><g transform="translate(25, 22)"><path d="M -6 -8 L -10 0 L -6 8 L 6 8 L 10 0 L 6 -8 Z" fill="white" opacity="0.95"/><circle cx="0" cy="2" r="2" fill="white" opacity="0.9"/></g><circle cx="25" cy="45" r="4" fill="white" opacity="0.8"/></svg>',
        iconSize: [50, 50],
        iconAnchor: [25, 45],
        popupAnchor: [350, 10],
        className: 'plaque-icon-selected'
    });

    let markerCount = 0;

    for (let id in os_markers) {
        let data = os_markers[id];

        if (data.easting === 0 || data.northing === 0) {
            continue;
        }

        let popupContent = `<div class='plaque-popup'>
            <h3>${data.title}</h3>
            <p><strong>Location:</strong><br>${data.location}</p>
            <p><strong>Installed:</strong><br>${data.date}</p>
            ${data.caption ? `<p><strong>Description:</strong><br>${data.caption}</p>` : ''}
            <p><em>Unveiled by: ${data.unveiler}</em></p>
        </div>`;

        try {
            let osPt = new OSRef(data.easting, data.northing);
            let llPt = osPt.toLatLng(osPt);
            llPt.OSGB36ToWGS84();

            let markerLocation = new L.LatLng(llPt.lat, llPt.lng);
            let marker = new L.Marker(markerLocation, { icon: plaqueIcon }).bindPopup(popupContent);

            marker.plaqueData = data;
            marker.markerLocation = markerLocation;
            marker.popupContent = popupContent;

            marker.on('click', function(e) {
                L.DomEvent.stopPropagation(e);
                selectMarker(marker);
            });

            markerClusterGroup.addLayer(marker);
            allMarkers.push(marker);
            markerCount++;
        } catch (error) {
            console.error('Coordinate conversion error:', data.title, error);
        }
    }

    document.getElementById('plaque-count').innerHTML = 'Showing <strong>' + markerCount + '</strong> plaques';
    buildPlaquesList(allMarkers);
    setupEventListeners();
}

function buildPlaquesList(markers) {
    let listContainer = document.getElementById('plaques-list');
    listContainer.innerHTML = '';

    markers.forEach(marker => {
        let item = document.createElement('div');
        item.className = 'plaque-list-item';
        item.innerHTML = `<strong>${marker.plaqueData.title}</strong><br><small>${marker.plaqueData.date}</small>`;
        marker.listItem = item;
        item.addEventListener('click', () => selectMarker(marker));
        listContainer.appendChild(item);
    });
}

function setupEventListeners() {
    document.getElementById('search-box').addEventListener('keyup', function(e) {
        currentFilters.searchText = e.target.value.toLowerCase();
        applyFilters();
    });

    document.getElementById('filter-btn').addEventListener('click', function() {
        let input = document.getElementById('year-filter').value.trim();

        if (input === '') {
            currentFilters.yearFrom = null;
            currentFilters.yearTo = null;
        } else if (input.includes('-')) {
            let [from, to] = input.split('-');
            currentFilters.yearFrom = from.trim() ? parseInt(from.trim()) : null;
            currentFilters.yearTo = to.trim() ? parseInt(to.trim()) : null;
        } else {
            let year = parseInt(input);
            currentFilters.yearFrom = !isNaN(year) ? year : null;
            currentFilters.yearTo = !isNaN(year) ? year : null;
        }

        applyFilters();
    });

    document.getElementById('clear-filter-btn').addEventListener('click', function() {
        clearSelection();
        currentFilters = { searchText: '', yearFrom: null, yearTo: null };
        document.getElementById('search-box').value = '';
        document.getElementById('year-filter').value = '';
        applyFilters();
    });
}

function applyFilters() {
    clearSelection();
    map.closePopup();
    markerClusterGroup.clearLayers();

    let filteredMarkers = allMarkers.filter(marker => shouldShowMarker(marker));
    filteredMarkers.forEach(marker => markerClusterGroup.addLayer(marker));

    buildPlaquesList(filteredMarkers);
    document.getElementById('plaque-count').innerHTML = `Showing <strong>${filteredMarkers.length}</strong> plaques`;
}

function shouldShowMarker(marker) {
    let data = marker.plaqueData;

    if (currentFilters.searchText) {
        let searchable = [data.title, data.location, data.caption || ''].join(' ').toLowerCase();
        if (!searchable.includes(currentFilters.searchText)) return false;
    }

    if (currentFilters.yearFrom || currentFilters.yearTo) {
        let year = extractYear(data.date);
        if (currentFilters.yearFrom && year < currentFilters.yearFrom) return false;
        if (currentFilters.yearTo && year > currentFilters.yearTo) return false;
    }

    return true;
}

function extractYear(dateString) {
    let match = dateString.match(/\d{4}/);
    return match ? parseInt(match[0]) : new Date().getFullYear();
}
