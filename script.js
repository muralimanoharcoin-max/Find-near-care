// GLOBAL VARIABLE FOR ROUTING
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
    // Instantly hide suggestions dropdown out of sight on search activation
    const dropdown = document.getElementById('suggestions-dropdown');
    if (dropdown) {
      dropdown.innerHTML = "";
      dropdown.classList.add('hidden');
    }
    searchLocation(query);
  }
}

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
  document.getElementById('mac-spinner').classList.remove('hidden');
  document.getElementById('no-results-state').classList.add('hidden');
  document.getElementById("results").innerHTML = "";

  try {
    let cleanQuery = query.trim();
    
    const coreHubs = ["Hyderabad", "Visakhapatnam", "Bhubaneswar", "Indore", "Raipur", "Nagpur", "Banjara", "Hitech", "Musheerabad", "Malakpet", "Nampally"];
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

function showWelcomeState() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('mac-spinner').classList.add('hidden');
  document.getElementById('no-results-state').classList.remove('hidden');

  const mainTelemetryText = document.querySelector('.magic-text');
  const subTelemetryText = document.querySelector('.magic-subtext');
  if (mainTelemetryText) mainTelemetryText.innerText = "SYSTEM READY";
  if (subTelemetryText) subTelemetryText.innerText = "Enter a city or area to begin automated coordinate scanning.";
}

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
  if (activeRouteLayer) map.removeLayer(activeRouteLayer);

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
    .catch(error => console.error("OSRM Routing Fault:", error));
}

/* ==========================================================================
   INDIA-WIDE REALTIME SUGGESTIONS ENGINE (NOMINATIM PROGRAMMATIC NODE SETUP)
   ========================================================================== */
let suggestionTimeout = null;

function handleInputSuggestions(event) {
  const query = event.target.value.trim();
  const dropdown = document.getElementById('suggestions-dropdown');

  clearTimeout(suggestionTimeout);

  if (query.length < 3) {
    dropdown.innerHTML = "";
    dropdown.classList.add('hidden');
    return;
  }

  suggestionTimeout = setTimeout(() => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`;

    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          dropdown.innerHTML = "";
          dropdown.classList.add('hidden');
          return;
        }

        dropdown.innerHTML = ""; // Clear list cleanly to draw brand new element views

        data.forEach(item => {
          const address = item.address;
          const placeName = address.village || address.town || address.suburb || address.city || address.neighbourhood || item.display_name.split(',')[0];
          const district = address.county || address.district || "";
          const state = address.state || "";

          let cleanMeta = [district, state].filter(Boolean).join(', ');
          let fullDisplayString = placeName + (cleanMeta ? `, ${cleanMeta}` : "");

          // Programmatic DOM node instantiation ensures bulletproof element binding profiles
          const row = document.createElement('div');
          row.className = 'suggestion-item';
          row.innerHTML = `
            <strong>${placeName}</strong>
            <span class="suggestion-meta">${cleanMeta ? cleanMeta : 'India'}</span>
          `;

          // STRICT LAYER FIX: Intercept mousedown to resolve state instantly before dropdown collapses
          row.addEventListener('mousedown', function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            selectSuggestion(fullDisplayString);
          });

          dropdown.appendChild(row);
        });

        dropdown.classList.remove('hidden');
      })
      .catch(err => console.error("Suggestions retrieval error:", err));
  }, 400);
}

function selectSuggestion(value) {
  const inputElement = document.getElementById('search');
  if (inputElement) {
    inputElement.value = value;
  }
  
  const dropdown = document.getElementById('suggestions-dropdown');
  if (dropdown) {
    dropdown.innerHTML = "";
    dropdown.classList.add('hidden');
  }
  
  triggerSearch();
}

// Global click monitoring collapses panels cleanly when user taps away from inputs
document.addEventListener('mousedown', function(e) {
  const dropdown = document.getElementById('suggestions-dropdown');
  if (e.target.id !== 'search' && dropdown) {
    dropdown.classList.add('hidden');
  }
});
