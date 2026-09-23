// ─── Flappy Kiro ────────────────────────────────────────────────────────────
// A Flappy Bird clone starring Ghosty the ghost.
// Controls: Spacebar (or tap/click) to flap.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  "use strict";

  // ── Canvas setup ──────────────────────────────────────────────────────────
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const CANVAS_W = 810;
  const CANVAS_H = 600;
  const FOOTER_H = 48; // score bar at the bottom
  const PLAY_H = CANVAS_H - FOOTER_H; // playfield height

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // ── Game constants ────────────────────────────────────────────────────────
  const GRAVITY = 0.45;
  const FLAP_VELOCITY = -8.5;
  const PIPE_SPEED = 3.2;
  const PIPE_WIDTH = 72;
  const PIPE_GAP = 165;          // vertical gap between top/bottom pipe
  const PIPE_INTERVAL = 240;     // pixels between pipe pairs
  const GHOST_X = 140;           // fixed horizontal position
  const GHOST_W = 44;
  const GHOST_H = 52;
  const GROUND_Y = PLAY_H;       // y coordinate of the ground line
  const MIN_PIPE_TOP = 60;       // minimum height for the top pipe
  const MAX_PIPE_TOP = PLAY_H - PIPE_GAP - 60; // max top pipe height

  // ── Colours matching the example UI ───────────────────────────────────────
  const SKY_TOP = "#7ec8d8";
  const SKY_BTM = "#a8dce8";
  const PIPE_BODY = "#3a9a3a";
  const PIPE_DARK = "#2d7a2d";
  const PIPE_LIGHT = "#55c255";
  const PIPE_CAP_COLOR = "#2e8c2e";
  const FOOTER_BG = "#3a3a4a";
  const CLOUD_COLOR = "rgba(255,255,255,0.82)";
  const SKETCH_COLOR = "rgba(60,80,100,0.07)";

  // ── Assets ────────────────────────────────────────────────────────────────
  const ghostImg = new Image();
  ghostImg.src = "assets/ghosty.png";

  const jumpSound = new Audio("assets/jump.wav");
  const gameOverSound = new Audio("assets/game_over.wav");
  jumpSound.volume = 0.55;
  gameOverSound.volume = 0.7;

  function playSound(snd) {
    try {
      snd.currentTime = 0;
      snd.play().catch(() => {});
    } catch (_) {}
  }

  // ── Game state ────────────────────────────────────────────────────────────
  let state; // "idle" | "playing" | "dead"
  let ghostY, ghostVY;
  let pipes;
  let score, highScore;
  let frameCount;
  let clouds;
  let sketchLines;
  let deathTimer;

  function initGame() {
    state = "idle";
    ghostY = PLAY_H / 2 - GHOST_H / 2;
    ghostVY = 0;
    pipes = [];
    score = 0;
    highScore = parseInt(localStorage.getItem("flappyKiroHigh") || "0", 10);
    frameCount = 0;
    deathTimer = 0;
    generateClouds();
    generateSketch();
  }

  // ── Background decoration ─────────────────────────────────────────────────
  function generateClouds() {
    clouds = [];
    for (let i = 0; i < 7; i++) {
      clouds.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * (PLAY_H - 80) + 30,
        w: 80 + Math.random() * 80,
        h: 38 + Math.random() * 28,
        speed: 0.3 + Math.random() * 0.4,
      });
    }
  }

  function generateSketch() {
    // Random pencil-sketch strokes for the hand-drawn background look
    sketchLines = [];
    for (let i = 0; i < 160; i++) {
      sketchLines.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * PLAY_H,
        len: 10 + Math.random() * 50,
        angle: Math.random() * Math.PI,
        width: 0.5 + Math.random() * 1.5,
      });
    }
  }

  // ── Pipe helpers ───────────────────────────────────────────────────────────
  function spawnPipe(x) {
    const topH = MIN_PIPE_TOP + Math.random() * (MAX_PIPE_TOP - MIN_PIPE_TOP);
    pipes.push({
      x,
      topH,
      bottomY: topH + PIPE_GAP,
      scored: false,
    });
  }

  // ── Update logic ──────────────────────────────────────────────────────────
  function update() {
    frameCount++;

    // Scroll clouds
    clouds.forEach((c) => {
      c.x -= c.speed;
      if (c.x + c.w < 0) {
        c.x = CANVAS_W + 10;
        c.y = Math.random() * (PLAY_H - 80) + 30;
      }
    });

    if (state !== "playing") {
      if (state === "idle") {
        // Gentle bob while waiting
        ghostY = PLAY_H / 2 - GHOST_H / 2 + Math.sin(frameCount * 0.05) * 8;
      }
      return;
    }

    // Spawn pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < CANVAS_W - PIPE_INTERVAL) {
      spawnPipe(CANVAS_W + PIPE_WIDTH);
    }

    // Move pipes
    pipes.forEach((p) => (p.x -= PIPE_SPEED));
    // Remove off-screen pipes
    pipes = pipes.filter((p) => p.x + PIPE_WIDTH > -10);

    // Score
    pipes.forEach((p) => {
      if (!p.scored && p.x + PIPE_WIDTH < GHOST_X) {
        p.scored = true;
        score++;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("flappyKiroHigh", highScore);
        }
      }
    });

    // Ghost physics
    ghostVY += GRAVITY;
    ghostY += ghostVY;

    // Clamp to ground
    if (ghostY + GHOST_H >= GROUND_Y) {
      ghostY = GROUND_Y - GHOST_H;
      die();
      return;
    }

    // Clamp to ceiling
    if (ghostY < 0) {
      ghostY = 0;
      ghostVY = 0;
    }

    // Collision with pipes
    const gLeft = GHOST_X + 4;
    const gRight = GHOST_X + GHOST_W - 4;
    const gTop = ghostY + 4;
    const gBottom = ghostY + GHOST_H - 4;

    for (const p of pipes) {
      const pLeft = p.x;
      const pRight = p.x + PIPE_WIDTH;
      if (gRight > pLeft && gLeft < pRight) {
        if (gTop < p.topH || gBottom > p.bottomY) {
          die();
          return;
        }
      }
    }
  }

  function die() {
    if (state === "dead") return;
    state = "dead";
    deathTimer = 0;
    playSound(gameOverSound);
  }

  function flap() {
    if (state === "dead") {
      // Wait a moment before allowing restart
      if (deathTimer > 40) {
        initGame();
        state = "playing";
      }
      return;
    }
    if (state === "idle") {
      state = "playing";
      ghostVY = FLAP_VELOCITY;
      playSound(jumpSound);
      return;
    }
    ghostVY = FLAP_VELOCITY;
    playSound(jumpSound);
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, PLAY_H);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(1, SKY_BTM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, PLAY_H);

    // Sketch texture strokes
    ctx.save();
    sketchLines.forEach((l) => {
      ctx.beginPath();
      ctx.strokeStyle = SKETCH_COLOR;
      ctx.lineWidth = l.width;
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(
        l.x + Math.cos(l.angle) * l.len,
        l.y + Math.sin(l.angle) * l.len
      );
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawClouds() {
    clouds.forEach((c) => {
      ctx.save();
      ctx.fillStyle = CLOUD_COLOR;
      // Draw a rounded-rectangle cloud shape
      roundRect(ctx, c.x, c.y, c.w, c.h, c.h * 0.42);
      ctx.fill();
      ctx.restore();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPipe(pipe) {
    const capW = PIPE_WIDTH + 10;
    const capH = 22;
    const capX = pipe.x - 5;

    // ── Top pipe ──
    // Body
    const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    topGrad.addColorStop(0, PIPE_DARK);
    topGrad.addColorStop(0.3, PIPE_LIGHT);
    topGrad.addColorStop(1, PIPE_DARK);
    ctx.fillStyle = topGrad;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH - capH);

    // Cap
    const capGradTop = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGradTop.addColorStop(0, PIPE_DARK);
    capGradTop.addColorStop(0.3, PIPE_BODY);
    capGradTop.addColorStop(1, PIPE_DARK);
    ctx.fillStyle = capGradTop;
    ctx.fillRect(capX, pipe.topH - capH, capW, capH);

    // Cap highlight line
    ctx.fillStyle = PIPE_CAP_COLOR;
    ctx.fillRect(capX, pipe.topH - capH, capW, 3);

    // ── Bottom pipe ──
    const bottomH = PLAY_H - pipe.bottomY;

    // Cap
    const capGradBot = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGradBot.addColorStop(0, PIPE_DARK);
    capGradBot.addColorStop(0.3, PIPE_BODY);
    capGradBot.addColorStop(1, PIPE_DARK);
    ctx.fillStyle = capGradBot;
    ctx.fillRect(capX, pipe.bottomY, capW, capH);

    // Cap highlight line
    ctx.fillStyle = PIPE_CAP_COLOR;
    ctx.fillRect(capX, pipe.bottomY + capH - 3, capW, 3);

    // Body
    const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
    botGrad.addColorStop(0, PIPE_DARK);
    botGrad.addColorStop(0.3, PIPE_LIGHT);
    botGrad.addColorStop(1, PIPE_DARK);
    ctx.fillStyle = botGrad;
    ctx.fillRect(pipe.x, pipe.bottomY + capH, PIPE_WIDTH, bottomH - capH);
  }

  function drawGhost() {
    const rotation = Math.max(-0.4, Math.min(0.6, ghostVY * 0.045));

    ctx.save();
    ctx.translate(GHOST_X + GHOST_W / 2, ghostY + GHOST_H / 2);
    ctx.rotate(rotation);

    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      ctx.drawImage(ghostImg, -GHOST_W / 2, -GHOST_H / 2, GHOST_W, GHOST_H);
    } else {
      // Fallback ghost shape
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, -GHOST_H * 0.1, GHOST_W * 0.48, Math.PI, 0, false);
      ctx.lineTo(GHOST_W * 0.48, GHOST_H * 0.4);
      ctx.quadraticCurveTo(GHOST_W * 0.3, GHOST_H * 0.25, 0, GHOST_H * 0.4);
      ctx.quadraticCurveTo(-GHOST_W * 0.3, GHOST_H * 0.25, -GHOST_W * 0.48, GHOST_H * 0.4);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.ellipse(-8, -4, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, -4, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFooter() {
    ctx.fillStyle = FOOTER_BG;
    ctx.fillRect(0, PLAY_H, CANVAS_W, FOOTER_H);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `Score: ${score} | High: ${highScore}`,
      CANVAS_W / 2,
      PLAY_H + FOOTER_H / 2
    );
  }

  function drawIdleScreen() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, CANVAS_W, PLAY_H);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Flappy Kiro", CANVAS_W / 2, PLAY_H / 2 - 56);

    ctx.font = "22px Arial, sans-serif";
    ctx.fillStyle = "#e0f0ff";
    ctx.fillText("Press Space or tap to start", CANVAS_W / 2, PLAY_H / 2 + 4);

    ctx.font = "16px Arial, sans-serif";
    ctx.fillStyle = "#b0d8f0";
    ctx.fillText("Navigate Ghosty through the pipes!", CANVAS_W / 2, PLAY_H / 2 + 38);
    ctx.restore();
  }

  function drawDeadScreen() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, CANVAS_W, PLAY_H);

    ctx.fillStyle = "#ff6060";
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Game Over!", CANVAS_W / 2, PLAY_H / 2 - 52);

    ctx.font = "26px Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Score: ${score}`, CANVAS_W / 2, PLAY_H / 2 + 4);

    if (deathTimer > 40) {
      ctx.font = "20px Arial, sans-serif";
      ctx.fillStyle = "#e0f0ff";
      ctx.fillText("Press Space or tap to play again", CANVAS_W / 2, PLAY_H / 2 + 46);
    }
    ctx.restore();
  }

  // ── Main render loop ──────────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    drawBackground();
    drawClouds();
    pipes.forEach(drawPipe);
    drawGhost();
    drawFooter();

    if (state === "idle") drawIdleScreen();
    if (state === "dead") {
      deathTimer++;
      drawDeadScreen();
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      flap();
    }
  });

  canvas.addEventListener("click", () => flap());
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    flap();
  }, { passive: false });

  // ── Start ─────────────────────────────────────────────────────────────────
  initGame();
  loop();
})();
