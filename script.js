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

/* ==========================================================================
   UPDATED FEATURE: DYNAMIC LONG-PRESS ON MAP TO SEARCH ENGINE
   ========================================================================== */
let pressTimer = null;

// Starts timing when user holds mouse down or touches the screen
map.on('mousedown', function(e) {
  // Clear any existing timer just in case
  clearTimeout(pressTimer);
  
  // Set a 500ms delay window for a valid long press
  pressTimer = setTimeout(function() {
    handleMapLongPress(e.latlng.lat, e.latlng.lng);
  }, 500); 
});

// Cancels the search instantly if they move the map or lift their finger early
map.on('mouseup movestart zoomstart dragstart', function() {
  clearTimeout(pressTimer);
});

// Dedicated functional block to process the long press activation
async function handleMapLongPress(clickedLat, clickedLng) {
  // Display temporary feedback metrics in search box
  document.getElementById("search").value = `${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
  document.getElementById('mac-spinner').classList.remove('hidden');

  try {
    // Reverse geocode via Nominatim API to fetch clean regional names
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}&addressdetails=1`;
    let response = await fetch(reverseUrl).then(x => x.json());
    
    if (response && response.display_name) {
      const addr = response.address;
      const placeName = addr.village || addr.town || addr.suburb || addr.city || addr.neighbourhood || response.display_name.split(',')[0];
      document.getElementById("search").value = placeName;
    }
  } catch (err) {
    console.error("Reverse geocoding execution error:", err);
  }

  // Calculate driving metrics to care centers
  searchLocationDirectCoords(clickedLat, clickedLng);
}

// Helper function to calculate distances via coordinates
async function searchLocationDirectCoords(targetLat, targetLon) {
  document.getElementById('mac-spinner').classList.remove('hidden');
  document.getElementById('no-results-state').classList.add('hidden');
  document.getElementById("results").innerHTML = "";

  const workspacePanel = document.getElementById('gis-workspace-panel');
  if (workspacePanel) workspacePanel.classList.remove('hidden');

  try {
    const currentSearchVal = document.getElementById("search").value;
    map.setView([targetLat, targetLon], 12);
    setTimeout(() => { map.invalidateSize(); }, 200);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([targetLat, targetLon]).addTo(map).bindPopup(`<b>Selected Point:</b> ${currentSearchVal}`).openPopup();

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
        console.error("Routing calculation framework failure:", e);
      }
    }

    if (results.length === 0) {
      clearViews();
      return;
    }

    renderSortedCards(results, targetLat, targetLon);

  } catch (error) {
    console.error("Coordinate routing error instance:", error);
    clearViews();
  } finally {
    document.getElementById('mac-spinner').classList.add('hidden');
  }
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    triggerSearch();
  }
}

function triggerSearch() {
  const query = document.getElementById("search").value;
  if (query.trim() !== "") {
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

async function searchLocation(query) {
  document.getElementById('mac-spinner').classList.remove('hidden');
  document.getElementById('no-results-state').classList.add('hidden');
  document.getElementById("results").innerHTML = "";

  const workspacePanel = document.getElementById('gis-workspace-panel');
  if (workspacePanel) workspacePanel.classList.remove('hidden');

  try {
    let cleanQuery = query.trim();

    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`;
    let response = await fetch(geocodeUrl).then(x => x.json());

    if (!response || response.length === 0) {
      clearViews();
      return;
    }

    const targetLat = parseFloat(response[0].lat);
    const targetLon = parseFloat(response[0].lon);

    map.setView([targetLat, targetLon], 12);
    setTimeout(() => { map.invalidateSize(); }, 200);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([targetLat, targetLon]).addTo(map).bindPopup(`<b>Search Location:</b> ${cleanQuery}`).openPopup();

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
        console.error("Routing lookup fault structural trace:", e);
      }
    }

    if (results.length === 0) {
      clearViews();
      return;
    }

    renderSortedCards(results, targetLat, targetLon);

  } catch (error) {
    console.error("Global operational logic error:", error);
    clearViews();
  } finally {
    document.getElementById('mac-spinner').classList.add('hidden');
  }
}

function renderSortedCards(results, targetLat, targetLon) {
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
}

function showWelcomeState() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('mac-spinner').classList.add('hidden');
  
  const workspacePanel = document.getElementById('gis-workspace-panel');
  if (workspacePanel) workspacePanel.classList.add('hidden');

  document.getElementById('no-results-state').classList.remove('hidden');

  const mainText = document.querySelector('.radar-title') || document.querySelector('.magic-text');
  const subText = document.querySelector('.radar-subtitle') || document.querySelector('.magic-subtext');
  
  if (mainText) mainText.innerText = "A promise of 99.9% accuracy";
  if (subText) subText.innerText = "Search with city/area name.";
}

function clearViews() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('mac-spinner').classList.add('hidden');
  
  const workspacePanel = document.getElementById('gis-workspace-panel');
  if (workspacePanel) workspacePanel.classList.add('hidden');

  document.getElementById('no-results-state').classList.remove('hidden');
  
  const mainText = document.querySelector('.radar-title') || document.querySelector('.magic-text');
  const subText = document.querySelector('.radar-subtitle') || document.querySelector('.magic-subtext');
  
  if (mainText) mainText.innerText = "Sorry Try again";
  if (subText) subText.innerText = "Check the spelling/choose from suggestions.";
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
   INDIA-WIDE REALTIME SUGGESTIONS ENGINE (DEBOUNCE SPEED: 150MS)
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

        dropdown.innerHTML = ""; 

        data.forEach(item => {
          const address = item.address;
          const placeName = address.village || address.town || address.suburb || address.city || address.neighbourhood || item.display_name.split(',')[0];
          const district = address.county || address.district || "";
          const state = address.state || "";

          let cleanMeta = [district, state].filter(Boolean).join(', ');
          let fullDisplayString = placeName + (cleanMeta ? `, ${cleanMeta}` : "");

          const row = document.createElement('div');
          row.className = 'suggestion-item';
          row.innerHTML = `
            <strong>${placeName}</strong>
            <span class="suggestion-meta">${cleanMeta ? cleanMeta : 'India'}</span>
          `;

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
  }, 150); 
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

document.addEventListener('mousedown', function(e) {
  const dropdown = document.getElementById('suggestions-dropdown');
  if (e.target.id !== 'search' && dropdown) {
    dropdown.classList.add('hidden');
  }
});
