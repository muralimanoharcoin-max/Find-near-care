// ==========================================================================
// 1. COMPREHENSIVE HOSPITAL KNOWLEDGE REGISTRY
// ==========================================================================
const hospitalDatabase = [
    { name: "CARE Mumbai Central", lat: 19.0760, lng: 72.8777, desc: "Dr. E Borges Rd, Parel", phone: "9999999991", dist: "3.5 km", time: "12 min", keywords: ["mumbai", "central", "parel", "maharashtra", "landmark borges", "village"] },
    { name: "CARE Banjara Hills", lat: 17.4138, lng: 78.4328, desc: "Road No. 1, Banjara Hills", phone: "9999999992", dist: "8.2 km", time: "52 min", keywords: ["hyderabad", "banjara hills", "road no 1", "telangana", "landmark gvk"] },
    { name: "CARE HITEC City", lat: 17.4483, lng: 78.3741, desc: "Near Cyber Towers, HITEC City", phone: "9999999993", dist: "14.0 km", time: "135 min", keywords: ["hyderabad", "hitech city", "cyber towers", "madhapur", "landmark cyber"] },
    { name: "CARE Nagpur", lat: 21.1458, lng: 79.0882, desc: "Farmland, Ramdaspeth", phone: "9999999994", dist: "5.1 km", time: "18 min", keywords: ["nagpur", "ramdaspeth", "farmland", "maharashtra", "landmark wardha"] },
    { name: "CARE Indore", lat: 22.7196, lng: 75.8577, desc: "Vijay Nagar, Scheme 54", phone: "9999999995", dist: "11.7 km", time: "84 min", keywords: ["indore", "vijay nagar", "scheme 54", "madhya pradesh", "landmark malhar"] }
];

// Extract dictionary for real-time auto-suggestions
const suggestionsDictionary = [
    { text: "Mumbai Central", type: "City Area" },
    { text: "Banjara Hills", type: "District" },
    { text: "HITEC City", type: "Tech Hub" },
    { text: "Nagpur Center", type: "City" },
    { text: "Indore Vijay Nagar", type: "Sub-Division" },
    { text: "Cyber Towers Landmark", type: "Landmark" },
    { text: "Parel Village Neighborhood", type: "Village Sector" }
];

// ==========================================================================
// 2. REAL-TIME FUZZY TYPO SEARCH ENGINE
// ==========================================================================
function LevenshteinDistance(s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) { arr[i] = [i]; }
    for (let j = 0; j <= s.length; j++) { arr[0][j] = j; }
    for (let i = 1; i <= t.length; i++) {
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] = t.charAt(i - 1) === s.charAt(j - 1) 
                ? arr[i - 1][j - 1] 
                : Math.min(arr[i - 1][j - 1] + 1, Math.min(arr[i][j - 1] + 1, arr[i - 1][j] + 1));
        }
    }
    return arr[t.length][s.length];
}

function verifyMatchToken(query, keywordsArray) {
    return keywordsArray.some(keyword => {
        if (keyword.includes(query) || query.includes(keyword)) return true;
        const words = keyword.split(' ');
        return words.some(w => LevenshteinDistance(query, w) <= 2);
    });
}

// ==========================================================================
// 3. CORE PRESENTATION RENDERING SCHEDULER
// ==========================================================================
let processingTimeout = null;

function performLiveQuery() {
    const spinner = document.getElementById('mac-spinner');
    spinner.classList.remove('hidden');
    
    if (processingTimeout) clearTimeout(processingTimeout);
    
    processingTimeout = setTimeout(() => {
        executeSearch();
        spinner.classList.add('hidden');
    }, 250);
}

function executeSearch() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('results');
    const track = document.getElementById('address-slider-track');
    
    if (!query) {
        renderDefaultPlaceholder();
        return;
    }
    
    const matches = hospitalDatabase.filter(h => 
        h.name.toLowerCase().includes(query) || 
        h.desc.toLowerCase().includes(query) ||
        verifyMatchToken(query, h.keywords)
    );
    
    resultsContainer.innerHTML = '';
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="welcome-placeholder" style="border-color: rgba(239, 68, 68, 0.3)">
                <h3 style="color: #ef4444">Zero Context Matches Located</h3>
                <p>No facilities match that spelling configuration. Try searching 'Banjara', 'Hitech' or 'Mumbai'.</p>
            </div>
        `;
        return;
    }
    
    // Lock results slice to maximum 5 items safely
    const outputSelection = matches.slice(0, 5);
    const primaryNearestName = outputSelection[0].name;
    
    outputSelection.forEach((hospital, index) => {
        const isNearest = index === 0;
        const cardElement = document.createElement('div');
        cardElement.className = `card ${isNearest ? 'nearest-card' : ''}`;
        
        const formattedTime = convertMetricDuration(hospital.time);
        
        cardElement.innerHTML = `
            <div class="card-header">
                <span>${hospital.name}</span>
                ${isNearest ? '<span class="badge">NEAREST</span>' : ''}
            </div>
            <div class="card-body">
                <p style="margin: 0 0 6px 0; color: #e2e8f0;">${hospital.desc}</p>
                <span style="font-size:0.75rem; color:#64748b;">🚗 ${hospital.dist} | ⏱️ ${formattedTime}</span>
            </div>
            <div class="card-actions">
                <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(query)}&destination=${hospital.lat},${hospital.lng}" target="_blank" class="action-btn">Route Track</a>
                <a href="https://wa.me/${hospital.phone}" target="_blank" class="action-btn wa-btn">WhatsApp</a>
            </div>
        `;
        resultsContainer.appendChild(cardElement);
    });

    // Refresh sliding dashboard configuration
    generateSlidingTrack(primaryNearestName, query);
}

function generateSlidingTrack(nearestName, currentOrigin) {
    const track = document.getElementById('address-slider-track');
    track.innerHTML = '';
    
    hospitalDatabase.forEach(hospital => {
        const checkAlert = hospital.name === nearestName;
        const originParam = currentOrigin ? encodeURIComponent(currentOrigin) : 'Current+Location';
        const directionalUrl = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${hospital.lat},${hospital.lng}`;
        
        const slide = document.createElement('div');
        slide.className = `slider-card ${checkAlert ? 'blink-pulse-alert' : ''}`;
        
        slide.innerHTML = `
            <div class="slide-title">
                <span>${hospital.name}</span>
                ${checkAlert ? '📍' : ''}
            </div>
            <p class="slide-text">${hospital.desc}</p>
            <div class="slide-foot">
                <span style="font-size:0.7rem; color:rgba(255,255,255,0.3)">Contact: ${hospital.phone}</span>
                <a href="${directionalUrl}" target="_blank" class="action-btn secondary" style="font-size:0.68rem; padding:4px 8px;">Map Directions</a>
            </div>
        `;
        track.appendChild(slide);
    });
}

function renderDefaultPlaceholder() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="welcome-placeholder">
            <h3>Find Near CARE Active Workspace</h3>
            <p>Begin typing inside the upper macOS console area. Intelligence matrices compute results natively into this partition frame.</p>
        </div>
    `;
    generateSlidingTrack(null, '');
}

// Highly responsive metric adapter converting absolute minutes into adaptive structures
function convertMetricDuration(timeString) {
    const totalMinutes = parseInt(timeString, 10);
    if (isNaN(totalMinutes)) return timeString;
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    
    const calculatedHours = Math.floor(totalMinutes / 60);
    const leftOverMinutes = totalMinutes % 60;
    
    return leftOverMinutes > 0 ? `${calculatedHours} hr ${leftOverMinutes} min` : `${calculatedHours} hr`;
}

// ==========================================================================
// 4. SMART AUTO-COMPLETION / RECOMMENDATION PANEL
// ==========================================================================
function manageSuggestionsDropdown() {
    const inputField = document.getElementById('search-input');
    const dropdown = document.getElementById('suggestions-box');
    const entry = inputField.value.trim().toLowerCase();
    
    if (!entry) {
        dropdown.classList.add('hidden');
        return;
    }
    
    const filteredSuggestions = suggestionsDictionary.filter(item => 
        item.text.toLowerCase().includes(entry) || 
        LevenshteinDistance(entry, item.text.toLowerCase().split(' ')[0]) <= 2
    );
    
    if (filteredSuggestions.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    dropdown.innerHTML = '';
    dropdown.classList.remove('hidden');
    
    filteredSuggestions.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'suggestion-item';
        itemElement.innerHTML = `
            <span>${item.text}</span>
            <span class="suggestion-type">${item.type}</span>
        `;
        
        itemElement.addEventListener('click', () => {
            inputField.value = item.text;
            dropdown.classList.add('hidden');
            executeSearch();
        });
        dropdown.appendChild(itemElement);
    });
}

// ==========================================================================
// 5. APPLICATION LIFECYCLE ROUTINES
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    renderDefaultPlaceholder();
    executeSearch(); // Perform automated entry query match
    
    const textInput = document.getElementById('search-input');
    
    // Bind Real-Time input interceptors
    textInput.addEventListener('input', () => {
        performLiveQuery();
        manageSuggestionsDropdown();
    });
    
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('suggestions-box').classList.add('hidden');
            executeSearch();
        }
    });
    
    document.getElementById('search-button').addEventListener('click', () => {
        document.getElementById('suggestions-box').classList.add('hidden');
        executeSearch();
    });

    // Click outside handler to dim open menus smoothly
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('suggestions-box').classList.add('hidden');
        }
    });
});
