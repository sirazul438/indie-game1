const $ = (s) => document.querySelector(s);
const player = $('#player');
const world = $('#world');
const toast = $('#toast');
const dialogue = $('#dialogue');
const panel = $('#panel');

const defaultState = {
  x: 27, y: 45, coins: 250, level: 1, xp: 28, hour: 8, minute: 0,
  inventory: { Rice: 2, Potato: 4, "Green Chili": 3, Fish: 0, Egg: 2, Mango: 1, Bamboo: 8, Wood: 8 },
  tasks: { water:false, fish:false, talk:false },
  buildings: {
    house: { level: 1 },
    coop: { built: false, level: 0 },
    pondDock: { built: false, level: 0 },
    garden: { level: 1 },
    bridge: { built: false, level: 0 },
    well: { built: false, level: 0 }
  },
  saved:false
};
const state = structuredClone(defaultState);
let moving = {up:false,down:false,left:false,right:false};
let dialogueQueue = [];
let lastAction = 0;
let fishing = null;

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function ensureState(){
  state.inventory = {...defaultState.inventory,...(state.inventory||{})};
  state.tasks = {...defaultState.tasks,...(state.tasks||{})};
  state.buildings = {...defaultState.buildings,...(state.buildings||{})};
  for(const k of Object.keys(defaultState.buildings)) state.buildings[k] = {...defaultState.buildings[k],...(state.buildings[k]||{})};
}
function updateUI(){
  player.style.left = state.x+'%'; player.style.top = state.y+'%';
  $('#coins').textContent=state.coins; $('#level').textContent=state.level; $('#xpFill').style.width=state.xp+'%';
  const h = Math.floor(state.hour)%24, m=String(state.minute).padStart(2,'0');
  const suffix=h>=12?'PM':'AM', hh=(h%12)||12; $('#time').textContent=`${String(hh).padStart(2,'0')}:${m} ${suffix}`;
  $('#taskWater').innerHTML=`Water the crops <b>${state.tasks.water?1:0}/1</b>`;
  $('#taskFish').innerHTML=`Catch a fish <b>${state.tasks.fish?1:0}/1</b>`;
  $('#taskTalk').innerHTML=`Talk to Mitu <b>${state.tasks.talk?1:0}/1</b>`;
  $('#mainQuest').innerHTML=state.tasks.water? 'The garden is happy! Visit the market <span>✓</span>':'Help Grandma water the garden <span>(0/1)</span>';
  renderBuildings();
}
function save(){localStorage.setItem('nodirPareSave',JSON.stringify(state)); state.saved=true; showToast('Game saved ✓');}
function load(){const raw=localStorage.getItem('nodirPareSave'); if(raw){try{Object.assign(state,JSON.parse(raw));}catch(e){console.warn('Save data invalid',e)}} ensureState();}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1900);}
function gainXP(n){state.xp+=n;while(state.xp>=100){state.xp-=100;state.level++;showToast(`Level up! You are now Lv. ${state.level} ✨`)}updateUI();}
function advanceTime(mins=5){state.minute+=mins;while(state.minute>=60){state.minute-=60;state.hour++;}if(state.hour>=24)state.hour=6;updateUI();}
function move(dx,dy){
  const speed=.55;
  state.x=clamp(state.x+dx*speed,3,97); state.y=clamp(state.y+dy*speed,6,94);
  updateUI();checkLocation();
}
function distanceTo(x,y){return Math.hypot(state.x-x,state.y-y)}
function checkLocation(){
 const points=[['Home',24,40],['Market',45,39],['Tea Stall',58,42],['Fishing Spot',58,18],['Vegetable Garden',77,72],['Pond',19,64],['Cowshed',84,55],['Forest',43,10],['Build Yard',34,72]];
 let near=null,best=99; for(const [name,x,y] of points){const d=distanceTo(x,y);if(d<best){best=d;near=name}}
 if(best<7){$('#interactHint').textContent=`Press E / Interact at ${near}`;$('#interactHint').style.opacity=1;world.dataset.near=near}else{$('#interactHint').style.opacity=0;delete world.dataset.near}
}
function interact(){
 if(fishing)return;
 const near=world.dataset.near;
 if(near==='Home') openHome();
 else if(near==='Vegetable Garden'){state.tasks.water=true;state.coins+=20;gainXP(20);advanceTime(10);showToast('Garden watered! +20 coins 🌱');}
 else if(near==='Fishing Spot' || near==='Pond'){startFishing();}
 else if(near==='Market'){openMarket();}
 else if(near==='Tea Stall'){talk('Babul','☕',['Tea time! The whole village comes here after sunset.','Mitu was asking about you earlier.']);}
 else if(near==='Cowshed'){openBuildingPanel('Cowshed','coop');}
 else if(near==='Forest'){gatherWood();}
 else if(near==='Build Yard'){openBuildPanel();}
 else showToast('Nothing to interact with here.');
 updateUI();
}
function openHome(){
 const lvl=state.buildings.house.level;
 const nextCost=houseUpgradeCost(lvl);
 openPanel('🏡 Your Home',`<p><b>House Level ${lvl}</b></p><p>Upgrade your family home and unlock more storage and comfort.</p><ul><li>Level 1: Small village home</li><li>Level 2: Bigger veranda + kitchen</li><li>Level 3: Guest room + attic</li><li>Level 4: Riverside homestead</li></ul>${lvl<4?`<button class="primary-btn" onclick="upgradeHouse()">Upgrade to Lv. ${lvl+1} — ${nextCost} 🪙</button>`:'<p class="success">✨ Your home is fully restored!</p>'}`);
}
function houseUpgradeCost(lvl){return [0,250,500,900][lvl]||1200}
function upgradeHouse(){const lvl=state.buildings.house.level,cost=houseUpgradeCost(lvl);if(lvl>=4)return;if(state.coins<cost){showToast('Not enough coins 🪙');return}state.coins-=cost;state.buildings.house.level++;gainXP(40);advanceTime(30);save();openHome();showToast(`Home upgraded to Level ${lvl+1}! 🏡✨`)}
window.upgradeHouse=upgradeHouse;
function openMarket(){
 openPanel('🏪 Village Market',`<p>Sell your harvest and buy supplies.</p><div class="shop-grid"><button onclick="sellFish()">🐟 Sell fish<br><b>+50 🪙</b></button><button onclick="buyItem('Bamboo',5,12)">🎋 Bamboo<br><b>5 for 12 🪙</b></button><button onclick="buyItem('Wood',5,15)">🪵 Wood<br><b>5 for 15 🪙</b></button><button onclick="buyItem('Potato',3,18)">🥔 Potato<br><b>3 for 18 🪙</b></button></div>`);
}
function buyItem(name,qty,cost){if(state.coins<cost){showToast('Not enough coins 🪙');return}state.coins-=cost;state.inventory[name]=(state.inventory[name]||0)+qty;updateUI();showToast(`Bought ${qty} ${name}!`)}
window.buyItem=buyItem;
function sellFish(){if(state.inventory.Fish>0){state.inventory.Fish--;state.coins+=50;gainXP(8);showToast('Fish sold! +50 🪙');openMarket()}else showToast('You have no fish to sell.');}
window.sellFish=sellFish;
function gatherWood(){const amount=state.buildings.house.level>=2?3:2;state.inventory.Wood+=amount;gainXP(8);advanceTime(10);showToast(`Collected ${amount} wood from the forest 🪵`)}
function startFishing(){
 if(Date.now()-lastAction<900)return; lastAction=Date.now();
 fishing={progress:18,dir:1,target:55,done:false};
 openPanel('🎣 Fishing',`<p>Keep the fish inside the green zone!</p><div class="fish-meter"><div id="fishTarget"></div><div id="fishCursor"></div></div><button class="primary-btn" id="fishReel">REEL IN!</button><p id="fishStatus">Press the button when the cursor is inside the target.</p>`);
 $('#fishReel').onclick=reelFish;
 fishing.timer=setInterval(()=>{if(!fishing)return;fishing.progress+=fishing.dir*4;if(fishing.progress>96||fishing.progress<4)fishing.dir*=-1;$('#fishCursor').style.left=fishing.progress+'%';},80);
}
function reelFish(){
 if(!fishing)return;
 const p=fishing.progress;const good=p>=45&&p<=67;
 clearInterval(fishing.timer); fishing=null;
 if(good){state.inventory.Fish++;state.tasks.fish=true;state.coins+=35;gainXP(18);advanceTime(15);showToast('Great catch! +35 coins 🎣');openPanel('🎣 Fishing','<p class="success">You caught a river fish! 🐟</p><button class="primary-btn" onclick="closePanelNow()">Continue</button>');}
 else {advanceTime(8);showToast('The fish got away! Try again.');openPanel('🎣 Fishing','<p>Too early! The fish escaped.</p><button class="primary-btn" onclick="closePanelNow()">Continue</button>')}
}
window.closePanelNow=()=>panel.classList.add('hidden');
function openBuildingPanel(title,key){
 const b=state.buildings[key];
 const info={coop:['🐔 Chicken Coop','Raises chickens and produces eggs.'],pondDock:['🛶 Fishing Dock','Adds a small dock and improves fishing rewards.'],bridge:['🌉 Wooden Bridge','Opens a shortcut across the canal.'],well:['💧 Village Well','Provides a water source and daily bonus.']}[key];
 const costs={coop:[180,350,650],pondDock:[220,450,800],bridge:[200,400],well:[150,300]};
 const cost=costs[key]?.[b.level]||0;
 openPanel(info[0],`<p>${info[1]}</p><p>Status: <b>${b.built?'Level '+b.level:'Not built'}</b></p>${b.level<(costs[key]?.length||0)?`<button class="primary-btn" onclick="buildOrUpgrade('${key}')">${b.built?'Upgrade':'Build'} — ${cost} 🪙</button>`:'<p class="success">✨ Fully upgraded!</p>'}`);
}
function buildOrUpgrade(key){
 const b=state.buildings[key];const costs={coop:[180,350,650],pondDock:[220,450,800],bridge:[200,400],well:[150,300]}[key];const cost=costs[b.level];if(cost===undefined)return;if(state.coins<cost){showToast('Not enough coins 🪙');return}state.coins-=cost;b.built=true;b.level++;gainXP(35);advanceTime(25);save();renderBuildings();showToast(`${key==='coop'?'Chicken coop':key==='pondDock'?'Fishing dock':key==='bridge'?'Bridge':'Well'} upgraded!`);openBuildingPanel(({coop:'🐔 Chicken Coop',pondDock:'🛶 Fishing Dock',bridge:'🌉 Wooden Bridge',well:'💧 Village Well'})[key],key)}
window.buildOrUpgrade=buildOrUpgrade;
function openBuildPanel(){
 openPanel('🛠️ Build Village',`<p>Build structures around your homestead. Collect wood and bamboo in the forest or buy them at the market.</p><div class="build-grid"><button onclick="openBuildingPanel('🐔 Chicken Coop','coop')">🐔<br>Chicken Coop</button><button onclick="openBuildingPanel('🛶 Fishing Dock','pondDock')">🛶<br>Fishing Dock</button><button onclick="openBuildingPanel('🌉 Wooden Bridge','bridge')">🌉<br>Bridge</button><button onclick="openBuildingPanel('💧 Village Well','well')">💧<br>Well</button></div><p><b>Materials:</b> 🪵 ${state.inventory.Wood} Wood · 🎋 ${state.inventory.Bamboo} Bamboo</p>`);
}
window.openBuildingPanel=openBuildingPanel;
window.openBuildPanel=openBuildPanel;
function renderBuildings(){
 const defs=[
  ['build-coop','coop',79,54,'🐔'],['build-dock','pondDock',24,58,'🛶'],['build-bridge','bridge',35,57,'🌉'],['build-well','well',31,47,'💧']
 ];
 for(const [id,key,x,y,emoji] of defs){let el=$('#'+id);const b=state.buildings[key];if(!b.built){if(el)el.remove();continue}if(!el){el=document.createElement('button');el.id=id;el.className='built-structure';world.appendChild(el);el.onclick=()=>openBuildingPanel(el.dataset.title,key)}el.dataset.title=({coop:'🐔 Chicken Coop',pondDock:'🛶 Fishing Dock',bridge:'🌉 Wooden Bridge',well:'💧 Village Well'})[key];el.style.left=x+'%';el.style.top=y+'%';el.innerHTML=`<span>${emoji}</span><small>Lv.${b.level}</small>`;}
}
function talk(name,avatar,lines){dialogueQueue=lines.map(t=>({name,avatar,text:t}));showDialogue();}
function showDialogue(){if(!dialogueQueue.length){dialogue.classList.add('hidden');return}const d=dialogueQueue[0];$('#dialogueName').textContent=d.name;$('#dialogueAvatar').textContent=d.avatar;$('#dialogueText').textContent=d.text;dialogue.classList.remove('hidden');}
$('#dialogueNext').onclick=()=>{dialogueQueue.shift();showDialogue()};
function openPanel(title,html){$('#panelTitle').textContent=title;$('#panelContent').innerHTML=html;panel.classList.remove('hidden')}
function inventory(){let html='<div class="inventory-grid">';for(const [name,count] of Object.entries(state.inventory))html+=`<div class="item"><div>${icon(name)}</div><b>${name}</b><span>x${count}</span></div>`;html+='</div>';openPanel('🎒 Inventory',html)}
function icon(n){return {Rice:'🌾',Potato:'🥔','Green Chili':'🌶️',Fish:'🐟',Egg:'🥚',Mango:'🥭',Bamboo:'🎋',Wood:'🪵'}[n]||'📦'}
function mapPanel(){openPanel('🗺️ Village Map','<p><b>North:</b> Forest & Fishing Spot</p><p><b>Center:</b> School, Market & Tea Stall</p><p><b>East:</b> Rice Fields & Cowshed</p><p><b>South:</b> Pond, gardens & your home</p><p><b>Build Yard:</b> near your home — open it to construct village upgrades.</p><p>Walk anywhere on the map with WASD/arrow keys. Walk to a marker and press <b>E</b>.</p>')}
function reset(){if(confirm('Reset your village save?')){localStorage.removeItem('nodirPareSave');location.reload()}}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='e'||e.key==='E')interact();if(e.key==='i'||e.key==='I')inventory();const k=e.key;moving.up=k==='ArrowUp'||k.toLowerCase()==='w'?true:moving.up;moving.down=k==='ArrowDown'||k.toLowerCase()==='s'?true:moving.down;moving.left=k==='ArrowLeft'||k.toLowerCase()==='a'?true:moving.left;moving.right=k==='ArrowRight'||k.toLowerCase()==='d'?true:moving.right});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='w'||e.key==='ArrowUp')moving.up=false;if(k==='s'||e.key==='ArrowDown')moving.down=false;if(k==='a'||e.key==='ArrowLeft')moving.left=false;if(k==='d'||e.key==='ArrowRight')moving.right=false});
setInterval(()=>{let dx=(moving.right?1:0)-(moving.left?1:0),dy=(moving.down?1:0)-(moving.up?1:0);if(dx||dy)move(dx,dy)},50);
['up','down','left','right'].forEach(dir=>{const b=document.querySelector(`[data-key="${dir==='up'?'ArrowUp':dir==='down'?'ArrowDown':dir==='left'?'ArrowLeft':'ArrowRight'}"]`);const on=()=>moving[dir]=true,onoff=()=>moving[dir]=false;b.addEventListener('pointerdown',on);b.addEventListener('pointerup',onoff);b.addEventListener('pointerleave',onoff);b.addEventListener('pointercancel',onoff)});
$('#actionBtn').onclick=interact;$('#talkBtn').onclick=()=>{if(world.dataset.near==='Pond'||world.dataset.near==='Fishing Spot')interact();else if(world.dataset.near==='Home')openHome();else talk('Grandma Ayesha','👵🏻',['A village is made from small kindnesses. Go say hello to someone today.'])};$('#bagBtn').onclick=inventory;$('#mapBtn').onclick=mapPanel;$('#buildBtn').onclick=openBuildPanel;$('#saveBtn').onclick=save;$('#resetBtn').onclick=reset;$('#closePanel').onclick=()=>panel.classList.add('hidden');
$('#startBtn').onclick=()=>{$('#startScreen').classList.add('hidden');talk('Grandma Ayesha','👵🏻',['Welcome home, Rafi.','The village has been waiting for you.','Explore freely, fish by the canal, and rebuild our little homestead.']);};
world.addEventListener('click',e=>{if(e.target.classList.contains('location-dot')){const r=world.getBoundingClientRect();state.x=((e.clientX-r.left)/r.width)*100;state.y=((e.clientY-r.top)/r.height)*100;updateUI();setTimeout(interact,180)}});
load();updateUI();
