// ECHOES — Immersive investigation (smoke, sway, grab, rooms, briefing)
const state = {
  level: 1, health: 85, food: 3, water: 2.5, safety: 60, info: 10,
  hour: 14, minute: 32, location: "Unknown Wilderness",
  inventory: [],
  objectives: [],
  memory: {
    foundObject: false, flashlightOn: false, climbedHill: false,
    campExamined: false, roadExamined: false, treesExamined: false, streamUsed: false,
    messagesRead: 0, askedArtifact: false, askedKnight: false, askedDino: false,
    paintingSeen: false, deskSearched: false, doorOpened: false,
    clockOpened: false, sceneExamined: false, valeQuestioned: false,
    annaQuestioned: false, cctvChecked: false, inStudy: false
  },
  clues: [], turn: 0, levelComplete: false, requiredClues: 4
};

let scene, camera, renderer, clockSys;
let player = { x: 0, y: 1.6, z: 10, yaw: 0, pitch: 0, onGround: true };
let keys = {}, isLooking = false, lastMouse = { x: 0, y: 0 };
let activePointerId = null, pointerStart = { x: 0, y: 0 }, pointerMoved = false;
let interactables = [], grabbables = [], currentHover = null, heldObject = null;
let worldGroup = null, flashlight = null, hillMesh = null;
let sunLight = null, ambientLight = null, fireLight = null;
let smokeParticles = [], treeMeshes = [], footprintMeshes = [];
let roomStudy = null, roomHall = null;

function initThree() {
  const canvas = document.getElementById("gameCanvas");
  const wrap = document.getElementById("viewportWrap");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, wrap.clientWidth / wrap.clientHeight, 0.08, 250);
  clockSys = new THREE.Clock();
  flashlight = new THREE.SpotLight(0xfff5e6, 0, 26, Math.PI / 6.5, 0.35, 1.1);
  flashlight.castShadow = true;
  camera.add(flashlight);
  flashlight.position.set(0.2, -0.12, 0.25);
  flashlight.target.position.set(0, -0.05, -5);
  camera.add(flashlight.target);
  scene.add(camera);
  window.addEventListener("resize", onResize);
  setupControls();
  animate();
}
function onResize() {
  const wrap = document.getElementById("viewportWrap");
  if (!wrap || !renderer) return;
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
}
function setupControls() {
  const canvas = document.getElementById("gameCanvas");
  window.addEventListener("keydown", e => {
    if (document.activeElement === document.getElementById("commandInput") ||
        !document.getElementById("game").classList.contains("active") ||
        document.getElementById("introOverlay").classList.contains("active") ||
        document.getElementById("scoreOverlay").classList.contains("active") ||
        document.getElementById("instrPopup").classList.contains("show")) return;
    keys[e.code] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyF","Space","KeyE"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "KeyF") toggleFlashlight();
    if (e.code === "Space") tryClimb();
    if (e.code === "KeyE") toggleGrab();
  });
  window.addEventListener("keyup", e => { keys[e.code] = false; });
  window.addEventListener("blur", () => {
    keys = {};
    isLooking = false;
    activePointerId = null;
  });
  canvas.addEventListener("pointerdown", e => {
    if (activePointerId !== null || (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2)) return;
    activePointerId = e.pointerId;
    isLooking = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    pointerStart = { x: e.clientX, y: e.clientY };
    pointerMoved = false;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType !== "touch" && e.button === 0) tryInteract();
    if (e.pointerType === "touch") e.preventDefault();
  });
  window.addEventListener("pointermove", e => {
    if (!isLooking || e.pointerId !== activePointerId) return;
    if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 8) pointerMoved = true;
    player.yaw -= (e.clientX - lastMouse.x) * 0.0032;
    player.pitch -= (e.clientY - lastMouse.y) * 0.0028;
    player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  const endLook = e => {
    if (e.pointerId !== activePointerId) return;
    if (e.pointerType === "touch" && !pointerMoved) tryInteract();
    isLooking = false;
    activePointerId = null;
  };
  window.addEventListener("pointerup", endLook);
  window.addEventListener("pointercancel", endLook);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  document.querySelectorAll(".mbtn").forEach(btn => {
    const d = btn.dataset.dir;
    const on = () => keys["btn_"+d] = true, off = () => keys["btn_"+d] = false;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      on();
    });
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("lostpointercapture", off);
  });
  setTimeout(() => { const h = document.getElementById("lookHint"); if (h) h.classList.add("fade"); }, 12000);
}

function showInstr(title, body) {
  document.getElementById("instrTitle").textContent = title;
  document.getElementById("instrBody").innerHTML = body;
  document.getElementById("instrPopup").classList.add("show");
}
function closeInstr() { document.getElementById("instrPopup").classList.remove("show"); }

function advanceTime(mins) {
  state.minute += mins;
  while (state.minute >= 60) { state.minute -= 60; state.hour = (state.hour + 1) % 24; }
  updateTimeDisplay(); updateDayNight();
}
function updateTimeDisplay() {
  const period = state.hour >= 5 && state.hour < 18 ? "Day" : "Night";
  document.getElementById("time").textContent = `${period} — ${state.hour}:${String(state.minute).padStart(2,"0")}`;
}
function updateDayNight() {
  if (!sunLight || !ambientLight) return;
  const h = state.hour + state.minute / 60;
  let sunI = 0.15, ambI = 0.22, sunC = 0x6688aa, ambC = 0x151825, fogC = 0x060810, exp = 0.85;
  if (h >= 5 && h < 8) { const t=(h-5)/3; sunI=0.3+t*0.7; ambI=0.3+t*0.25; sunC=0xffaa66; fogC=0x1a1510; exp=0.95+t*0.15; }
  else if (h >= 8 && h < 17) { sunI=1.05; ambI=0.55; sunC=0xfff5e0; ambC=0x445544; fogC=0x6a8a9a; exp=1.15; }
  else if (h >= 17 && h < 20) { const t=(h-17)/3; sunI=1-t*0.8; ambI=0.5-t*0.28; sunC=0xff6633; fogC=0x2a1810; exp=1.1-t*0.2; }
  if (state.level >= 2) { sunI *= 0.12; ambI = Math.max(0.18, ambI * 0.4); fogC = state.level===2 ? 0x0c0a08 : 0x08060a; exp = 0.95; }
  sunLight.intensity = sunI; sunLight.color.setHex(sunC);
  ambientLight.intensity = ambI; ambientLight.color.setHex(ambC);
  scene.background = new THREE.Color(fogC);
  if (scene.fog) scene.fog.color.setHex(fogC);
  renderer.toneMappingExposure = exp;
  if (fireLight) fireLight.intensity = (h < 6 || h > 18) ? 2.2 : 1.0;
}

function toggleFlashlight() {
  const item = state.inventory.find(i => i.id === "flashlight");
  if (!item) { addMsg("system","No flashlight."); return; }
  state.memory.flashlightOn = !state.memory.flashlightOn;
  if (flashlight) flashlight.intensity = state.memory.flashlightOn ? 2.5 : 0;
  addMsg("system", state.memory.flashlightOn ? "🔦 Flashlight ON" : "Flashlight OFF");
  if (state.memory.flashlightOn) { state.info=Math.min(100,state.info+2); item.uses=Math.max(0,item.uses-1); }
  updateUI();
}
function useItemById(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;
  if (id === "flashlight") { toggleFlashlight(); return; }
  if (id === "food" && item.uses > 0) { item.uses--; state.food=Math.max(0,state.food-0.4); state.health=Math.min(100,state.health+8); advanceTime(5); addMsg("ai","You eat. Strength returns."); }
  else if (id === "water" && item.uses > 0) { item.uses--; state.water=Math.max(0,state.water-0.3); state.health=Math.min(100,state.health+5); advanceTime(3); addMsg("ai","You drink."); }
  else if (id === "meds" && item.uses > 0) { item.uses--; state.health=Math.min(100,state.health+18); advanceTime(8); addMsg("ai","Bandaged. Better."); }
  else if (id === "phone") {
    state.memory.messagesRead++;
    advanceTime(2);
    if (state.memory.messagesRead===1) { addMsg("warning",'"Don\'t follow the smoke."'); addClue("Phone: Don't follow the smoke"); }
    else if (state.memory.messagesRead===2) { addMsg("warning",'"Campsite compromised. East when ready."'); addClue("Phone: campsite compromised, head east"); state.info+=8; }
    else addMsg("ai","No new messages. Battery low.");
  } else if (id === "compass") { addMsg("ai","Needle settles: smoke north, road east, hill west, water south."); state.info+=3; }
  else if (id === "key") addMsg("system","Strange Key — cold, unknown symbol.");
  else if (id === "journal") addMsg("ai",'Journal: "Signal near ridge. Don\'t trust the phone. Leave."');
  updateUI();
}

function toggleGrab() {
  if (heldObject) {
    // drop
    const dropPos = new THREE.Vector3(0, -0.3, -1.4).applyQuaternion(camera.quaternion);
    heldObject.position.copy(camera.position).add(dropPos);
    heldObject.position.y = Math.max(0.15, heldObject.position.y);
    heldObject.userData.held = false;
    addMsg("system", "You put down the " + (heldObject.userData.label || "object") + ".");
    heldObject = null;
    return;
  }
  if (currentHover && currentHover.userData.grabbable) {
    heldObject = currentHover;
    heldObject.userData.held = true;
    addMsg("system", "You pick up the " + (heldObject.userData.label || "object") + ". Press E to drop.");
    // examining while grabbing often gives clue
    if (heldObject.userData.onGrab) heldObject.userData.onGrab();
  } else {
    addMsg("system", "Nothing grabbable in front of you. Aim at a small object and press E.");
  }
}

function tryClimb() {
  if (!hillMesh || state.level !== 1) { if (state.level===1) addMsg("system","Move closer to the hill."); return; }
  const dist = Math.hypot(player.x - hillMesh.position.x, player.z - hillMesh.position.z);
  if (dist > 6.5) { addMsg("system","Too far from the hill."); return; }
  player.onGround = false;
  player.y = Math.min(4.8, player.y + 0.45);
  advanceTime(4);
  if (!state.memory.climbedHill) {
    state.memory.climbedHill = true;
    state.safety += 10; state.info += 15;
    setScene("Ridge view: campfire smoke, eastern road with tracks, broken trail through trees.");
    addMsg("ai","You climb the rocky hill. The valley opens below.");
    addClue("Hill view: smoke is a campfire; fresh tire tracks east");
    addClue("Broken trail through trees toward the camp");
    checkL1();
  } else addMsg("ai","On the ridge again.");
  updateUI();
}

function tryInteract() {
  if (!currentHover) return;
  const id = currentHover.userData.id;
  setScene("Examining: " + (currentHover.userData.label || id));
  advanceTime(2);
  if (state.level === 1) {
    if (id==="smoke"||id==="camp") examineCamp();
    else if (id==="hill") tryClimb();
    else if (id==="road") examineRoad();
    else if (id==="trees") examineTrees();
    else if (id==="stream") examineStream();
    else if (id==="footprint") { addMsg("ai","Boot print — deep heel, heading toward the smoke. Size roughly matches an adult male."); addClue("Boot prints lead toward the campsite"); checkL1(); }
  } else if (state.level === 2) {
    if (id==="artifact") talkArtifact();
    else if (id==="knight") talkKnight();
    else if (id==="dinosaur") talkDino();
    else if (id==="painting") examinePainting();
    else if (id==="door") examineDoor();
    else if (id==="desk") examineDesk();
    else if (id==="case") addMsg("ai","Glass case. Ancient tools and labels. Nothing moves by itself — only the big exhibits speak.");
  } else if (state.level === 3) {
    if (id==="clock") examineClock();
    else if (id==="body"||id==="desk"||id==="letter"||id==="weapon") examineCrimeScene();
    else if (id==="vale") talkVale();
    else if (id==="anna") talkAnna();
    else if (id==="terminal") checkCCTV();
    else if (id==="doorStudy") enterStudy();
    else if (id==="doorHall") leaveStudy();
  }
}

// ----- Level 1 investigates -----
function examineCamp() {
  if (state.memory.campExamined) { addMsg("ai","Campsite already searched."); return; }
  state.memory.campExamined = true; state.info += 20; state.location = "Abandoned Campsite";
  setScene("Collapsed tent, cold ashes, cloth-wrapped key, torn journal page.");
  addMsg("ai","Abandoned in a hurry. Fire dead for hours.");
  addMsg("system",'Journal: "Signal stronger near the ridge. Don\'t trust the phone."');
  addClue("Campsite abandoned; journal warns about the phone");
  if (!state.memory.foundObject) {
    state.memory.foundObject = true;
    state.inventory.push({ id:"key", name:"🗝️ Strange Key", uses:1, desc:"Unknown symbol" });
    state.inventory.push({ id:"journal", name:"📜 Torn Journal", uses:1, desc:"Ridge / phone warning" });
    addMsg("system","You take the Strange Key and journal.");
    addClue("Strange Key recovered from campsite");
  }
  checkL1(); updateUI();
}
function examineRoad() {
  state.memory.roadExamined = true; state.info += 10;
  setScene("Dirt road east. Fresh dual-axle tracks. Boot prints over the mud.");
  addMsg("ai","Vehicle stopped, someone walked to camp, vehicle left.");
  addClue("Vehicle came and left; prints overlay tire tracks");
  checkL1(); updateUI();
}
function examineTrees() {
  state.memory.treesExamined = true; state.info += 8;
  setScene("Broken twigs, crushed undergrowth, dark fabric on a branch.");
  addMsg("ai","Path of movement toward the smoke. Fabric from a long dark coat.");
  addClue("Long dark coat fabric on path to camp");
  checkL1(); updateUI();
}
function examineStream() {
  if (!state.memory.streamUsed) {
    state.memory.streamUsed = true; state.water = Math.min(3.5, state.water+0.8);
    const w = state.inventory.find(i=>i.id==="water"); if (w) w.uses=Math.min(5,w.uses+1);
    addMsg("ai","You refill water from the stream.");
    addClue("Fresh water source south of clearing");
  } else addMsg("ai","Stream still runs clear.");
  updateUI();
}
function checkL1() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Orient — phone, compass, look around", done: state.memory.messagesRead>0 },
    { text: "Investigate campsite", done: state.memory.campExamined },
    { text: "Hill or road survey", done: state.memory.climbedHill || state.memory.roadExamined },
    { text: "Clues " + n + "/" + state.requiredClues, done: n >= state.requiredClues }
  ];
  if (n >= state.requiredClues && !state.levelComplete)
    addMsg("system","Enough clues. When ready: walk the eastern road or type 'head east'.");
  updateUI();
}
function tryLeaveL1() {
  if (state.clues.length < state.requiredClues) {
    addMsg("ai","Not enough information yet. Keep investigating. Clues: "+state.clues.length+"/"+state.requiredClues);
    return;
  }
  advanceTime(40); state.location="Dirt Road — Extraction";
  setScene("Headlights. Black SUV. Driver knows about the key.");
  addMsg("character","You found the key. Get in. The museum is already waking.","Driver");
  addMsg("system","— LEVEL 1 COMPLETE —");
  state.levelComplete = true;
  setTimeout(()=>showScore(1), 1400);
}

// ----- Level 2 -----
function talkArtifact() {
  state.memory.askedArtifact = true; state.info += 12;
  if (state.memory.foundObject) {
    addMsg("character","That key opens the chamber under this wing. The curator tried to stop the transfer.","🏺 Egyptian Artifact");
    addClue("Key opens underground chamber; curator tried to stop transfer");
  } else addMsg("character","Return when you carry what belongs below.","🏺 Egyptian Artifact");
  checkL2(); updateUI();
}
function talkKnight() {
  state.memory.askedKnight = true; state.info += 12;
  addMsg("character","Long coat. Hard case. After closing. Egyptian wing. Did not bow.","⚔️ Medieval Knight");
  addClue("Long-coat figure after hours with case → Egyptian wing");
  checkL2(); updateUI();
}
function talkDino() {
  state.memory.askedDino = true; state.info += 14;
  addMsg("character","Pulse at 11:03. Every bone rang. A machine, not weather.","🦖 Dinosaur Skeleton");
  addClue("EM pulse 11:03 PM woke the exhibits");
  checkL2(); updateUI();
}
function examinePainting() {
  state.memory.paintingSeen = true; state.info += 12;
  addMsg("ai","Painted scene shifts: long-coat figure, then the key symbol in the sky.");
  addClue("Painting showed long-coat figure and key symbol");
  checkL2(); updateUI();
}
function examineDesk() {
  state.memory.deskSearched = true; state.info += 14;
  addMsg("ai",'Note: "If exhibits wake, transfer has begun. Find original subject. Project Echo cannot finish."');
  addClue("Curator note: Project Echo; find original subject");
  checkL2(); updateUI();
}
function examineDoor() {
  state.memory.doorOpened = true;
  if (state.memory.foundObject) {
    state.location = "Underground Chamber";
    setScene("Servers. Terminal: PROJECT ECHO — SUBJECT MEMORY TRANSFER. Your face — ACTIVE.");
    addMsg("ai","Key fits. You are listed as the active subject of a memory transfer.");
    addClue("PROJECT ECHO: memory transfer; you are active subject");
    state.info += 25;
  } else addMsg("ai","Locked chamber below. Needs a specific key.");
  checkL2(); updateUI();
}
function checkL2() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Question exhibits", done: state.memory.askedArtifact||state.memory.askedKnight||state.memory.askedDino },
    { text: "Search curator desk", done: state.memory.deskSearched },
    { text: "Understand Project Echo", done: state.clues.some(c=>/ECHO|transfer/i.test(c)) },
    { text: "Clues "+n+"/"+state.requiredClues, done: n>=state.requiredClues }
  ];
  if (n>=state.requiredClues && !state.levelComplete)
    addMsg("system","Enough. Type 'leave museum' or 'I'm ready' when you understand.");
  updateUI();
}

// ----- Level 3 -----
function enterStudy() {
  state.memory.inStudy = true;
  state.location = "Study — Crime Scene";
  player.x = 0; player.z = -2; player.yaw = 0;
  setScene("The study. Desk, letter, clock in the corner, evidence markers. This is where it happened.");
  addMsg("system","You enter the study. Crime scene tape. Examine everything.");
  if (roomHall) roomHall.visible = false;
  if (roomStudy) roomStudy.visible = true;
  updateUI();
}
function leaveStudy() {
  state.memory.inStudy = false;
  state.location = "Blackwood Manor — Grand Hall";
  player.x = 0; player.z = 6; player.yaw = Math.PI;
  setScene("Grand hall. Vale near the fireplace. Anna by the stairs. Terminal on the side table.");
  if (roomStudy) roomStudy.visible = false;
  if (roomHall) roomHall.visible = true;
  updateUI();
}
function examineClock() {
  state.memory.clockOpened = true; state.info += 15;
  addMsg("ai","Stopped at 11:47. Back panel: note — transfer window 11:30–12:00, subject must stay unconscious.");
  addClue("Transfer window 11:30–12:00; subject unconscious");
  checkL3(); updateUI();
}
function examineCrimeScene() {
  state.memory.sceneExamined = true; state.info += 16;
  setScene("Letter: \"Original subject still alive. Project Echo must be stopped before—\"");
  addMsg("ai","Prints only on the letter. Weapon wiped clean. You were framed for the words, not the strike.");
  addClue("Prints on letter only; weapon clean; letter about stopping Echo");
  checkL3(); updateUI();
}
function talkVale() {
  state.memory.valeQuestioned = true; state.info += 12;
  addMsg("character","Lab 10:30–11:30. Alone. Never entered the study.","Dr. Adrian Vale");
  addMsg("system","Left hand trembles.");
  addClue("Vale: lab alibi; hand trembles");
  checkL3(); updateUI();
}
function talkAnna() {
  state.memory.annaQuestioned = true; state.info += 12;
  addMsg("character","Around 11:40 — long coat near the study. Height like yours. No face.","Anna");
  addClue("Anna: long-coat at study ~11:40");
  checkL3(); updateUI();
}
function checkCCTV() {
  state.memory.cctvChecked = true; state.info += 20;
  addMsg("ai","11:40–11:52 long-coat enters study. Your room cam: you on the bed until 11:55. You could not be the killer.");
  addClue("CCTV: long-coat in study; you in room whole window");
  checkL3(); updateUI();
}
function checkL3() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Enter study & examine scene/clock", done: state.memory.sceneExamined && state.memory.clockOpened },
    { text: "Question Vale and Anna", done: state.memory.valeQuestioned && state.memory.annaQuestioned },
    { text: "Check CCTV", done: state.memory.cctvChecked },
    { text: "Evidence "+n+"/"+state.requiredClues, done: n>=state.requiredClues }
  ];
  if (n>=state.requiredClues && !state.levelComplete)
    addMsg("system","Enough evidence. Type 'prove my innocence' when ready.");
  updateUI();
}
function proveInnocence() {
  if (state.clues.length < state.requiredClues) { addMsg("ai","Need more evidence first."); return; }
  addMsg("ai","You present the full timeline. Planted key. Camera alibi. Vale breaks.");
  addMsg("character","I only needed the memory. You were supposed to stay asleep.","Dr. Adrian Vale");
  state.levelComplete = true; state.info = 98;
  addMsg("system","— CASE CLOSED — Innocence proven.");
  setTimeout(()=>showScore(3), 1600);
  updateUI();
}

// ---------- WORLD BUILD ----------
function clearWorld() {
  if (worldGroup) {
    scene.remove(worldGroup);
    worldGroup.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); }
    });
  }
  worldGroup = new THREE.Group(); scene.add(worldGroup);
  interactables = []; grabbables = []; smokeParticles = []; treeMeshes = []; footprintMeshes = [];
  hillMesh = null; fireLight = null; roomStudy = null; roomHall = null; heldObject = null;
  const rm = []; scene.traverse(o => { if (o.isLight && o !== flashlight) rm.push(o); });
  rm.forEach(l => scene.remove(l));
}
function addInt(mesh, id, label, grabbable) {
  mesh.userData.id = id; mesh.userData.label = label;
  mesh.userData.grabbable = !!grabbable;
  interactables.push(mesh); worldGroup.add(mesh);
  if (grabbable) grabbables.push(mesh);
}
function box(w,h,d,col,x,y,z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color:col, roughness:0.78, metalness:0.06 }));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
function cyl(rt,rb,h,col,x,y,z,seg=12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), new THREE.MeshStandardMaterial({ color:col, roughness:0.85 }));
  m.position.set(x,y,z); m.castShadow=true; return m;
}
function humanoid(x, y, z, bodyCol, label, id) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.7 }));
  body.position.y = 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.65 }));
  head.position.y = 1.75; g.add(head);
  // simple arms
  const armM = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.7 });
  [-1,1].forEach(s => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6), armM);
    arm.position.set(s*0.38, 1.15, 0); g.add(arm);
  });
  g.position.set(x, y, z);
  g.userData.id = id; g.userData.label = label;
  interactables.push(g); worldGroup.add(g);
  return g;
}

function buildLevel1() {
  clearWorld();
  ambientLight = new THREE.AmbientLight(0x334433, 0.4); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0xfff0dd, 0.9); sunLight.position.set(10, 22, 14); sunLight.castShadow = true; scene.add(sunLight);
  scene.fog = new THREE.FogExp2(0x0a100c, 0.03);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1a281c, roughness: 1 }));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; worldGroup.add(ground);

  // Trees with sway data
  for (let i = 0; i < 50; i++) {
    const a = Math.random()*Math.PI*2, r = 9+Math.random()*18;
    const tx = Math.cos(a)*r, tz = Math.sin(a)*r;
    if (Math.hypot(tx,tz) < 7) continue;
    const trunk = cyl(0.18, 0.26, 2.8+Math.random()*2.2, 0x3a2a18, tx, 1.4, tz);
    worldGroup.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.1+Math.random()*0.5, 2.8+Math.random()*1.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x1a3a1c, roughness: 0.95 }));
    leaves.position.set(tx, 3.3+Math.random()*0.4, tz);
    leaves.userData.sway = 0.3 + Math.random()*0.5;
    leaves.userData.phase = Math.random()*Math.PI*2;
    leaves.castShadow = true;
    worldGroup.add(leaves); treeMeshes.push(leaves);
  }
  // Rocks
  for (let i=0;i<14;i++) {
    const rx=(Math.random()-0.5)*32, rz=(Math.random()-0.5)*32;
    const rock = box(0.5+Math.random()*0.8, 0.3+Math.random()*0.5, 0.5+Math.random()*0.7, 0x4a4a40, rx, 0.2, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random()); worldGroup.add(rock);
  }

  // Multi-mesh hill
  const hillG = new THREE.Group();
  const main = new THREE.Mesh(new THREE.ConeGeometry(5, 6, 9), new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.92, flatShading: true }));
  main.position.y = 2.8; hillG.add(main);
  const side = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.5, 7), new THREE.MeshStandardMaterial({ color: 0x454538, roughness: 0.9, flatShading: true }));
  side.position.set(2.2, 1.6, 1.5); hillG.add(side);
  const side2 = new THREE.Mesh(new THREE.ConeGeometry(2, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x404038, roughness: 0.9, flatShading: true }));
  side2.position.set(-1.8, 1.2, -1.2); hillG.add(side2);
  hillG.position.set(-10, 0, -6);
  hillMesh = hillG;
  hillG.userData.id = "hill"; hillG.userData.label = "Rocky Hill — SPACE to climb";
  interactables.push(hillG); worldGroup.add(hillG);

  // Campfire + SMOKE particles
  worldGroup.add(cyl(0.7, 0.9, 0.22, 0x2a1a10, 8, 0.11, -9));
  for (let i=0;i<6;i++) {
    const ang=i/6*Math.PI*2;
    worldGroup.add(box(0.12, 0.1, 0.55, 0x3a2a18, 8+Math.cos(ang)*0.55, 0.14, -9+Math.sin(ang)*0.55));
  }
  fireLight = new THREE.PointLight(0xff5522, 1.8, 16); fireLight.position.set(8, 1.0, -9); scene.add(fireLight);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
  flame.position.set(8, 0.55, -9); flame.userData.bob=1; flame.userData.baseY=0.55; worldGroup.add(flame);
  // Smoke
  for (let i=0;i<40; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.2, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.25+Math.random()*0.2 }));
    p.position.set(8+(Math.random()-0.5)*0.4, 0.8+Math.random()*0.5, -9+(Math.random()-0.5)*0.4);
    p.userData.vy = 0.4 + Math.random()*0.5;
    p.userData.life = Math.random();
    worldGroup.add(p); smokeParticles.push(p);
  }
  const campHit = box(2.4, 1.2, 2.4, 0x111, 8, 0.6, -9);
  campHit.material.transparent=true; campHit.material.opacity=0.01;
  addInt(campHit, "smoke", "Campsite / Smoke");

  // Footprints path toward camp
  for (let i=0;i<8;i++) {
    const t = i/7;
    const fx = 1 + t*6.5 + (i%2)*0.25;
    const fz = 6 - t*12;
    const fp = box(0.22, 0.02, 0.38, 0x1a1510, fx, 0.02, fz);
    fp.rotation.y = -0.4;
    addInt(fp, "footprint", "Boot print");
    footprintMeshes.push(fp);
  }

  addInt(box(4.2, 0.05, 18, 0x3a3228, 14, 0.03, 0), "road", "Dirt Road (east)");
  const th = box(3.5, 2.5, 3.5, 0x111, -5, 1.2, 7); th.material.transparent=true; th.material.opacity=0.01;
  addInt(th, "trees", "Dense Trees — trail");
  addInt(box(10, 0.06, 1.8, 0x1a3848, -1, 0.03, 13), "stream", "Cold Stream");

  // Grabbable: stick, stone
  const stick = box(0.08, 0.08, 0.7, 0x5a3a20, 1.5, 0.2, 8);
  stick.rotation.z = 0.3; addInt(stick, "stick", "Fallen stick", true);
  const stone = box(0.25, 0.15, 0.2, 0x666660, -1, 0.12, 9); addInt(stone, "stone", "Sharp stone", true);

  player = { x:0, y:1.6, z:10, yaw:0, pitch:0, onGround:true };
  state.hour=14; state.minute=32; updateDayNight();
}

function buildLevel2() {
  clearWorld();
  ambientLight = new THREE.AmbientLight(0x2a2218, 0.35); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0xc9a66b, 0.2); sunLight.position.set(0,12,4); scene.add(sunLight);
  const spot = new THREE.SpotLight(0xc9a66b, 1.2, 32, Math.PI/4.5, 0.35);
  spot.position.set(0, 9, 2); spot.target.position.set(0,0,-6); scene.add(spot); scene.add(spot.target);
  scene.add(new THREE.PointLight(0x4466aa, 0.3, 16).translateX(-8).translateY(3).translateZ(2));
  scene.fog = new THREE.Fog(0x0c0a08, 10, 32);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshStandardMaterial({ color: 0x1c1814, roughness: 0.6, metalness: 0.12 }));
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; worldGroup.add(floor);

  // Walls + ceiling sense
  const wm = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.88 });
  [[0,5,-13],[0,5,13],[-14,5,0],[14,5,0]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(32,11),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===1)w.rotation.y=Math.PI; worldGroup.add(w);
  });
  // Columns
  for (let i=-2;i<=2;i++) if(i) worldGroup.add(cyl(0.4,0.45,8,0x3a3228,i*5.5,4,-11,16));
  // Ceiling beams
  for (let i=-2;i<=2;i++) worldGroup.add(box(28,0.25,0.4,0x2a2018,0,8.5,i*4));

  // Pedestals + exhibits
  worldGroup.add(box(1.5,1.3,1.5,0x3a3228,-7,0.65,-8));
  const art=box(0.75,1.9,0.5,0xc9a050,-7,2.2,-8); art.userData.bob=2; art.userData.baseY=2.2;
  addInt(art,"artifact","Egyptian Artifact");

  worldGroup.add(box(1.5,1.3,1.5,0x3a3228,7,0.65,-8));
  addInt(box(0.85,2.3,0.6,0x555560,7,2.4,-8),"knight","Medieval Knight");

  addInt(box(4.2,3,1.5,0x8a8578,0,1.6,-11),"dinosaur","Dinosaur Skeleton");
  addInt(box(2.6,1.9,0.2,0x5a4030,11,3.3,-3),"painting","Suspicious Painting");
  addInt(box(1.7,2.9,0.3,0x2a2018,-12.5,1.45,2),"door","Service Door / Chamber");
  addInt(box(2.9,1.0,1.5,0x4a3a28,3.5,0.5,6),"desk","Curator's Desk");

  // Glass cases
  for (let i=0;i<4;i++) {
    const c = box(1.3,1.6,0.9,0x8899aa,-6+i*3.5,0.85,1);
    c.material.transparent=true; c.material.opacity=0.25; c.material.metalness=0.4;
    addInt(c,"case","Display case");
    worldGroup.add(box(1.35,0.08,0.95,0x3a3228,-6+i*3.5,0.04,1));
  }

  // Grabbable note on desk
  const note = box(0.35,0.02,0.25,0xe8e0d0,3.2,1.05,6.2);
  addInt(note,"note","Handwritten note", true);
  note.userData.onGrab = () => { if (!state.memory.deskSearched) examineDesk(); };

  player={x:0,y:1.6,z:10,yaw:0,pitch:0,onGround:true};
  state.hour=23; state.minute=42; updateDayNight();
}

function buildLevel3() {
  clearWorld();
  ambientLight = new THREE.AmbientLight(0x1a1218, 0.3); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0x445566, 0.12); sunLight.position.set(2,10,3); scene.add(sunLight);
  scene.add(new THREE.PointLight(0xaa5533, 0.9, 16).translateY(3.2).translateZ(2));
  scene.add(new THREE.PointLight(0x334466, 0.35, 12).translateX(-5).translateY(2.5).translateZ(-4));
  scene.fog = new THREE.Fog(0x08060a, 6, 22);

  // HALL group
  roomHall = new THREE.Group(); worldGroup.add(roomHall);
  const floorH = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), new THREE.MeshStandardMaterial({ color: 0x161018, roughness: 0.8 }));
  floorH.rotation.x = -Math.PI/2; floorH.receiveShadow = true; roomHall.add(floorH);
  const wm = new THREE.MeshStandardMaterial({ color: 0x1c1420, roughness: 0.9 });
  [[0,5,8],[0,5,-2],[-10,5,3],[10,5,3]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(i<2?22:16,10),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===0)w.rotation.y=Math.PI; roomHall.add(w);
  });

  humanoid(6.5, 0, 2, 0x2a2a40, "Dr. Adrian Vale", "vale");
  humanoid(-4, 0, 4, 0x4a3a38, "Anna — Housekeeper", "anna");
  const term = box(1.5, 1.15, 0.7, 0x1a2030, 5, 0.6, 5.5);
  term.userData.id="terminal"; term.userData.label="Security Terminal / CCTV";
  interactables.push(term); roomHall.add(term);

  // Door to study
  const doorS = box(1.8, 2.6, 0.25, 0x3a2a22, 0, 1.3, -1.8);
  doorS.userData.id="doorStudy"; doorS.userData.label="Door to Study — Crime Scene";
  interactables.push(doorS); roomHall.add(doorS);
  // Crime tape suggestion
  roomHall.add(box(2.2, 0.06, 0.06, 0xccaa22, 0, 1.5, -1.5));

  // STUDY group (starts hidden)
  roomStudy = new THREE.Group(); roomStudy.visible = false; worldGroup.add(roomStudy);
  const floorS = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.75 }));
  floorS.rotation.x = -Math.PI/2; floorS.position.z = -8; floorS.receiveShadow = true; roomStudy.add(floorS);
  [[0,5,-14],[0,5,-2],[-7,5,-8],[7,5,-8]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(i<2?14:12,10),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===1)w.rotation.y=Math.PI; roomStudy.add(w);
  });

  // Desk + crime props
  const desk = box(3.2, 1.0, 1.6, 0x3a2a22, 1.5, 0.5, -9);
  desk.userData.id="desk"; desk.userData.label="Crime Scene Desk";
  interactables.push(desk); roomStudy.add(desk);
  const letter = box(0.4, 0.02, 0.3, 0xe8e0d0, 1.2, 1.05, -8.7);
  letter.userData.id="letter"; letter.userData.label="Unfinished letter"; letter.userData.grabbable=true;
  interactables.push(letter); roomStudy.add(letter);
  const weapon = box(0.08, 0.08, 0.55, 0x333338, 2.4, 1.08, -9.2);
  weapon.userData.id="weapon"; weapon.userData.label="Weapon (wiped clean)"; weapon.userData.grabbable=true;
  interactables.push(weapon); roomStudy.add(weapon);
  // Evidence markers
  for (let i=0;i<3;i++) {
    const m = cyl(0.12, 0.12, 0.05, 0xeeaa22, 0.5+i*0.8, 0.03, -7.5-i*0.3, 8);
    roomStudy.add(m);
  }
  // Dark stain (tasteful)
  const stain = box(0.9, 0.01, 0.6, 0x2a1010, 2.0, 0.015, -8.2);
  roomStudy.add(stain);

  const clock = box(1.0, 3.4, 0.7, 0x2a1a12, -4.5, 1.7, -12);
  clock.userData.id="clock"; clock.userData.label="Grandfather Clock 11:47";
  interactables.push(clock); roomStudy.add(clock);

  const doorH = box(1.8, 2.6, 0.25, 0x3a2a22, 0, 1.3, -2.2);
  doorH.userData.id="doorHall"; doorH.userData.label="Return to Hall";
  interactables.push(doorH); roomStudy.add(doorH);

  // Point light in study
  const studyLamp = new THREE.PointLight(0xaa6644, 0.7, 12);
  studyLamp.position.set(1.5, 2.5, -9); roomStudy.add(studyLamp);

  player={x:0,y:1.6,z:6,yaw:0,pitch:0,onGround:true};
  state.hour=2; state.minute=17; updateDayNight();
}

// ---------- LOOP ----------
function updatePlayer(dt) {
  const speed = (keys["ShiftLeft"]?6.5:4)*dt;
  const f = new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const r = new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  let mx=0,mz=0;
  if (keys["KeyW"]||keys["ArrowUp"]||keys["btn_forward"]){mx+=f.x;mz+=f.z;}
  if (keys["KeyS"]||keys["ArrowDown"]||keys["btn_back"]){mx-=f.x;mz-=f.z;}
  if (keys["KeyA"]||keys["ArrowLeft"]||keys["btn_left"]){mx-=r.x;mz-=r.z;}
  if (keys["KeyD"]||keys["ArrowRight"]||keys["btn_right"]){mx+=r.x;mz+=r.z;}
  if (mx||mz){ const l=Math.hypot(mx,mz); player.x+=mx/l*speed; player.z+=mz/l*speed;
    player.x=Math.max(-15,Math.min(15,player.x)); player.z=Math.max(-15,Math.min(15,player.z)); }
  if (!player.onGround && hillMesh) {
    const d=Math.hypot(player.x-hillMesh.position.x, player.z-hillMesh.position.z);
    if (d<5.5) player.y=THREE.MathUtils.lerp(player.y, Math.max(1.6,4.5-d*0.5), 0.1);
    else { player.y=THREE.MathUtils.lerp(player.y,1.6,0.12); if(Math.abs(player.y-1.6)<0.04){player.y=1.6;player.onGround=true;} }
  }
  camera.position.set(player.x, player.y, player.z);
  camera.rotation.order="YXZ"; camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;
  // Held object follows camera
  if (heldObject) {
    const hold = new THREE.Vector3(0.35, -0.2, -0.9).applyQuaternion(camera.quaternion);
    heldObject.position.copy(camera.position).add(hold);
  }
}
function checkHover() {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0,0), camera);
  const hits = ray.intersectObjects(interactables, true);
  const prompt = document.getElementById("interactPrompt");
  const cross = document.getElementById("crosshair");
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.id) o = o.parent;
    if (o && o.userData.id) {
      currentHover = o;
      const g = o.userData.grabbable ? " · E grab" : "";
      prompt.textContent = "Click/tap — " + (o.userData.label||o.userData.id) + g;
      prompt.classList.add("show"); cross.classList.add("active"); return;
    }
  }
  currentHover=null; prompt.classList.remove("show"); cross.classList.remove("active");
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clockSys.getDelta(), 0.05);
  const t = clockSys.elapsedTime;
  if (document.getElementById("game").classList.contains("active")) {
    updatePlayer(dt); checkHover();
    // Tree sway
    treeMeshes.forEach(tr => {
      tr.rotation.z = Math.sin(t * tr.userData.sway + tr.userData.phase) * 0.06;
      tr.rotation.x = Math.cos(t * tr.userData.sway * 0.7 + tr.userData.phase) * 0.03;
    });
    // Smoke rise
    smokeParticles.forEach(p => {
      p.position.y += p.userData.vy * dt;
      p.position.x += Math.sin(t + p.userData.life) * 0.15 * dt;
      p.userData.life += dt * 0.15;
      if (p.position.y > 6) { p.position.y = 0.8; p.material.opacity = 0.35; }
      p.material.opacity = Math.max(0.05, 0.35 - (p.position.y - 0.8) * 0.05);
      const s = 0.8 + (p.position.y - 0.8) * 0.15;
      p.scale.setScalar(s);
    });
    if (worldGroup) worldGroup.children.forEach(c => {
      if (c.userData.bob) c.position.y = c.userData.baseY + Math.sin(t*1.5+c.userData.bob)*0.05;
    });
  }
  renderer.render(scene, camera);
}

// ---------- UI ----------
function addClue(text) {
  if (state.clues.includes(text)) return;
  state.clues.push(text);
  addMsg("system", "🔎 CLUE " + state.clues.length + ": " + text);
  state.info = Math.min(100, state.info + 6);
}
function showHome() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("home").classList.add("active");
  document.getElementById("sideMenu").classList.remove("open");
}
function showHowTo() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("howto").classList.add("active");
}
function showMultiplayer() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("multiplayer").classList.add("active");
}
function startJourney() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("game").classList.add("active");
  if (!renderer) initThree();
  onResize(); resetLevel(1);
  document.getElementById("introOverlay").classList.add("active");
  document.getElementById("introTitle").textContent = "LEVEL 1 — THE UNKNOWN";
  document.getElementById("introText").textContent = "Find 4 clues before you can leave. Use tools. Climb. Grab objects with E. Day becomes night as time passes.";
}
function closeIntro() {
  document.getElementById("introOverlay").classList.remove("active");
  document.getElementById("commandInput").focus();
  onResize();
  if (state.level === 1) showInstr("BRIEFING — LEVEL 1", "<b>Goal:</b> Find at least <b>4 clues</b> before leaving.<br><br>• <b>WASD</b> move · Drag to look<br>• <b>F</b> flashlight · <b>SPACE</b> climb hill<br>• <b>E</b> grab / drop small objects<br>• Click or tap campsite, trees, road, footprints<br>• Use phone & compass from inventory<br><br>Watch the smoke. Follow the prints.");
  else if (state.level === 2) showInstr("BRIEFING — LEVEL 2", "<b>Goal:</b> Uncover Project Echo — <b>4 clues</b>.<br><br>• Question every exhibit (click them)<br>• Search the curator desk<br>• Your Strange Key may open the service door<br>• Grab the note on the desk with <b>E</b>");
  else showInstr("BRIEFING — LEVEL 3", "<b>Goal:</b> Prove innocence — <b>5 evidence</b> pieces.<br><br>• Enter the <b>Study</b> through the door<br>• Examine clock, letter, weapon<br>• Question Vale & Anna in the hall<br>• Check the security terminal<br>• Type <b>prove my innocence</b> when ready");
}
function toggleMenu(){document.getElementById("sideMenu").classList.toggle("open");}
function restartLevel(){resetLevel(state.level);document.getElementById("sideMenu").classList.remove("open");addMsg("system","Restarted.");}

function updateUI() {
  document.getElementById("location").textContent = state.location;
  updateTimeDisplay();
  document.getElementById("health").textContent = Math.round(state.health)+"%";
  document.getElementById("food").textContent = state.food.toFixed(1)+"d";
  document.getElementById("water").textContent = state.water.toFixed(1)+"d";
  document.getElementById("safety").textContent = Math.round(state.safety)+"%";
  document.getElementById("info").textContent = Math.round(state.info)+"%";
  document.getElementById("levelBadge").textContent = state.level===1?"LEVEL 1 — THE UNKNOWN":state.level===2?"LEVEL 2 — MUSEUM AFTER DARK":"LEVEL 3 — THE FINAL CASE";
  document.getElementById("inventory").innerHTML = state.inventory.map(i=>{
    const hl=/key|journal|flashlight/i.test(i.id)?" highlight":"";
    return `<div class="inv-item${hl}" title="${i.desc}" onclick="useItemById('${i.id}')">${i.name}</div>`;
  }).join("");
  document.getElementById("objectivesList").innerHTML = state.objectives.map(o=>`<li class="${o.done?"done":""}">${o.text}</li>`).join("");
  const commandHint = document.getElementById("commandHint");
  if (commandHint) {
    commandHint.textContent = state.level===1 ? "Try: examine road · check phone · head east"
      : state.level===2 ? "Try: question the knight · search desk · open chamber"
      : "Try: enter study · check CCTV · prove my innocence";
  }
}
function setScene(t){document.getElementById("sceneText").textContent=t;}
function addMsg(type,text,name){
  const log=document.getElementById("chatLog");
  const div=document.createElement("div"); div.className="msg "+type;
  if(type==="character"&&name) div.innerHTML=`<div class="name">${name}</div>${text}`;
  else div.textContent=text;
  log.appendChild(div); log.scrollTop=log.scrollHeight;
}

function resetLevel(lvl) {
  state.level=lvl; state.turn=0; state.levelComplete=false; state.clues=[];
  state.requiredClues = lvl===1?4:lvl===2?4:5;
  document.getElementById("chatLog").innerHTML="";
  if (lvl===1) {
    Object.assign(state.memory,{campExamined:false,climbedHill:false,roadExamined:false,treesExamined:false,streamUsed:false,messagesRead:0,flashlightOn:false});
    buildLevel1();
    state.health=85;state.food=3;state.water=2.5;state.safety=60;state.info=10;
    state.location="Unknown Wilderness";
    state.inventory=[
      {id:"food",name:"🥫 Food",uses:3,desc:"Rations"},{id:"water",name:"💧 Water",uses:3,desc:"Water"},
      {id:"flashlight",name:"🔦 Flashlight",uses:40,desc:"F to toggle"},{id:"meds",name:"🩹 Meds",uses:2,desc:"Heal"},
      {id:"phone",name:"📱 Phone",uses:5,desc:"Messages"},{id:"compass",name:"🧭 Compass",uses:99,desc:"Direction"}
    ];
    state.objectives=[{text:"Orient yourself",done:false},{text:"Investigate campsite",done:false},{text:"Hill or road",done:false},{text:"Clues 0/4",done:false}];
    setScene("Smoke rises ahead. Footprints in the dirt. Trees move in the wind.");
    addMsg("system","You wake with almost no memory.");
    addMsg("warning",'"Don\'t follow the smoke."');
  } else if (lvl===2) {
    Object.assign(state.memory,{askedArtifact:false,askedKnight:false,askedDino:false,paintingSeen:false,deskSearched:false,doorOpened:false});
    buildLevel2();
    state.health=95;state.food=3;state.water=3;state.safety=70;state.info=25;
    state.location="Museum — Egyptian Wing";
    state.inventory=[{id:"flashlight",name:"🔦 Flashlight",uses:30,desc:"F"},{id:"phone",name:"📱 Phone",uses:3,desc:"No signal"}];
    if(state.memory.foundObject){state.inventory.push({id:"key",name:"🗝️ Strange Key",uses:1,desc:"Chamber"});state.inventory.push({id:"journal",name:"📜 Torn Journal",uses:1,desc:"Warning"});}
    state.objectives=[{text:"Question exhibits",done:false},{text:"Search desk",done:false},{text:"Project Echo",done:false},{text:"Clues 0/4",done:false}];
    setScene("Night museum. Living exhibits. Columns. Glass cases.");
    addMsg("system","Doors sealed. Exhibits are conscious.");
  } else {
    Object.assign(state.memory,{clockOpened:false,sceneExamined:false,valeQuestioned:false,annaQuestioned:false,cctvChecked:false,inStudy:false});
    buildLevel3();
    state.health=100;state.food=3;state.water=3;state.safety=45;state.info=20;
    state.location="Blackwood Manor — Grand Hall";
    state.inventory=[{id:"flashlight",name:"🔦 Flashlight",uses:25,desc:"F"},{id:"phone",name:"📱 Phone",uses:2,desc:"No signal"}];
    if(state.memory.foundObject) state.inventory.push({id:"key",name:"🗝️ Strange Key",uses:1,desc:"Echo link"});
    state.objectives=[{text:"Enter study",done:false},{text:"Question Vale & Anna",done:false},{text:"CCTV",done:false},{text:"Evidence 0/5",done:false}];
    setScene("Grand hall. Door to the study is ahead. Vale and Anna wait.");
    addMsg("system","You are the primary suspect. Enter the study. Build the case.");
  }
  updateUI(); onResize();
}

function sendCommand() {
  const input=document.getElementById("commandInput");
  const text=input.value.trim(); if(!text||state.levelComplete)return;
  input.value=""; addMsg("player",text); state.turn++; advanceTime(1);
  const c=text.toLowerCase();
  if (/^(help|commands|what can i do|what should i do)\??$/.test(c)) { showCommandHelp(); return; }
  if(/flashlight|torch|^f$|light on/.test(c)){toggleFlashlight();return;}
  if(/climb/.test(c)){tryClimb();return;}
  if(/grab|pick up|drop|put down/.test(c)){toggleGrab();return;}
  if(/eat|food/.test(c)){useItemById("food");return;}
  if(/drink|water/.test(c)){useItemById("water");return;}
  if(/med|heal/.test(c)){useItemById("meds");return;}
  if(/phone|message/.test(c)){useItemById("phone");return;}
  if(/compass/.test(c)){useItemById("compass");return;}
  if(state.level===1){
    if(/\b(?:leave|exit|head east|go east|walk east|follow (?:the )?road|take (?:the )?road|ready)\b/.test(c)){tryLeaveL1();return;}
    if(/camp|smoke|fire|tent/.test(c)){examineCamp();return;}
    if(/hill|ridge|climb/.test(c)){tryClimb();return;}
    if(/road|track|tire/.test(c)){examineRoad();return;}
    if(/tree|fabric|print|foot/.test(c)){examineTrees();return;}
    if(/stream|refill/.test(c)){examineStream();return;}
    if(/where|direction/.test(c)){addMsg("ai","Smoke north, hill west, road east, water south. Find 4 clues. Type 'help' for commands.");return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  } else if(state.level===2){
    if(/leave|ready|understand|continue/.test(c)&&state.clues.length>=state.requiredClues){state.levelComplete=true;addMsg("system","— LEVEL 2 COMPLETE —");setTimeout(()=>showScore(2),1200);return;}
    if(/artifact|egyptian|statue/.test(c)){talkArtifact();return;}
    if(/knight|armor|figure/.test(c)){talkKnight();return;}
    if(/dino|skeleton|pulse/.test(c)){talkDino();return;}
    if(/painting/.test(c)){examinePainting();return;}
    if(/desk|curator|note/.test(c)){examineDesk();return;}
    if(/door|chamber|key|open/.test(c)){examineDoor();return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  } else {
    if(/prove|innocent|accuse/.test(c)){proveInnocence();return;}
    if(/study|enter study|crime/.test(c)){enterStudy();return;}
    if(/hall|leave study|back/.test(c)){leaveStudy();return;}
    if(/clock/.test(c)){examineClock();return;}
    if(/desk|letter|weapon|body|scene/.test(c)){examineCrimeScene();return;}
    if(/vale|doctor/.test(c)){talkVale();return;}
    if(/anna|maid/.test(c)){talkAnna();return;}
    if(/camera|cctv|terminal|footage/.test(c)){checkCCTV();return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  }
  updateUI();
}
function showCommandHelp() {
  const instructions = state.level===1
    ? "Level 1: examine camp, road, trees, or stream; use phone or compass; climb the hill; grab or drop objects; type 'head east' or 'leave' after finding 4 clues."
    : state.level===2
    ? "Level 2: question the artifact, knight, or dinosaur; examine the painting or curator desk; open the chamber with your key; leave after finding 4 clues."
    : "Level 3: enter the study; examine the clock, letter, or weapon; question Vale or Anna; check CCTV; type 'prove my innocence' after finding 5 pieces of evidence.";
  addMsg("ai",instructions);
}
document.getElementById("commandInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendCommand();});

function showScore(level) {
  const overlay=document.getElementById("scoreOverlay");
  const scores = level===1
    ? {"Clues":Math.min(100,state.clues.length*22),"Tools":82,"Safety":Math.round(state.safety),"Info":Math.min(100,state.info)}
    : level===2
    ? {"Clues":Math.min(100,state.clues.length*20),"Exhibits":88,"Echo":state.clues.some(c=>/ECHO/i.test(c))?95:50,"Info":Math.min(100,state.info)}
    : {"Evidence":Math.min(100,state.clues.length*18),"Interrogation":92,"Timeline":94,"Proof":96};
  const totalScore=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/4);
  document.getElementById("scoreTitle").textContent=level===1?"LEVEL 1 COMPLETE":level===2?"LEVEL 2 COMPLETE":"CASE CLOSED";
  document.getElementById("scoreTotal").textContent=totalScore+"/100";
  document.getElementById("scoreBreakdown").innerHTML=Object.entries(scores).map(([k,v])=>`<div class="score-row"><span>${k}</span><span>${v}</span></div>`).join("");
  document.getElementById("rank").textContent=totalScore>=85?(level===3?"🏆 MASTER INVESTIGATOR":"INVESTIGATOR"):"SURVIVOR";
  const nextBtn=document.getElementById("nextLevelBtn");
  if(level===1){nextBtn.textContent="ENTER LEVEL 2";nextBtn.onclick=()=>{overlay.classList.remove("active");startLevel(2);};}
  else if(level===2){nextBtn.textContent="ENTER LEVEL 3";nextBtn.onclick=()=>{overlay.classList.remove("active");startLevel(3);};}
  else{nextBtn.textContent="RETURN TO MENU";nextBtn.onclick=()=>{overlay.classList.remove("active");showHome();};}
  overlay.classList.add("active");
}
function startLevel(lvl) {
  document.getElementById("introOverlay").classList.add("active");
  document.getElementById("introTitle").textContent=lvl===2?"LEVEL 2 — MUSEUM AFTER DARK":"LEVEL 3 — THE FINAL CASE";
  document.getElementById("introText").textContent=lvl===2?"Night. Living exhibits. Find 4 clues about Project Echo.":"You are the suspect. Enter the study. Gather 5 evidence pieces. Prove innocence.";
  resetLevel(lvl);
}
updateUI();
