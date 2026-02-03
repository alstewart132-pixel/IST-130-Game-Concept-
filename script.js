const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const levelNameEl = document.getElementById("levelName");
const objectiveEl = document.getElementById("objective");
const infoEl = document.getElementById("info");
const progressEl = document.getElementById("progress");
const overlayEl = document.getElementById("overlay");
const logItems = document.querySelectorAll("#logItems li");
const oxygenBar = document.getElementById("oxygenBar");
const commsBar = document.getElementById("commsBar");
const tempBar = document.getElementById("tempBar");

const keys = new Set();
let lastTime = 0;

const player = {
  x: 140,
  y: 260,
  speed: 150,
  radius: 14,
  suitColor: "#f4f5f8",
  visorColor: "#0d1f2d",
};

const meters = {
  oxygen: 92,
  comms: 100,
  temp: 70,
};

const levelState = {
  collected: 0,
  visited: new Set(),
  checklist: new Set(),
  countdown: null,
  countdownTimer: 0,
  launchPhase: "idle",
  flagPlanted: false,
  overlayMessage: "",
  overlayTimer: 0,
};

const levels = [
  {
    name: "Level 1: Neutral Buoyancy Training",
    objective: "Objective: Recover all 6 lost tools in the pool.",
    info: "Collect the lost gear floating in the training pool.",
    progressLabel: () => `Items recovered: ${levelState.collected}/6`,
    setup() {
      player.x = 140;
      player.y = 260;
      levelState.collected = 0;
      this.items.forEach((item) => {
        item.collected = false;
      });
    },
    items: [
      { x: 260, y: 160, label: "Tool Kit" },
      { x: 420, y: 130, label: "Helmet Seal" },
      { x: 620, y: 200, label: "Tether" },
      { x: 540, y: 350, label: "Sensor" },
      { x: 340, y: 380, label: "Navigation Chip" },
      { x: 700, y: 280, label: "Comms Pack" },
    ],
  },
  {
    name: "Level 2: Launch Facility Tour",
    objective: "Objective: Meet the three mission specialists.",
    info: "Talk to the mission staff to learn about your shuttle.",
    progressLabel: () => `Specialists met: ${levelState.visited.size}/3`,
    setup() {
      player.x = 120;
      player.y = 420;
      levelState.visited = new Set();
    },
    npcs: [
      {
        x: 320,
        y: 200,
        name: "Flight Director",
        detail: "Launch sequence, abort windows, and safety checks.",
      },
      {
        x: 560,
        y: 160,
        name: "Shuttle Engineer",
        detail: "Orbital systems, payload, and cabin layout.",
      },
      {
        x: 740,
        y: 360,
        name: "Mission Control",
        detail: "Lunar landing checklist and comms protocol.",
      },
    ],
  },
  {
    name: "Level 3: Shuttle Launch",
    objective: "Objective: Complete pre-launch checklist and launch.",
    info: "Start the checklist before initiating countdown.",
    progressLabel: () => `Checklist: ${levelState.checklist.size}/3`,
    setup() {
      player.x = canvas.width / 2;
      player.y = canvas.height - 120;
      levelState.countdown = null;
      levelState.countdownTimer = 0;
      levelState.launchPhase = "idle";
      levelState.checklist = new Set();
    },
    checklistItems: [
      "Secure harness",
      "Flight computer green",
      "Life support nominal",
    ],
  },
  {
    name: "Level 4: Lunar Surface",
    objective: "Objective: Plant the American flag on the moon.",
    info: "Find the flag marker and plant it on the lunar surface.",
    progressLabel: () =>
      levelState.flagPlanted
        ? "Flag planted. Mission accomplished."
        : "Flag planting: 0/1",
    setup() {
      player.x = 180;
      player.y = 360;
      levelState.flagPlanted = false;
    },
    flagSpot: { x: 720, y: 260 },
  },
];

let currentLevelIndex = 0;

function setLevel(index) {
  currentLevelIndex = index;
  const level = levels[currentLevelIndex];
  level.setup();
  updateHud();
  updateLog();
  showOverlay(level.name);
}

function updateHud(message) {
  const level = levels[currentLevelIndex];
  levelNameEl.textContent = level.name;
  objectiveEl.textContent = level.objective;
  infoEl.textContent = message || level.info;
  progressEl.textContent = level.progressLabel();
}

function updateLog() {
  logItems.forEach((item, index) => {
    item.classList.toggle("active", index === currentLevelIndex);
  });
}

function updateMeters() {
  oxygenBar.style.width = `${meters.oxygen}%`;
  commsBar.style.width = `${meters.comms}%`;
  tempBar.style.width = `${meters.temp}%`;
}

function showOverlay(message, duration = 1400) {
  levelState.overlayMessage = message;
  levelState.overlayTimer = duration;
  overlayEl.textContent = message;
  overlayEl.classList.add("active");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function handleMovement(dt) {
  if (currentLevelIndex === 2) {
    return;
  }
  let vx = 0;
  let vy = 0;
  if (keys.has("ArrowUp") || keys.has("w")) vy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) vy += 1;
  if (keys.has("ArrowLeft") || keys.has("a")) vx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) vx += 1;

  const magnitude = Math.hypot(vx, vy) || 1;
  vx /= magnitude;
  vy /= magnitude;

  const speed = currentLevelIndex === 0 ? player.speed * 0.75 : player.speed;
  player.x += vx * speed * dt;
  player.y += vy * speed * dt;

  player.x = clamp(player.x, 40, canvas.width - 40);
  player.y = clamp(player.y, 60, canvas.height - 40);

  if (currentLevelIndex === 0) {
    const poolBounds = { x: 160, y: 90, w: 640, h: 360 };
    player.x = clamp(player.x, poolBounds.x + 20, poolBounds.x + poolBounds.w - 20);
    player.y = clamp(player.y, poolBounds.y + 20, poolBounds.y + poolBounds.h - 20);
  }
}

function interact() {
  const level = levels[currentLevelIndex];
  if (currentLevelIndex === 0) {
    const remaining = level.items.filter((item) => !item.collected);
    const nearby = remaining.find((item) => distance(player, item) < 26);
    if (nearby) {
      nearby.collected = true;
      levelState.collected += 1;
      meters.oxygen = clamp(meters.oxygen - 2, 65, 100);
      updateMeters();
      updateHud(`Recovered: ${nearby.label}.`);
      if (levelState.collected === level.items.length) {
        showOverlay("Training complete! Proceed to the facility tour.");
        setTimeout(() => setLevel(1), 1400);
      }
    }
  }

  if (currentLevelIndex === 1) {
    const npc = level.npcs.find((person) => distance(player, person) < 40);
    if (npc && !levelState.visited.has(npc.name)) {
      levelState.visited.add(npc.name);
      updateHud(`${npc.name}: ${npc.detail}`);
      meters.comms = clamp(meters.comms - 3, 75, 100);
      updateMeters();
      if (levelState.visited.size === level.npcs.length) {
        showOverlay("Briefings complete. Take your seat in the shuttle.");
        setTimeout(() => setLevel(2), 1500);
      }
    }
  }

  if (currentLevelIndex === 2) {
    if (levelState.launchPhase === "idle") {
      const checklistItem = level.checklistItems.find(
        (item) => !levelState.checklist.has(item)
      );
      if (checklistItem) {
        levelState.checklist.add(checklistItem);
        updateHud(`Checklist: ${checklistItem} confirmed.`);
        meters.temp = clamp(meters.temp + 4, 60, 90);
        updateMeters();
        if (levelState.checklist.size === level.checklistItems.length) {
          updateHud("Checklist complete. Press Space to start countdown.");
        }
      } else {
        levelState.countdown = 10;
        levelState.launchPhase = "countdown";
        showOverlay("Countdown initiated");
      }
    }
  }

  if (currentLevelIndex === 3) {
    const spot = levels[3].flagSpot;
    if (!levelState.flagPlanted && distance(player, spot) < 40) {
      levelState.flagPlanted = true;
      showOverlay("Flag planted. Congratulations, astronaut!");
      updateHud("Mission accomplished. Return for debrief.");
    }
  }
}

function updateCountdown(dt) {
  if (currentLevelIndex !== 2 || levelState.launchPhase !== "countdown") return;
  levelState.countdownTimer += dt;
  if (levelState.countdownTimer >= 1) {
    levelState.countdownTimer = 0;
    levelState.countdown -= 1;
    if (levelState.countdown <= 0) {
      levelState.launchPhase = "complete";
      updateHud("Liftoff! Engines at full thrust. Lunar transfer initiated.");
      showOverlay("Liftoff!", 1000);
      setTimeout(() => setLevel(3), 1800);
    }
  }
}

function updateOverlay(dt) {
  if (levelState.overlayTimer <= 0) return;
  levelState.overlayTimer -= dt * 1000;
  if (levelState.overlayTimer <= 0) {
    overlayEl.classList.remove("active");
  }
}

function drawPlayer() {
  ctx.fillStyle = player.suitColor;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.visorColor;
  ctx.beginPath();
  ctx.arc(player.x + 4, player.y - 2, player.radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(59, 207, 146, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y + 2, player.radius + 6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLevel1() {
  ctx.fillStyle = "#0a1118";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1d2a38";
  ctx.fillRect(120, 60, 720, 420);

  ctx.strokeStyle = "#4aa4ff";
  ctx.lineWidth = 4;
  ctx.strokeRect(120, 60, 720, 420);

  ctx.fillStyle = "rgba(59, 207, 146, 0.15)";
  ctx.fillRect(160, 90, 640, 360);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.arc(200 + i * 60, 120 + (i % 4) * 40, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  const level = levels[0];
  level.items.forEach((item) => {
    if (item.collected) return;
    ctx.fillStyle = "#f9fafc";
    ctx.fillRect(item.x - 8, item.y - 8, 16, 16);
    ctx.fillStyle = "#4aa4ff";
    ctx.fillRect(item.x - 4, item.y - 4, 8, 8);
  });

  ctx.fillStyle = "#8b6b4e";
  ctx.fillRect(140, 500, 680, 16);
  ctx.fillStyle = "#c7cdd5";
  ctx.fillText("Neutral Buoyancy Lab", 20, 30);
}

function drawLevel2() {
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1a2028";
  ctx.fillRect(60, 80, 840, 360);

  ctx.fillStyle = "#8b6b4e";
  ctx.fillRect(60, 80, 840, 50);
  ctx.fillStyle = "#c7cdd5";
  ctx.fillText("Launch Facility", 70, 70);

  ctx.fillStyle = "rgba(74, 164, 255, 0.15)";
  ctx.fillRect(100, 160, 220, 200);
  ctx.fillRect(360, 140, 200, 220);
  ctx.fillRect(600, 120, 200, 240);

  const level = levels[1];
  level.npcs.forEach((npc) => {
    ctx.fillStyle = levelState.visited.has(npc.name) ? "#3bcf92" : "#4aa4ff";
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f9fafc";
    ctx.fillText(npc.name, npc.x - 36, npc.y - 22);
  });

  ctx.fillStyle = "#c7cdd5";
  ctx.fillText("Meet the mission team", 640, 420);
}

function drawLevel3() {
  ctx.fillStyle = "#0c1118";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1b2633";
  ctx.fillRect(80, 60, 800, 420);

  ctx.strokeStyle = "#4aa4ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 60, 800, 420);

  ctx.fillStyle = "#0e2a4d";
  ctx.fillRect(120, 100, 720, 220);

  ctx.fillStyle = "#4aa4ff";
  ctx.fillRect(130, 110, 700, 200);

  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(120, 340, 720, 100);

  ctx.fillStyle = "#c7cdd5";
  ctx.fillText("Pilot Seat View", 120, 40);

  if (levelState.launchPhase === "countdown") {
    ctx.fillStyle = "#f9fafc";
    ctx.font = "48px 'Segoe UI', sans-serif";
    ctx.fillText(`T-${levelState.countdown}`, 430, 300);
  } else if (levelState.launchPhase === "complete") {
    ctx.fillStyle = "#3bcf92";
    ctx.font = "36px 'Segoe UI', sans-serif";
    ctx.fillText("Launch success", 370, 300);
  } else {
    ctx.fillStyle = "#f9fafc";
    ctx.font = "24px 'Segoe UI', sans-serif";
    ctx.fillText("Press Space to confirm checklist", 270, 290);
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText(
      "Once complete, press Space again to start countdown",
      220,
      320
    );
  }

  ctx.font = "16px 'Segoe UI', sans-serif";
}

function drawLevel4() {
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1a1f24";
  ctx.fillRect(0, 280, canvas.width, 260);

  ctx.fillStyle = "#c7cdd5";
  for (let i = 0; i < 40; i += 1) {
    ctx.beginPath();
    ctx.arc(30 + i * 24, 420 + (i % 3) * 18, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#3bcf92";
  ctx.fillText("Lunar Landing Zone", 40, 40);

  ctx.fillStyle = "#2c2f36";
  ctx.fillRect(540, 240, 120, 80);
  ctx.fillStyle = "#8b6b4e";
  ctx.fillRect(560, 310, 80, 20);

  const spot = levels[3].flagSpot;
  if (levelState.flagPlanted) {
    ctx.fillStyle = "#f9fafc";
    ctx.fillRect(spot.x - 2, spot.y - 50, 4, 80);
    ctx.fillStyle = "#d14b4b";
    ctx.fillRect(spot.x + 2, spot.y - 50, 40, 24);
    ctx.fillStyle = "#1f4aa8";
    ctx.fillRect(spot.x + 2, spot.y - 50, 16, 12);
  } else {
    ctx.strokeStyle = "#4aa4ff";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f9fafc";
    ctx.fillText("Plant flag", spot.x - 28, spot.y - 26);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "16px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#c7cdd5";

  if (currentLevelIndex === 0) drawLevel1();
  if (currentLevelIndex === 1) drawLevel2();
  if (currentLevelIndex === 2) drawLevel3();
  if (currentLevelIndex === 3) drawLevel4();

  if (currentLevelIndex !== 2) {
    drawPlayer();
  }
}

function update(timestamp) {
  const dt = (timestamp - lastTime) / 1000 || 0;
  lastTime = timestamp;

  handleMovement(dt);
  updateCountdown(dt);
  updateOverlay(dt);
  draw();

  requestAnimationFrame(update);
}

function resetGame() {
  meters.oxygen = 92;
  meters.comms = 100;
  meters.temp = 70;
  updateMeters();
  setLevel(0);
  updateHud("Training reset. Recover the lost gear.");
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (event.key === " ") {
    event.preventDefault();
    interact();
  }
  if (event.key.toLowerCase() === "r") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

updateMeters();
setLevel(0);
requestAnimationFrame(update);
