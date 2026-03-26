const ST = [];

function initBg() {
  W = wrap.offsetWidth;
  H = wrap.offsetHeight;
  cv.width = W;
  cv.height = H;
  ctx = cv.getContext('2d');
}

function makeStars() {
  ST.length = 0;
  // 1. tiny distant stars
  for (let i = 0; i < 220; i++) ST.push({ x: Math.random()*W, y: Math.random()*H, r: .18+Math.random()*.55,  b: .18+Math.random()*.25, ph: Math.random()*Math.PI*2, sp: .06+Math.random()*.28, tw: true });
  // 2. medium stars
  for (let i = 0; i < 80;  i++) ST.push({ x: Math.random()*W, y: Math.random()*H, r: .5+Math.random()*.75,   b: .38+Math.random()*.38, ph: Math.random()*Math.PI*2, sp: .1+Math.random()*.35,  tw: true });
  // 3. bright foreground
  for (let i = 0; i < 30;  i++) ST.push({ x: Math.random()*W, y: Math.random()*H, r: .9+Math.random()*.9,    b: .6+Math.random()*.38,  ph: Math.random()*Math.PI*2, sp: .12+Math.random()*.4,  tw: true });
  // 4. fixed anchor stars
  for (let i = 0; i < 14;  i++) ST.push({ x: Math.random()*W, y: Math.random()*H, r: 1.2+Math.random()*1.3, b: .72+Math.random()*.28, ph: 0, sp: 0, tw: false });
}

function drawBg() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.016)';
  for (let x = 20; x < W; x += 38)
    for (let y = 20; y < H; y += 38) {
      ctx.beginPath(); ctx.arc(x, y, .85, 0, Math.PI*2); ctx.fill();
    }

  // stars
  ST.forEach(s => {
    const tw = s.tw ? (Math.sin(T * s.sp + s.ph) + 1) / 2 : 1;
    const a  = s.b * (.5 + tw * .5);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    if (s.r > 1.1) {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      g.addColorStop(0, `rgba(210,225,255,${a * .28})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI*2); ctx.fill();
    }
  });

  T += .006;
  requestAnimationFrame(drawBg);
}
