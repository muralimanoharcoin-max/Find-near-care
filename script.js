// ==========================================================================
// 1. DATABASE REGISTRY INITIALIZATION (Mock Coordinates Engine)
// ==========================================================================
const hospitalDatabase = [
    { name: "CARE Mumbai Central", lat: 19.0760, lng: 72.8777, desc: "Dr. E Borges Rd, Parel", phone: "9999999991", dist: "3.5 km", time: "12 min" },
    { name: "CARE Banjara Hills", lat: 17.4138, lng: 78.4328, desc: "Road No. 1, Banjara Hills", phone: "9999999992", dist: "8.2 km", time: "22 min" },
    { name: "CARE HITEC City", lat: 17.4483, lng: 78.3741, desc: "Near Cyber Towers, HITEC City", phone: "9999999993", dist: "14.0 km", time: "35 min" },
    { name: "CARE Nagpur", lat: 21.1458, lng: 79.0882, desc: "Farmland, Ramdaspeth", phone: "9999999994", dist: "5.1 km", time: "15 min" },
    { name: "CARE Indore", lat: 22.7196, lng: 75.8577, desc: "Vijay Nagar, Scheme 54", phone: "9999999995", dist: "11.7 km", time: "28 min" }
];

let map;
let markerGroup;

// ==========================================================================
// 2. CORE MAP RENDERING ENGINE
// ==========================================================================
function initMap() {
    // Falls back safely to broad India view map center coordinates on initialization
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([20.5937, 78.9629], 5);

    // Apply smooth dark-mode dashboard map tiles vector mapping graphics
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    // FIX: Core sizing engine. Overrides internal leaflet caching boundaries
    setTimeout(() => {
        map.invalidateSize();
    }, 400);
}

// ==========================================================================
// 3. SPATIAL INTERACTIVE SELECTION (Bottom Ribbon Card Hooks)
// ==========================================================================
function focusLocation(lat, lng, hospitalName) {
    if (!map) return;
    
    // Clear dynamic search markers on manual bottom deck element click events
    markerGroup.clearLayers();
    
    map.setView([lat, lng], 14);
    
    const marker = L.marker([lat, lng]).addTo(markerGroup);
    marker.bindPopup(`<b>${hospitalName}</b>`).openPopup();
    
    // Auto-populate corresponding text card context instantly inside left column
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="card nearest-card">
            <div class="card-header">
                <span>${hospitalName}</span>
                <span class="badge">SELECTED</span>
            </div>
            <div class="card-body">
                Location loaded directly via manual deck execution ribbon routing.<br><br>
                <strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </div>
            <div class="card-actions">
                <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" class="action-btn">Navigate</a>
                <button class="action-btn secondary" onclick="navigator.clipboard.writeText('${lat}, ${lng}')">Copy</button>
            </div>
        </div>
    `;
    
    map.invalidateSize();
}

// ==========================================================================
// 4. ACTION BAR INPUT QUERY EVALUATION ENGINE
// ==========================================================================
function executeSearch() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('results');
    
    if (!query) return;
    
    // Filter rows mapping sub-string data matches inside local database arrays
    const matches = hospitalDatabase.filter(h => 
        h.name.toLowerCase().includes(query) || 
        h.desc.toLowerCase().includes(query)
    );
    
    markerGroup.clearLayers();
    resultsContainer.innerHTML = '';
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="welcome-placeholder" style="border-color: rgba(239, 68, 68, 0.4)">
                <h3 style="color: #ef4444">No Records Discovered</h3>
                <p>No CARE hospital centers match your input filter context. Try searching 'Banjara', 'Mumbai' or 'Nagpur'.</p>
            </div>
        `;
        return;
    }
    
    const bounds = [];
    
    // Build out DOM dynamic items inside scrolling layout container viewports
    matches.forEach((hospital, index) => {
        const isNearest = index === 0;
        const cardElement = document.createElement('div');
        cardElement.className = `card ${isNearest ? 'nearest-card' : ''}`;
        
        cardElement.innerHTML = `
            <div class="card-header">
                <span>${hospital.name}</span>
                ${isNearest ? '<span class="badge">NEAREST</span>' : ''}
            </div>
            <div class="card-body">
                <p style="margin: 0 0 6px 0; color: #e2e8f0;">${hospital.desc}</p>
                <span style="font-size:0.75rem;">🚗 ${hospital.dist} | ⏱️ ${hospital.time}</span>
            </div>
            <div class="card-actions">
                <a href="https://maps.google.com/?q=${hospital.lat},${hospital.lng}" target="_blank" class="action-btn">Navigate</a>
                <button class="action-btn secondary" onclick="navigator.clipboard.writeText('${hospital.lat}, ${hospital.lng}')">Copy</button>
                <a href="https://wa.me/${hospital.phone}" target="_blank" class="action-btn wa-btn">WhatsApp</a>
            </div>
        `;
        
        resultsContainer.appendChild(cardElement);
        
        // Pin interactive marker map instances 
        const marker = L.marker([hospital.lat, hospital.lng]).addTo(markerGroup);
        marker.bindPopup(`<b>${hospital.name}</b><br>${hospital.desc}`);
        bounds.push([hospital.lat, hospital.lng]);
    });
    
    // Adjust map viewport bounding constraints to show all discovered locations
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
    }
    
    // Force Leaflet layer validation cycle to lock structural rendering sizing metrics
    map.invalidateSize();
}

// ==========================================================================
// 5. WINDOW LIFECYCLE LISTENERS
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('search-button').addEventListener('click', executeSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeSearch();
    });
});

// Recalculates map rendering elements during screen window reshape movements
window.addEventListener('resize', () => {
    if (map) {
        map.invalidateSize();
    }
});
