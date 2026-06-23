let hospitals = [];

fetch('care_locations.json')
  .then(r => r.json())
  .then(d => {
    hospitals = d;
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

  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    let response = await fetch(geocodeUrl).then(x => x.json());

    if (response.length === 0) {
      clearViews();
      return;
    }

    const targetLat = parseFloat(response[0].lat);
    const targetLon = parseFloat(response[0].lon);
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
            gmap: h.gmap
          });
        }
      } catch(e) {
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
      const mapsUrl = x.gmap || `https://www.google.com/maps/dir/?api=1&origin=${targetLat},${targetLon}&destination=${x.lat},${x.lon}`;
      const timeDisplay = formatTravelTime(x.min);
      const shareText = encodeURIComponent(`🏥 ${x.name} is ${x.km.toFixed(1)} km away (${timeDisplay}).`);
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
    updateBottomSlider(results);

  } catch (error) {
    clearViews();
  } finally {
    document.getElementById('mac-spinner').classList.add('hidden');
  }
}

function clearViews() {
  document.getElementById("results").innerHTML = "";
  document.getElementById('address-slider-track').innerHTML = "";
  document.getElementById('no-results-state').classList.remove('hidden');
  document.getElementById('mac-spinner').classList.add('hidden');
}

function populateStaticSlider(dataList) {
    const track = document.getElementById('address-slider-track');
    track.innerHTML = '';
    dataList.forEach(h => {
        const slide = document.createElement('div');
        slide.className = 'slider-card';
        slide.innerHTML = `<div class="slide-title">${h.name}</div><p class="slide-text">Node Connected</p>`;
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
            <div class="slide-title">${h.name} ${isFirst ? '📍' : ''}</div>
            <p class="slide-text">🚗 ${h.km.toFixed(1)} km (${formatTravelTime(h.min)})</p>
        `;
        track.appendChild(slide);
    });
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("results").innerHTML = `
        <div class="welcome-placeholder">
            <h3>Find Near CARE Dashboard</h3>
            <p>Enter an area to compute live driving routes instantly.</p>
        </div>
    `;
});
