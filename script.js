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
  const query = document.getElementById('search').value.trim();
  const spinner = document.getElementById('mac-spinner');
  const resultsContainer = document.getElementById('results');
  const emptyState = document.getElementById('no-results-state');

  if (!query) return;

  // Show spinner
  if (spinner) spinner.classList.remove('hidden');

  /* ========================================================
     1. RESET VIEW STATES: Hide empty panel & clear old cards
     ======================================================== */
  if (emptyState) emptyState.classList.add('hidden');
  if (resultsContainer) resultsContainer.innerHTML = '';

  // Simulate/Perform hospital filtering logic
  setTimeout(() => {
    if (spinner) spinner.classList.add('hidden');

    // Example filtering check (Make sure your array variable matches your exact data array name)
    const matched = hospitalData.filter(h => 
      h.name.toLowerCase().includes(query.toLowerCase()) || 
      h.address.toLowerCase().includes(query.toLowerCase())
    );

    if (matched.length === 0) {
      /* ========================================================
         2. SHOW EMPTY STATE IF NO MATCHES
         ======================================================== */
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      /* ========================================================
         3. RENDER MATCHED RESULTS CARDS
         ======================================================== */
      if (emptyState) emptyState.classList.add('hidden'); // Guarantee it stays hidden
      
      matched.forEach(hospital => {
        // Your existing card creation template logic goes here
        resultsContainer.innerHTML += `
          <div class="card">
            <div class="card-header">${hospital.name}</div>
            <div class="card-body">${hospital.address}</div>
          </div>
        `;
      });
    }
  }, 400); 
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
          🚗 ${x.km.toFixed(1)} km &nbsp;|&nbsp; ⏱️ ${timeDisplay}
        </div>
        <div class="card-actions">
          <a class="action-btn" target="_blank" href="${mapsUrl}">🗺️ Navigate</a>
          <button class="action-btn secondary" onclick="copyLink('${mapsUrl}')">🔗 Copy</button>
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

function clearViews() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('no-results-state').classList.remove('hidden');
  document.getElementById('mac-spinner').classList.add('hidden');
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert("Navigation route link copied to clipboard!");
  }).catch(err => {
    console.error("Could not copy string text: ", err);
  });
}

// Initial boot settings
window.addEventListener('DOMContentLoaded', () => {
  clearViews();
});
