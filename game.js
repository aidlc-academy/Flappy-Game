// ─── Canvas Setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const W = canvas.width;   // 480
const H = canvas.height;  // 640

// ─── Game Constants ───────────────────────────────────────────────────────────
const GRAVITY        = 0.45;
const FLAP_STRENGTH  = -8.5;
const WALL_SPEED     = 3;
const WALL_WIDTH     = 70;
const GAP_HEIGHT     = 160;
const WALL_INTERVAL  = 220;   // px between wall pairs
const GROUND_HEIGHT  = 60;
const GHOSTY_X       = 110;
const GHOSTY_SIZE    = 44;

// ─── Colour Palette ───────────────────────────────────────────────────────────
const COLORS = {
  skyTop:     '#0f0c29',
  skyBot:     '#302b63',
  ground:     '#2d1b69',
  groundLine: '#6a3fa0',
  wallTop:    '#7c3aed',
  wallShine:  '#a78bfa',
  wallShadow: '#4c1d95',
  wallBorder: '#c4b5fd',
  scoreText:  '#ffffff',
  ghostBody:  'rgba(230, 220, 255, 0.92)',
  ghostGlow:  'rgba(180, 140, 255, 0.35)',
  ghostEye:   '#6d28d9',
  ghostPupil: '#1e1b4b',
};

// ─── Stars (background decoration) ───────────────────────────────────────────
const STARS = Array.from({ length: 80 }, () => ({
  x:  Math.random() * W,
  y:  Math.random() * (H - GROUND_HEIGHT - 40),
  r:  Math.random() * 1.5 + 0.3,
  a:  Math.random(),           // base alpha
  da: (Math.random() * 0.01 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
}));

// ─── Game State ───────────────────────────────────────────────────────────────
// STATE: 'start' | 'playing' | 'dead' | 'gameover'
let state, ghosty, walls, score, hiScore, frameCount, deathTimer, bgOffset;

function initGame() {
  state     = 'start';
  hiScore   = hiScore || 0;
  bgOffset  = 0;
  frameCount = 0;
  deathTimer = 0;
  score     = 0;
  walls     = [];

  ghosty = {
    x:  GHOSTY_X,
    y:  H / 2 - 40,
    vy: 0,
    angle: 0,           // tilt in radians
    wobble: 0,          // tail wobble counter
    alive: true,
    flashTimer: 0,
  };

  // Seed first few walls off-screen
  for (let i = 0; i < 4; i++) {
    spawnWall(W + 60 + i * WALL_INTERVAL);
  }
}

// ─── Wall Factory ─────────────────────────────────────────────────────────────
function spawnWall(x) {
  const minTop = 60;
  const maxTop = H - GROUND_HEIGHT - GAP_HEIGHT - 60;
  const gapY   = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
  walls.push({ x, gapY, scored: false });
}

// ─── Input ────────────────────────────────────────────────────────────────────
function flap() {
  if (state === 'start') {
    state = 'playing';
    ghosty.vy = FLAP_STRENGTH;
    return;
  }
  if (state === 'playing' && ghosty.alive) {
    ghosty.vy = FLAP_STRENGTH;
  }
  if (state === 'gameover') {
    initGame();
    state = 'start';
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });

// ─── Update Logic ─────────────────────────────────────────────────────────────
function update() {
  frameCount++;

  // Twinkle stars
  STARS.forEach(s => {
    s.a += s.da;
    if (s.a > 1 || s.a < 0.1) s.da *= -1;
  });

  if (state === 'start') return;

  if (state === 'dead') {
    deathTimer++;
    // Let Ghosty fall to ground before showing game-over screen
    ghosty.vy += GRAVITY * 1.5;
    ghosty.y  += ghosty.vy;
    ghosty.angle = Math.min(ghosty.angle + 0.08, Math.PI / 2);

    if (ghosty.y >= H - GROUND_HEIGHT - GHOSTY_SIZE / 2 || deathTimer > 80) {
      ghosty.y = Math.min(ghosty.y, H - GROUND_HEIGHT - GHOSTY_SIZE / 2);
      state = 'gameover';
    }
    return;
  }

  if (state === 'gameover') return;

  // ── Ghosty physics ──
  ghosty.vy    += GRAVITY;
  ghosty.y     += ghosty.vy;
  ghosty.wobble = (ghosty.wobble + 0.15) % (Math.PI * 2);

  // Tilt: nose up on flap, nose down on fall
  const targetAngle = ghosty.vy < 0
    ? -0.4
    : Math.min((ghosty.vy / 10) * 1.2, Math.PI / 2.5);
  ghosty.angle += (targetAngle - ghosty.angle) * 0.12;

  // ── Wall movement ──
  walls.forEach(w => w.x -= WALL_SPEED);

  // Spawn new wall when last one is far enough in
  const lastWall = walls[walls.length - 1];
  if (lastWall && lastWall.x < W - WALL_INTERVAL) {
    spawnWall(W + WALL_WIDTH);
  }

  // Remove walls that have left the screen
  walls = walls.filter(w => w.x + WALL_WIDTH > 0);

  // ── Scoring ──
  walls.forEach(w => {
    if (!w.scored && w.x + WALL_WIDTH < GHOSTY_X) {
      w.scored = true;
      score++;
      if (score > hiScore) hiScore = score;
    }
  });

  // ── Collision detection ──
  const gx = ghosty.x;
  const gy = ghosty.y;
  const r  = GHOSTY_SIZE / 2 - 6; // slight forgiveness radius

  // Ground / ceiling
  if (gy + r >= H - GROUND_HEIGHT || gy - r <= 0) {
    killGhosty();
    return;
  }

  // Walls
  for (const w of walls) {
    const wallLeft  = w.x;
    const wallRight = w.x + WALL_WIDTH;
    const topBase   = w.gapY;
    const botTop    = w.gapY + GAP_HEIGHT;

    if (gx + r > wallLeft && gx - r < wallRight) {
      if (gy - r < topBase || gy + r > botTop) {
        killGhosty();
        return;
      }
    }
  }
}

function killGhosty() {
  ghosty.alive     = false;
  ghosty.flashTimer = 12;
  state            = 'dead';
  deathTimer       = 0;
}

// ─── Draw Helpers ─────────────────────────────────────────────────────────────

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(1, COLORS.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  STARS.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
    ctx.fill();
  });
}

function drawGround() {
  // Ground block
  const gy = H - GROUND_HEIGHT;
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, gy, W, GROUND_HEIGHT);

  // Top highlight line
  ctx.fillStyle = COLORS.groundLine;
  ctx.fillRect(0, gy, W, 4);

  // Scrolling tile marks
  bgOffset = (bgOffset - WALL_SPEED * 0.5 + 80) % 80;
  ctx.fillStyle = 'rgba(108, 63, 160, 0.4)';
  for (let x = bgOffset - 80; x < W; x += 80) {
    ctx.fillRect(x, gy + 10, 2, GROUND_HEIGHT - 10);
  }
}

function drawWall(w) {
  const topH   = w.gapY;
  const botY   = w.gapY + GAP_HEIGHT;
  const botH   = H - GROUND_HEIGHT - botY;

  const drawPillar = (x, y, ww, hh, capOnBottom) => {
    if (hh <= 0) return;

    // Main body
    const g = ctx.createLinearGradient(x, 0, x + ww, 0);
    g.addColorStop(0,   COLORS.wallShadow);
    g.addColorStop(0.3, COLORS.wallTop);
    g.addColorStop(1,   COLORS.wallShadow);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, ww, hh);

    // Left shine
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x, y, 8, hh);

    // Border
    ctx.strokeStyle = COLORS.wallBorder;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, ww - 1.5, hh - 1.5);

    // Cap (wider nub at gap edge)
    const capH  = 22;
    const capX  = x - 6;
    const capW  = ww + 12;
    const capY  = capOnBottom ? y : y + hh - capH;

    const cg = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    cg.addColorStop(0,   COLORS.wallShadow);
    cg.addColorStop(0.3, COLORS.wallShine);
    cg.addColorStop(1,   COLORS.wallShadow);
    ctx.fillStyle = cg;
    ctx.fillRect(capX, capY, capW, capH);

    ctx.strokeStyle = COLORS.wallBorder;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(capX + 0.75, capY + 0.75, capW - 1.5, capH - 1.5);
  };

  // Top pillar — cap faces down toward gap
  drawPillar(w.x, 0, WALL_WIDTH, topH, false);
  // Bottom pillar — cap faces up toward gap
  drawPillar(w.x, botY, WALL_WIDTH, botH, true);
}

function drawGhosty() {
  const x = ghosty.x;
  const y = ghosty.y;
  const s = GHOSTY_SIZE;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ghosty.angle);

  // Glow
  const glow = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s);
  glow.addColorStop(0, COLORS.ghostGlow);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();

  // Body path — rounded top + wavy bottom "skirt"
  const hw = s / 2;
  const th = s * 0.55; // top height

  ctx.beginPath();
  ctx.arc(0, -th * 0.3, hw, Math.PI, 0); // dome top

  // Wavy bottom — 3 bumps
  const bumps  = 3;
  const bumpW  = (hw * 2) / bumps;
  const wobAmt = 4 + Math.sin(ghosty.wobble) * 2;

  for (let i = 0; i < bumps; i++) {
    const bx = hw - i * bumpW;
    ctx.quadraticCurveTo(
      bx - bumpW * 0.5, th * 0.7 + wobAmt,
      bx - bumpW,       th * 0.2
    );
  }
  ctx.closePath();

  ctx.fillStyle = COLORS.ghostBody;
  ctx.shadowColor = 'rgba(167, 139, 250, 0.7)';
  ctx.shadowBlur  = 18;
  ctx.fill();
  ctx.shadowBlur  = 0;

  // Eyes
  const eyeOffX = hw * 0.3;
  const eyeOffY = -th * 0.15;
  const eyeR    = s * 0.13;

  [-1, 1].forEach(side => {
    const ex = side * eyeOffX;
    const ey = eyeOffY;

    // White of eye
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Coloured iris
    ctx.beginPath();
    ctx.arc(ex + side * 1.5, ey + 1.5, eyeR * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ghostEye;
    ctx.fill();

    // Pupil
    ctx.beginPath();
    ctx.arc(ex + side * 1.5, ey + 1.5, eyeR * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ghostPupil;
    ctx.fill();

    // Catch-light
    ctx.beginPath();
    ctx.arc(ex + side * 0.8, ey, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  });

  ctx.restore();
}

function drawScore() {
  if (state === 'start' || state === 'gameover') return;
  ctx.save();
  ctx.font        = 'bold 42px "Segoe UI", sans-serif';
  ctx.fillStyle   = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = 'rgba(80,0,160,0.8)';
  ctx.lineWidth   = 4;
  ctx.textAlign   = 'center';
  ctx.strokeText(score, W / 2, 70);
  ctx.fillText(score, W / 2, 70);
  ctx.restore();
}

function drawStartScreen() {
  // Title
  ctx.save();
  ctx.textAlign = 'center';

  // Outer glow
  ctx.shadowColor = 'rgba(167,139,250,0.9)';
  ctx.shadowBlur  = 30;
  ctx.font        = 'bold 52px "Segoe UI", sans-serif';
  ctx.fillStyle   = '#e9d5ff';
  ctx.fillText('Flappy Kiro', W / 2, H / 2 - 80);
  ctx.shadowBlur  = 0;

  // Subtitle
  ctx.font      = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(200,180,255,0.85)';
  ctx.fillText('Guide Ghosty through the walls!', W / 2, H / 2 - 38);

  // Prompt (pulse)
  const pulse = 0.65 + 0.35 * Math.sin(frameCount * 0.07);
  ctx.font      = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
  ctx.fillText('Press SPACE or tap to start', W / 2, H / 2 + 20);

  // High score
  if (hiScore > 0) {
    ctx.font      = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(196,181,253,0.8)';
    ctx.fillText(`Best: ${hiScore}`, W / 2, H / 2 + 58);
  }

  ctx.restore();
}

function drawGameOverScreen() {
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.textAlign = 'center';

  // Panel background
  const px = W / 2 - 160;
  const py = H / 2 - 130;
  const pw = 320;
  const ph = 240;
  ctx.fillStyle   = 'rgba(20, 10, 50, 0.88)';
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
  ctx.lineWidth   = 2;
  roundRect(ctx, px, py, pw, ph, 16);
  ctx.fill();
  ctx.stroke();

  // "Game Over"
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur  = 20;
  ctx.font        = 'bold 46px "Segoe UI", sans-serif';
  ctx.fillStyle   = '#fca5a5';
  ctx.fillText('Game Over', W / 2, H / 2 - 70);
  ctx.shadowBlur  = 0;

  // Score
  ctx.font      = 'bold 28px "Segoe UI", sans-serif';
  ctx.fillStyle = '#e9d5ff';
  ctx.fillText(`Score: ${score}`, W / 2, H / 2 - 18);

  // High score
  ctx.font      = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = score >= hiScore ? '#fde68a' : 'rgba(196,181,253,0.85)';
  const hiLabel = score >= hiScore && score > 0 ? `🏆 New Best: ${hiScore}` : `Best: ${hiScore}`;
  ctx.fillText(hiLabel, W / 2, H / 2 + 22);

  // Restart prompt (pulse)
  const pulse = 0.65 + 0.35 * Math.sin(frameCount * 0.07);
  ctx.font      = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
  ctx.fillText('Press SPACE or tap to restart', W / 2, H / 2 + 70);

  ctx.restore();
}

// Utility: draw a rounded rectangle path
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

// ─── Main Game Loop ───────────────────────────────────────────────────────────
function gameLoop() {
  update();

  // Draw layers
  drawBackground();
  walls.forEach(drawWall);
  drawGround();

  // Don't draw Ghosty during death flash frames
  if (!(state === 'dead' && ghosty.flashTimer-- > 0 && Math.floor(ghosty.flashTimer / 2) % 2 === 0)) {
    drawGhosty();
  }

  drawScore();

  if (state === 'start')    drawStartScreen();
  if (state === 'gameover') drawGameOverScreen();

  requestAnimationFrame(gameLoop);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
initGame();
gameLoop();
