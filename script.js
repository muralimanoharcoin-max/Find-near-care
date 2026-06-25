// GLOBAL VARIABLE FOR ROUTING (Place at the top of script.js)
let activeRouteLayer = null; 

// Initialize Leaflet Map Engine centered on regional coords
let map = L.map('map').setView([17.414, 78.446], 6);
let searchMarker = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let hospitals = [];

// Fetch data from local configuration payload
fetch('care_locations.json')
  .then(r => r.json())
  .then(d => {
    hospitals = d;
    d.forEach(h => {
      L.marker([h.lat, h.lon]).addTo(map).bindPopup(`<b>${h.name}</b>`);
    });
  })
  .catch(err => console.error("Error loading JSON file structure:", err));

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    triggerSearch();
  }
}

function triggerSearch() {
  const query = document.getElementById("search").value;
  if (query.trim() !== "") {
    searchLocation(query);
  }
}

/**
 * Custom travel conversion utility processing hours and minutes elegantly
 */
function formatTravelTime(totalMinutes) {
  const mins = Math.round(totalMinutes);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function closeMatch(str1, str2) {
  let s1 = str1.toLowerCase().trim();
  let s2 = str2.toLowerCase().trim();
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  let matches = 0;
  for(let i=0; i<Math.min(s1.length, s2.length); i++) {
    if(s1[i] === s2[i]) matches++;
  }
  return (matches / Math.max(s1.length, s2.length)) > 0.5;
}

async function searchLocation(query) {
  // Clear lists, trigger processing loading icons
  document.getElementById('mac-spinner').classList.remove('hidden');
  document.getElementById('no-results-state').classList.add('hidden');
  document.getElementById("results").innerHTML = "";

  try {
    let cleanQuery = query.trim();
    
    const coreHubs = [""];
    for (let hub of coreHubs) {
      if (closeMatch(cleanQuery, hub)) {
        cleanQuery = hub; 
        document.getElementById("search").value = hub;
        break;
      }
    }

    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`;
    let response = await fetch(geocodeUrl).then(x => x.json());

    if (!response || response.length === 0) {
      clearViews();
      return;
    }

    const targetLat = parseFloat(response[0].lat);
    const targetLon = parseFloat(response[0].lon);
    const targetCoords = [targetLat, targetLon];

    map.setView(targetCoords, 12);
    setTimeout(() => { map.invalidateSize(); }, 200);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker(targetCoords).addTo(map).bindPopup(`<b>Search Location:</b> ${cleanQuery}`).openPopup();

    let results = [];

    // OSRM Engine Network Routing Matrix
    for (let h of hospitals) {
      const url = `https://router.project-osrm.org/route/v1/driving/${targetLon},${targetLat};${h.lon},${h.lat}?overview=false`;
      try {
        let r = await fetch(url).then(x => x.json());
        if (r.routes && r.routes.length > 0) {
          results.push({
            name: h.name,
            km: r.routes[0].distance / 1000,
            min: r.routes[0].duration / 60,
            lat: h.lat,
            lon: h.lon,
            gmap: h.gmap || h.googleMaps
          });
        }
      } catch (e) {
        console.error("Routing error instance:", e);
      }
    }

    if (results.length === 0) {
      clearViews();
      return;
    }

    // Sort outputs starting with the closest facility
    results.sort((a, b) => a.min - b.min);

    let html = "";
    results.forEach((x, index) => {
      const mapsUrl = x.gmap || `https://www.google.com/maps/dir/?api=1&origin=${targetLat},${targetLon}&destination=${x.lat},${x.lon}&travelmode=driving`;
      const timeDisplay = formatTravelTime(x.min);
      const shareText = encodeURIComponent(`Closest Hospital found! 🏥 ${x.name} is ${x.km.toFixed(1)} km away (${timeDisplay}). Route: ${mapsUrl}`);
      
      const isNearest = index === 0 ? "nearest-card" : "";
      const badge = index === 0 ? `<span class="badge">⭐ NEAREST</span>` : "";

      html += `
      <div class="card ${isNearest}">
        <div class="card-header">
          <b>${x.name}</b> ${badge}
        </div>
        <div class="card-body">
          🚗 ${x.km.toFixed(1)} km  |  ⏱️ ${timeDisplay}
        </div>
        <div class="card-actions">
          <button class="action-btn local-navigate-btn" 
                  type="button"
                  data-start-lat="${targetLat}" 
                  data-start-lng="${targetLon}" 
                  data-end-lat="${x.lat}" 
                  data-end-lng="${x.lon}">
            🗺️ Navigate
          </button>
          <button class="action-btn secondary" type="button" onclick="copyLink('${mapsUrl}')">🔗 Copy</button>
          <a class="action-btn wa-btn" target="_blank" href="https://api.whatsapp.com/send?text=${shareText}">💬 WhatsApp</a>
        </div>
      </div>`;
    });

    document.getElementById("results").innerHTML = html;

  } catch (error) {
    console.error("Global operational error:", error);
    clearViews();
  } finally {
    document.getElementById('mac-spinner').classList.add('hidden');
  }
}

/* ==========================================================================
   STATE MANAGEMENT ENGINE (WELCOME VS ERROR STATES)
   ========================================================================== */

// 1. Shows a clean system boot scan sequence on page initialization
function showWelcomeState() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('mac-spinner').classList.add('hidden');
  document.getElementById('no-results-state').classList.remove('hidden');

  const mainTelemetryText = document.querySelector('.magic-text');
  const subTelemetryText = document.querySelector('.magic-subtext');
  if (mainTelemetryText) mainTelemetryText.innerText = "SYSTEM READY";
  if (subTelemetryText) subTelemetryText.innerText = "Enter a city or area to begin automated coordinate scanning.";
}

// 2. Switches radar text over to strict warning errors if database search fails
function clearViews() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('no-results-state').classList.remove('hidden');
  document.getElementById('mac-spinner').classList.add('hidden');
  
  const mainTelemetryText = document.querySelector('.magic-text');
  const subTelemetryText = document.querySelector('.magic-subtext');
  if (mainTelemetryText) mainTelemetryText.innerText = "No Results Found";
  if (subTelemetryText) subTelemetryText.innerText = "We couldn't find any locations matching that city or area.";
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert("Navigation route link copied to clipboard!");
  }).catch(err => {
    console.error("Could not copy string text: ", err);
  });
}

// Initial boot settings call welcome state instead of strict errors
window.addEventListener('DOMContentLoaded', () => {
  showWelcomeState();
});

/* ==========================================================================
   LOCAL MAP ROUTING INTERCEPT ENGINE (OSRM INTEGRATION)
   ========================================================================== */
document.addEventListener('click', function (event) {
  if (event.target && event.target.classList.contains('local-navigate-btn')) {
    event.preventDefault();
    event.stopPropagation();

    const startLat = parseFloat(event.target.getAttribute('data-start-lat'));
    const startLng = parseFloat(event.target.getAttribute('data-start-lng'));
    const endLat = parseFloat(event.target.getAttribute('data-end-lat'));
    const endLng = parseFloat(event.target.getAttribute('data-end-lng'));

    calculateLocalRoute(startLat, startLng, endLat, endLng);
  }
});

function calculateLocalRoute(startLat, startLng, endLat, endLng) {
  if (!map) return;

  if (activeRouteLayer) {
    map.removeLayer(activeRouteLayer);
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

  fetch(osrmUrl)
    .then(response => response.json())
    .then(data => {
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const geometryCoordinates = data.routes[0].geometry.coordinates;
        const leafletRouteCoords = geometryCoordinates.map(coord => [coord[1], coord[0]]);

        activeRouteLayer = L.polyline(leafletRouteCoords, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        const fitBoundsLayout = L.latLngBounds([[startLat, startLng], [endLat, endLng]]);
        map.fitBounds(fitBoundsLayout, { padding: [50, 50] });

        setTimeout(() => { map.invalidateSize(); }, 150);
      } else {
        alert("Unable to compute driving metrics across map matrix.");
      }
    })
    .catch(error => {
      console.error("OSRM Routing Fault:", error);
    });
}
