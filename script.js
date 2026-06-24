let map = L.map('map').setView([17.414, 78.446], 6);
let searchMarker = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let hospitals = [];

fetch('care_locations.json')
  .then(r => r.json())
  .then(d => {
    hospitals = d;
    d.forEach(h => {
      L.marker([h.lat, h.lon]).addTo(map).bindPopup(`<b>${h.name}</b>`);
    });
  })
  .catch(err => console.error("Error loading JSON:", err));

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
  // Show spinner and reset views
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
        console.error(e);
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
          🚗 ${x.km.toFixed(1)} km  |  ⏱️ ${timeDisplay}
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
    console.error("Search operations error:", error);
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

window.addEventListener('DOMContentLoaded', () => {
  // Set default state layout configuration at startup
  clearViews();
});
