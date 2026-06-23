// Initialize map using exactly your setup coordinate profile
let map = L.map('map').setView([17.414, 78.446], 6);
let searchMarker = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let hospitals = [];

// Read dynamically from your real data source
fetch('care_locations.json')
  .then(r => r.json())
  .then(d => {
    hospitals = d;
    d.forEach(h => {
      L.marker([h.lat, h.lon]).addTo(map).bindPopup(`<b>${h.name}</b>`);
    });
    // Generate initial baseline slide track at bootup
    populateStaticSlider(d);
  });

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

async function searchLocation(query) {
  // Turn on active visual processing animation
  document.getElementById('mac-spinner').classList.remove('hidden');
  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    let response = await fetch(geocodeUrl).then(x => x.json());

    if (response.length === 0) {
      alert("Location not found. Please try another search term.");
      document.getElementById('mac-spinner').classList.add('hidden');
      return;
    }

    const targetLat = parseFloat(response[0].lat);
    const targetLon = parseFloat(response[0].lon);
    const targetCoords = [targetLat, targetLon];

    map.setView(targetCoords, 11);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker(targetCoords).addTo(map).bindPopup(`<b>Your Search:</b> ${query}`).openPopup();

    let results = [];

    // Live calculations via your OSRM routing loops
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
            gmap: h.gmap
          });
        }
      } catch(e) {
        console.error("OSRM Route step skipped:", e);
      }
    }

    // Proximity logic
    results.sort((a, b) => a.min - b.min);

    let html = "";
    results.forEach((x, index) => {
      // Fixed template backtick syntax parsing bug perfectly
      const mapsUrl = x.gmap || `https://www.google.com/maps/dir/?api=1&origin=${targetLat},${targetLon}&destination=${x.lat},${x.lon}`;
      const shareText = encodeURIComponent(`Closest Hospital found! 🏥 ${x.name} is ${x.km.toFixed(1)} km away (${x.min.toFixed(0)} mins). Route: ${mapsUrl}`);
      
      const isNearest = index === 0 ? "nearest-card" : "";
      const badge = index === 0 ? `<span class="badge">⭐ NEAREST</span>` : "";

      html += `
      <div class="card ${isNearest}">
        <div class="card-header">
          <b>${x.name}</b> ${badge}
        </div>
        <div class="card-body">
          🚗 ${x.km.toFixed(1)} km &nbsp;|&nbsp; ⏱️ ${x.min.toFixed(0)} min
        </div>
        <div class="card-actions">
          <a class="action-btn" target="_blank" href="${mapsUrl}">🗺️ Navigate</a>
          <button class="action-btn secondary" onclick="copyLink('${mapsUrl}')">🔗 Copy Link</button>
          <a class="action-btn wa-btn" target="_blank" href="https://api.whatsapp.com/send?text=${shareText}">💬 WhatsApp</a>
        </div>
      </div>`;
    });

    document.getElementById("results").innerHTML = html;
    
    // Update bottom layout row to reflect sorted proximity context matches
    updateBottomSlider(results);

  } catch (error) {
    console.error("Search error:", error);
    alert("Error fetching routing details.");
  } finally {
    document.getElementById('mac-spinner').classList.add('hidden');
  }
}

function populateStaticSlider(dataList) {
    const track = document.getElementById('address-slider-track');
    track.innerHTML = '';
    dataList.forEach(h => {
        const slide = document.createElement('div');
        slide.className = 'slider-card';
        slide.innerHTML = `
            <div class="slide-title">${h.name}</div>
            <p class="slide-text">Lat: ${h.lat.toFixed(4)} | Lon: ${h.lon.toFixed(4)}</p>
            <a href="${h.gmap}" target="_blank" class="action-btn secondary" style="font-size:0.65rem; padding:4px 8px;">View Node Map</a>
        `;
        track.appendChild(slide);
    });
}

function updateBottomSlider(sortedResults) {
    const track = document.getElementById('address-slider-track');
    track.innerHTML = '';
    sortedResults.forEach((h, index) => {
        const isFirst = index === 0;
        const slide = document.createElement('div');
        slide.className = `slider-card ${isFirst ? 'nearest-card' : ''}`;
        slide.innerHTML = `
            <div class="slide-title">
               <span>${h.name}</span> ${isFirst ? '📍' : ''}
            </div>
            <p class="slide-text">🚗 ${h.km.toFixed(1)} km away (${h.min.toFixed(0)} mins)</p>
            <a href="${h.gmap}" target="_blank" class="action-btn secondary" style="font-size:0.65rem; padding:4px 8px;">Map Route</a>
        `;
        track.appendChild(slide);
    });
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert("Google Maps route link copied to clipboard!");
  }).catch(() => {
    alert("Failed to copy link automatically.");
  });
}

// Setup initial static state display layout context boundaries
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("results").innerHTML = `
        <div class="welcome-placeholder">
            <h3>Find Near CARE Active Workspace</h3>
            <p>Begin typing inside the upper input console bar. Live geolocation routing matrices compute results instantly.</p>
        </div>
    `;
});
