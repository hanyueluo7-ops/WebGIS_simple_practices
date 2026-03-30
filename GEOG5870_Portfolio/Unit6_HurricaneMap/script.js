let map;
let tweetData = [];
let hotspots = [];
let markerClusterGroup = null;
let heatLayer = null;
let allMarkers = [];

function initialize() {
	map = L.map('mapdiv').setView([40.7, -74.0], 10);

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; OpenStreetMap contributors'
	}).addTo(map);

	markerClusterGroup = L.markerClusterGroup();
	map.addLayer(markerClusterGroup);

	showWelcomeMessage();
}

function showWelcomeMessage() {
	const welcomeDiv = L.DomUtil.create('div', 'welcome-message');
	welcomeDiv.innerHTML = `<h2>Welcome to Hurricane Mapper</h2><p>Click <strong>Fetch Data</strong> to load hurricane-related tweets</p>`;
	document.querySelector('.map-container').appendChild(welcomeDiv);
}

function fetchData() {
	const welcomeMsg = document.querySelector('.welcome-message');
	if (welcomeMsg) welcomeMsg.remove();

	clearMap();
	tweetData = [];
	allMarkers = [];

	$.getJSON("fetchData_3.php", function(data) {
		if (data.tweets && data.tweets.length > 0) tweetData = data.tweets;
		if (data.hotspots) hotspots = data.hotspots;
		if (data.summary) updateStatistics(data.summary);

		let vizType = document.getElementById('vizType').value;
		if (vizType === 'heatmap') {
			plotHeatmap();
		} else if (vizType === 'cluster') {
			plotClusters();
		} else {
			plotTweets();
		}

		displayHotspots();
	}).fail(function() {
		alert("Data loading failed, please check database connection");
	});
}

function updateStatistics(summary) {
	document.getElementById('totalTweets').textContent = summary.total_tweets || 0;
	document.getElementById('areaCount').textContent = summary.area_count || 0;
	document.getElementById('hotspotCount').textContent = hotspots ? hotspots.length : 0;
}

function plotTweets() {
	clearMap();

	const twitterIcon = L.divIcon({
		html: `<div style="background-color: #0d47a1; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2); font-weight: bold; color: white; font-size: 10px;">T</div>`,
		iconSize: [18, 18],
		iconAnchor: [9, 18],
		popupAnchor: [0, -18],
		className: 'twitter-marker'
	});

	tweetData.forEach(t => {
		let marker = new L.Marker(new L.LatLng(t.lat, t.lon), {icon: twitterIcon})
			.bindPopup(`<div class="popup-content"><strong>Tweet</strong><br>${t.body}</div>`)
			.addTo(map);
		allMarkers.push(marker);
	});

	hotspots.forEach(h => {
		let hotspotIcon = L.divIcon({
			html: `<div style="background-color: #0d47a1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(13,71,161,0.5); font-weight: bold; color: white; border: 1.5px solid #fff; font-size: 11px;">${h.count}</div>`,
			iconSize: [24, 24],
			iconAnchor: [12, 24],
			popupAnchor: [0, -24],
			className: 'hotspot-marker'
		});
		let marker = new L.Marker(new L.LatLng(h.lat, h.lon), {icon: hotspotIcon})
			.bindPopup(`<div class="popup-content"><strong>Hotspot Area</strong><br>Tweet Count: ${h.count}<br>Location: (${h.lat.toFixed(2)}, ${h.lon.toFixed(2)})</div>`)
			.addTo(map);
		allMarkers.push(marker);
	});

	if (allMarkers.length > 0) {
		let group = new L.featureGroup(allMarkers);
		map.fitBounds(group.getBounds(), {padding: [50, 50]});
	}
}

function plotHeatmap() {
	clearMap();

	let heatData = tweetData.map(d => [d.lat, d.lon, 1]);
	heatLayer = L.heatLayer(heatData, {
		radius: 35,
		blur: 25,
		maxZoom: 15,
		minOpacity: 0.2,
		max: 50,
		gradient: {
			0.0: '#0d47a1',
			0.15: '#1565c0',
			0.3: '#1976d2',
			0.45: '#0288d1',
			0.6: '#00bcd4',
			0.75: '#4dd0e1',
			0.9: '#80deea',
			1.0: '#b3e5fc'
		}
	}).addTo(map);

	if (heatData.length > 0) {
		let bounds = L.featureGroup(heatData.map(d => L.marker([d[0], d[1]]))).getBounds();
		map.fitBounds(bounds, {padding: [50, 50]});
	}
}

function plotClusters() {
	clearMap();
	markerClusterGroup.clearLayers();

	tweetData.forEach(t => {
		let marker = new L.Marker(new L.LatLng(t.lat, t.lon), {
			icon: L.divIcon({
				html: `<div style="background-color: #0d47a1; border-radius: 50%; width: 8px; height: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
				iconSize: [8, 8],
				iconAnchor: [4, 4],
				popupAnchor: [0, -4]
			})
		}).bindPopup(t.body);
		markerClusterGroup.addLayer(marker);
	});

	hotspots.forEach(h => {
		let marker = new L.Marker(new L.LatLng(h.lat, h.lon), {
			icon: L.divIcon({
				html: `<div style="background-color: #1976d2; border-radius: 50%; width: 10px; height: 10px; box-shadow: 0 1px 4px rgba(13,71,161,0.5);"></div>`,
				iconSize: [10, 10],
				iconAnchor: [5, 5],
				popupAnchor: [0, -5]
			})
		}).bindPopup(`Hotspot: ${h.count} tweets`);
		markerClusterGroup.addLayer(marker);
	});

	if (tweetData.length > 0) {
		let group = new L.featureGroup(markerClusterGroup.getLayers());
		if (group.getLayers().length > 0) {
			map.fitBounds(group.getBounds(), {padding: [50, 50]});
		}
	}
}

function switchVisualization() {
	clearMap();
	let vizType = document.getElementById('vizType').value;
	if (vizType === 'heatmap') {
		plotHeatmap();
	} else if (vizType === 'cluster') {
		plotClusters();
	} else {
		plotTweets();
	}
}

function displayHotspots() {
	const hotspotList = document.getElementById('hotspotList');
	hotspotList.innerHTML = '';

	if (!hotspots || hotspots.length === 0) {
		hotspotList.innerHTML = '<p class="placeholder">No Hotspot Data Available</p>';
		return;
	}

	for (let i = 0; i < Math.min(5, hotspots.length); i++) {
		const hotspot = hotspots[i];
		const item = document.createElement('div');
		item.className = 'hotspot-item';
		item.innerHTML = `
			<div class="hotspot-rank">#${i + 1}</div>
			<div class="hotspot-info">
				<div class="hotspot-location">Location: (${hotspot.lat.toFixed(2)}°, ${hotspot.lon.toFixed(2)}°)</div>
				<div class="hotspot-count">Tweets: ${hotspot.count}</div>
			</div>
		`;
		item.onclick = function() {
			clearMap();
			map.setView([hotspot.lat, hotspot.lon], 12);

			const nearbyRadius = 0.5;
			let nearbyMarkers = tweetData.filter(t => {
				let d = Math.sqrt(Math.pow(t.lat - hotspot.lat, 2) + Math.pow(t.lon - hotspot.lon, 2));
				return d < nearbyRadius;
			});

			const twitterIcon = L.divIcon({
				html: `<div style="background-color: #1976d2; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(25,118,210,0.8); font-weight: bold; color: white; font-size: 9px; border: 2px solid #fff;">T</div>`,
				iconSize: [20, 20],
				iconAnchor: [10, 20],
				popupAnchor: [0, -20]
			});

			nearbyMarkers.forEach(t => {
				let marker = new L.Marker(new L.LatLng(t.lat, t.lon), {icon: twitterIcon})
					.bindPopup(t.body)
					.addTo(map);
				allMarkers.push(marker);
			});

			let hotspotIcon = L.divIcon({
				html: `<div style="background-color: #0d47a1; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(13,71,161,0.8); font-weight: bold; color: white; border: 2px solid #fff; font-size: 14px;">${hotspot.count}</div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 32],
				popupAnchor: [0, -32]
			});

			let centerMarker = new L.Marker(
				new L.LatLng(hotspot.lat, hotspot.lon),
				{icon: hotspotIcon}
			).bindPopup(`<strong>Hotspot Center</strong><br>Tweets: ${hotspot.count}`);
			allMarkers.push(centerMarker);
			centerMarker.addTo(map);
		};
		hotspotList.appendChild(item);
	}
}

function clearData() {
	clearMap();
	tweetData = [];
	hotspots = [];
	allMarkers = [];
	document.getElementById('totalTweets').textContent = '0';
	document.getElementById('areaCount').textContent = '0';
	document.getElementById('hotspotCount').textContent = '0';
	document.getElementById('hotspotList').innerHTML = '<p class="placeholder">No Data Available</p>';
}

function clearMap() {
	if (heatLayer) {
		map.removeLayer(heatLayer);
		heatLayer = null;
	}
	allMarkers.forEach(m => map.removeLayer(m));
	allMarkers = [];
	if (markerClusterGroup) markerClusterGroup.clearLayers();
}