let map = L.map('map').setView([20,78],5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

let hospitals=[];

fetch('care_locations.json')
.then(r=>r.json())
.then(d=>{
hospitals=d;
d.forEach(h=>{
L.marker([h.lat,h.lon]).addTo(map).bindPopup(h.name);
});
});

function getLocation(){
navigator.geolocation.getCurrentPosition(async pos=>{
const user=[pos.coords.latitude,pos.coords.longitude];
map.setView(user,10);

L.marker(user).addTo(map).bindPopup("You");

let results=[];

for(let h of hospitals){
const url=`https://router.project-osrm.org/route/v1/driving/${user[1]},${user[0]};${h.lon},${h.lat}?overview=false`;
let r=await fetch(url).then(x=>x.json());
if(r.routes){
results.push({
name:h.name,
km:r.routes[0].distance/1000,
min:r.routes[0].duration/60,
lat:h.lat,
lon:h.lon
});
}
}

results.sort((a,b)=>a.min-b.min);

let html="";
results.forEach(x=>{
html+=`
<div class="card">
<b>${x.name}</b><br>
🚗 ${x.km.toFixed(1)} km<br>
⏱ ${x.min.toFixed(0)} min<br>
<a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}">
Navigate
</a>
</div>`;
});

document.getElementById("results").innerHTML=html;

});
}
