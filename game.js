// =============================================
//  BASE SNAKE — game.js
//  Full game logic + crypto coin rendering
// =============================================

(function () {
  'use strict';

  // ---- Canvas setup ----
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  const pCanvas = document.getElementById('particleCanvas');
  const pCtx   = pCanvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCoinCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  // ---- Game constants ----
  const TILE  = 24;
  const COLS  = 25;
  const ROWS  = 25;

  canvas.width  = COLS * TILE;
  canvas.height = ROWS * TILE;

  function resizeParticleCanvas() {
    pCanvas.width  = window.innerWidth;
    pCanvas.height = window.innerHeight;
  }
  resizeParticleCanvas();
  window.addEventListener('resize', resizeParticleCanvas);

  // ---- Crypto coins definition ----
  const COINS = [
    { name: 'BTC',  symbol: '₿',  color: '#F7931A', bg: '#1A0F00', glow: '#F7931A' },
    { name: 'ETH',  symbol: 'Ξ',  color: '#627EEA', bg: '#0A0F25', glow: '#627EEA' },
    { name: 'SOL',  symbol: 'S',   color: '#9945FF', bg: '#12002A', glow: '#9945FF' },
    { name: 'BASE', symbol: 'B',   color: '#0052FF', bg: '#000A1A', glow: '#0052FF' },
    { name: 'DOGE', symbol: 'Ð',  color: '#C2A633', bg: '#1A1400', glow: '#C2A633' },
    { name: 'MATIC',symbol: 'P',   color: '#8247E5', bg: '#0F001F', glow: '#8247E5' },
    { name: 'LINK', symbol: '⬡',  color: '#2A5ADA', bg: '#00051A', glow: '#2A5ADA' },
    { name: 'AVAX', symbol: 'A',   color: '#E84142', bg: '#1A0000', glow: '#E84142' },
    { name: 'UNI',  symbol: '🦄', color: '#FF007A', bg: '#1A0010', glow: '#FF007A' },
    { name: 'XRP',  symbol: 'X',   color: '#00AAE4', bg: '#00101A', glow: '#00AAE4' },
    { name: 'ADA',  symbol: '₳',  color: '#0033AD', bg: '#000514', glow: '#0033AD' },
    { name: 'DOT',  symbol: '●',  color: '#E6007A', bg: '#1A0010', glow: '#E6007A' },
  ];

  // ---- State ----
  let snake, dir, nextDir, food, nextFood, score, highScore, level, coinsEaten;
  let gameState = 'idle'; // idle | running | paused | dead
  let speed, speedTimer, particles = [];
  let eatenHistory = [];
  let coinsPerLevel = 5;
  let coinsThisLevel = 0;

  highScore = parseInt(localStorage.getItem('baseSnakeHigh') || '0');
  document.getElementById('highScore').textContent = highScore;

  // ---- Init game ----
  function initGame() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    snake = [
      { x: midX,   y: midY },
      { x: midX-1, y: midY },
      { x: midX-2, y: midY },
    ];
    dir     = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score   = 0;
    level   = 1;
    coinsEaten = 0;
    coinsThisLevel = 0;
    speed   = 160;
    eatenHistory = [];
    particles = [];
    food     = spawnFood();
    nextFood = getRandomCoin();
    updateUI();
    drawNextCoin(nextFood);
    document.getElementById('eatenList').innerHTML = '';
  }

  function getRandomCoin() {
    return COINS[Math.floor(Math.random() * COINS.length)];
  }

  function spawnFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return { ...pos, coin: getRandomCoin() };
  }

  // ---- Game loop ----
  let lastTime = 0;
  let accumulator = 0;

  function loop(timestamp) {
    if (gameState !== 'running') return;
    requestAnimationFrame(loop);

    const dt = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += dt;

    if (accumulator >= speed) {
      accumulator -= speed;
      update();
    }
    draw();
    updateParticles();
  }

  function update() {
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      triggerDeath(); return;
    }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      triggerDeath(); return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
      const coinVal = getCoinValue(food.coin);
      score += coinVal;
      coinsEaten++;
      coinsThisLevel++;
      eatenHistory.push(food.coin.name);
      addEatenTag(food.coin);
      spawnParticles(food.x * TILE + TILE/2, food.y * TILE + TILE/2, food.coin.color);
      food = { ...spawnFoodPos(), coin: nextFood };
      nextFood = getRandomCoin();
      drawNextCoin(nextFood);

      // Level up
      if (coinsThisLevel >= coinsPerLevel) {
        coinsThisLevel = 0;
        level++;
        speed = Math.max(60, speed - 15);
        showLevelToast(level);
      }
      updateUI();
    } else {
      snake.pop();
    }
  }

  function spawnFoodPos() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function getCoinValue(coin) {
    const values = { BTC: 50, ETH: 30, SOL: 20, BASE: 25, DOGE: 5, MATIC: 15, LINK: 20, AVAX: 25, UNI: 20, XRP: 10, ADA: 10, DOT: 15 };
    return values[coin.name] || 10;
  }

  function triggerDeath() {
    gameState = 'dead';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('baseSnakeHigh', highScore);
    }
    // Death particles
    snake.forEach((seg, i) => {
      setTimeout(() => {
        spawnParticles(seg.x * TILE + TILE/2, seg.y * TILE + TILE/2, '#0052FF', 6);
      }, i * 20);
    });
    setTimeout(showGameOver, 600);
  }

  // ---- Draw ----
  const CORNER_RADIUS = 4;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawFood();
    drawSnake();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(0,82,255,0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(canvas.width, y * TILE);
      ctx.stroke();
    }
  }

  function drawSnake() {
    const len = snake.length;
    snake.forEach((seg, i) => {
      const t = i / len;
      const alpha = 1 - t * 0.3;
      const px = seg.x * TILE + 1;
      const py = seg.y * TILE + 1;
      const sz = TILE - 2;

      if (i === 0) {
        // Head — glowing blue
        ctx.save();
        ctx.shadowColor = '#00AAFF';
        ctx.shadowBlur  = 18;
        const grad = ctx.createLinearGradient(px, py, px + sz, py + sz);
        grad.addColorStop(0, '#1A6FFF');
        grad.addColorStop(1, '#0040CC');
        ctx.fillStyle = grad;
        roundRect(ctx, px, py, sz, sz, CORNER_RADIUS + 2);
        ctx.fill();
        ctx.restore();

        // Eyes
        drawEyes(seg);
      } else {
        // Body segment
        ctx.save();
        ctx.globalAlpha = alpha;
        const bodyGrad = ctx.createLinearGradient(px, py, px+sz, py+sz);
        const brightness = Math.floor(40 + (1-t) * 50);
        bodyGrad.addColorStop(0, `hsl(220, 90%, ${brightness}%)`);
        bodyGrad.addColorStop(1, `hsl(220, 80%, ${brightness - 12}%)`);
        ctx.fillStyle = bodyGrad;
        roundRect(ctx, px, py, sz, sz, CORNER_RADIUS);
        ctx.fill();

        // Chain link detail on body
        if (sz > 10) {
          ctx.strokeStyle = `rgba(0,100,255,${0.4 * alpha})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 4, py + 4, sz - 8, sz - 8);
        }
        ctx.restore();
      }
    });
  }

  function drawEyes(seg) {
    const px = seg.x * TILE;
    const py = seg.y * TILE;
    const eyeSize = 4;
    const eyeOffset = 6;

    let e1, e2;
    if (dir.x === 1)  { e1 = {x: px+14, y: py+5}; e2 = {x: px+14, y: py+13}; }
    else if (dir.x === -1) { e1 = {x: px+4, y: py+5}; e2 = {x: px+4, y: py+13}; }
    else if (dir.y === -1) { e1 = {x: px+5, y: py+4}; e2 = {x: px+13, y: py+4}; }
    else                   { e1 = {x: px+5, y: py+14}; e2 = {x: px+13, y: py+14}; }

    ctx.fillStyle = '#00EEFF';
    ctx.shadowColor = '#00EEFF';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(e1.x, e1.y, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2.x, e2.y, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Food animation time
  let foodAnim = 0;

  function drawFood() {
    foodAnim += 0.05;
    const fx = food.x * TILE;
    const fy = food.y * TILE;
    const pulse = Math.sin(foodAnim) * 2;
    const coin = food.coin;
    const size = TILE - 4 + pulse;
    const offset = (TILE - size) / 2;

    ctx.save();
    ctx.shadowColor = coin.glow;
    ctx.shadowBlur  = 16 + Math.sin(foodAnim) * 8;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(fx + TILE/2, fy + TILE/2, size/2 + 3, 0, Math.PI*2);
    ctx.strokeStyle = coin.color + '40';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Coin circle
    const grad = ctx.createRadialGradient(fx+TILE/2-2, fy+TILE/2-2, 1, fx+TILE/2, fy+TILE/2, size/2);
    grad.addColorStop(0, lightenColor(coin.color, 40));
    grad.addColorStop(1, coin.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx + TILE/2, fy + TILE/2, size/2, 0, Math.PI*2);
    ctx.fill();

    // Symbol
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(9, Math.floor(size*0.45))}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(coin.symbol, fx + TILE/2, fy + TILE/2 + 0.5);
    ctx.restore();
  }

  function drawNextCoin(coin) {
    nextCtx.clearRect(0, 0, 80, 80);
    const cx = 40, cy = 40, r = 30;

    nextCtx.save();
    nextCtx.shadowColor = coin.glow;
    nextCtx.shadowBlur  = 14;

    const grad = nextCtx.createRadialGradient(cx-4, cy-4, 2, cx, cy, r);
    grad.addColorStop(0, lightenColor(coin.color, 40));
    grad.addColorStop(1, coin.color);
    nextCtx.fillStyle = grad;
    nextCtx.beginPath();
    nextCtx.arc(cx, cy, r, 0, Math.PI*2);
    nextCtx.fill();

    nextCtx.fillStyle = '#fff';
    nextCtx.font = 'bold 20px Space Grotesk, sans-serif';
    nextCtx.textAlign = 'center';
    nextCtx.textBaseline = 'middle';
    nextCtx.shadowColor = 'rgba(0,0,0,0.4)';
    nextCtx.shadowBlur = 3;
    nextCtx.fillText(coin.symbol, cx, cy + 1);
    nextCtx.restore();

    document.getElementById('nextCoinName').textContent = coin.name;
  }

  // ---- Particles ----
  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: x + canvas.getBoundingClientRect().left,
        y: y + canvas.getBoundingClientRect().top,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 4,
        color,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  function updateParticles() {
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.1;
      p.alpha -= p.decay;
      pCtx.save();
      pCtx.globalAlpha = Math.max(0, p.alpha);
      pCtx.fillStyle = p.color;
      pCtx.shadowColor = p.color;
      pCtx.shadowBlur = 6;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      pCtx.fill();
      pCtx.restore();
    });
  }

  // ---- UI helpers ----
  function updateUI() {
    document.getElementById('headerScore').textContent = score;
    document.getElementById('highScore').textContent   = highScore;
    document.getElementById('levelDisplay').textContent = level;
    document.getElementById('coinsEaten').textContent  = coinsEaten;

    // Score flash
    const sv = document.getElementById('headerScore');
    sv.classList.remove('score-flash');
    void sv.offsetWidth;
    sv.classList.add('score-flash');

    // Level progress
    const pct = Math.min(100, (coinsThisLevel / coinsPerLevel) * 100);
    document.getElementById('levelProgress').style.width = pct + '%';
    document.getElementById('progressText').textContent = `${coinsThisLevel} / ${coinsPerLevel}`;
  }

  function addEatenTag(coin) {
    const list = document.getElementById('eatenList');
    const tag = document.createElement('div');
    tag.className = 'eaten-tag';
    tag.textContent = coin.name;
    tag.style.borderColor = coin.color + '60';
    tag.style.color = coin.color;
    list.appendChild(tag);
    if (list.children.length > 20) list.removeChild(list.firstChild);
    list.scrollTop = list.scrollHeight;
  }

  function showLevelToast(lvl) {
    let toast = document.querySelector('.level-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'level-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = `⚡ LEVEL ${lvl} — SPEED UP!`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ---- Overlay helpers ----
  function showOverlay(id) {
    document.getElementById('startOverlay').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  function showGameOver() {
    document.getElementById('finalScore').textContent    = score;
    document.getElementById('finalHighScore').textContent = highScore;
    document.getElementById('finalCoins').textContent    = coinsEaten;
    document.getElementById('finalLevel').textContent    = level;
    showOverlay('gameOverOverlay');
  }

  // ---- Input handling ----
  const DIR_MAP = {
    ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown:  { x: 0, y: 1  }, s: { x: 0, y: 1  }, S: { x: 0, y: 1  },
    ArrowLeft:  { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0  }, d: { x: 1, y: 0  }, D: { x: 1, y: 0  },
  };

  document.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Escape') {
      handlePause();
      return;
    }
    const d = DIR_MAP[e.key];
    if (!d) return;
    e.preventDefault();
    if (gameState !== 'running') return;
    // Prevent 180-degree turn
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  });

  function handlePause() {
    if (gameState === 'running') {
      gameState = 'paused';
      showOverlay('pauseOverlay');
    } else if (gameState === 'paused') {
      gameState = 'running';
      showOverlay(null);
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  // Buttons
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', handlePause);
  document.getElementById('restartBtn').addEventListener('click', startGame);

  // Mobile D-pad
  document.getElementById('upBtn').addEventListener('click', () => setDir(0, -1));
  document.getElementById('downBtn').addEventListener('click', () => setDir(0, 1));
  document.getElementById('leftBtn').addEventListener('click', () => setDir(-1, 0));
  document.getElementById('rightBtn').addEventListener('click', () => setDir(1, 0));
  document.getElementById('pauseBtn2').addEventListener('click', handlePause);

  function setDir(x, y) {
    if (gameState !== 'running') return;
    if (x === -dir.x && y === -dir.y) return;
    nextDir = { x, y };
  }

  // Touch swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? 1 : -1, 0);
    } else {
      setDir(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  }, { passive: true });

  function startGame() {
    initGame();
    showOverlay(null);
    gameState = 'running';
    lastTime = performance.now();
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  // ---- Utilities ----
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

  function lightenColor(hex, amount) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.min(255, r+amount)},${Math.min(255, g+amount)},${Math.min(255, b+amount)})`;
  }

  // ---- Initial idle draw ----
  function drawIdle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Draw a decorative snake path
    const demoPath = [];
    for (let i = 0; i < 12; i++) demoPath.push({ x: 12 - i, y: 12 });
    demoPath.forEach((seg, i) => {
      const t = i / demoPath.length;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.5;
      ctx.fillStyle = `hsl(220, 90%, ${60 - t*20}%)`;
      ctx.shadowColor = '#0052FF';
      ctx.shadowBlur = i === 0 ? 16 : 0;
      roundRect(ctx, seg.x*TILE+1, seg.y*TILE+1, TILE-2, TILE-2, 4);
      ctx.fill();
      ctx.restore();
    });
  }
  drawIdle();

  // Init high score display
  document.getElementById('highScore').textContent = highScore;

})();
