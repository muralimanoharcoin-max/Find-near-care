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
  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    let response = await fetch(geocodeUrl).then(x => x.json());

    if (response.length === 0) {
      alert("Location not found. Please try another search term.");
      return;
    }

    const targetLat = parseFloat(response[0].lat);
    const targetLon = parseFloat(response[0].lon);
    const targetCoords = [targetLat, targetLon];

    map.setView(targetCoords, 11);
    
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker(targetCoords).addTo(map).bindPopup(`<b>Your Search:</b> ${query}`).openPopup();

    let results = [];

    for (let h of hospitals) {
      const url = `https://router.project-osrm.org/route/v1/driving/${targetLon},${targetLat};${h.lon},${h.lat}?overview=false`;
      let r = await fetch(url).then(x => x.json());
      if (r.routes && r.routes.length > 0) {
        results.push({
          name: h.name,
          km: r.routes[0].distance / 1000,
          min: r.routes[0].duration / 60,
          lat: h.lat,
          lon: h.lon
        });
      }
    }

    results.sort((a, b) => a.min - b.min);

    let html = "";
    results.forEach((x, index) => {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${targetLat},${targetLon}&destination=${x.lat},${x.lon}&travelmode=driving`;
      const shareText = encodeURIComponent(`Closest Hospital found! 🏥 ${x.name} is ${x.km.toFixed(1)} km away (${x.min.toFixed(0)} mins). Route: ${mapsUrl}`);
      
      const isNearest = index === 0 ? "nearest-card" : "";
      const badge = index === 0 ? `<span class="badge">⭐ NEAREST</span>` : "";

      html += `
      <div class="card ${isNearest}">
        <div class="card-header">
          <b>${x.name}</b> ${badge}
        </div>
        <div class="card-body">
          🚗 ${x.km.toFixed(1)} km &nbsp;|&nbsp; ⏱ ${x.min.toFixed(0)} min
        </div>
        <div class="card-actions">
          <a class="btn action-btn" target="_blank" href="${mapsUrl}">🗺️ Navigate</a>
          <button class="btn action-btn secondary" onclick="copyLink('${mapsUrl}')">🔗 Copy Link</button>
          <a class="btn action-btn wa-btn" target="_blank" href="https://api.whatsapp.com/send?text=${shareText}">💬 WhatsApp</a>
        </div>
      </div>`;
    });

    document.getElementById("results").innerHTML = html;

  } catch (error) {
    console.error("Search error:", error);
    alert("Error fetching routing details.");
  }
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert("Google Maps route link copied to clipboard!");
  }).catch(() => {
    alert("Failed to copy link automatically.");
  });
}