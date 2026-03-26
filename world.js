// ── Cluster position ──
function clXY(cat) {
  const c = CATS[cat];
  const rad = c.angle * (Math.PI / 180) - Math.PI / 2;
  return { x: CAT_R * Math.cos(rad), y: CAT_R * Math.sin(rad) };
}

// ── Build all cards in world ──
function buildWorld() {
  worldEl.querySelectorAll('.card,.clabel').forEach(e => e.remove());
  titleEl.style.left = '0px';
  titleEl.style.top  = '0px';
  if (!LINKS.length) return;

  const now    = Date.now();
  const maxAge = Math.max(...LINKS.map(l => now - l.ts), 1);
  const bycat  = {};
  LINKS.forEach(l => { (bycat[l.category] || (bycat[l.category] = [])).push(l); });

  CAT_KEYS.forEach(cat => {
    const items = bycat[cat] || [];
    if (!items.length) return;
    const cc = CATS[cat] || { color: '#888' };
    const { x: clx, y: cly } = clXY(cat);

    // cluster label
    const lbl = document.createElement('div');
    lbl.className = 'clabel';
    lbl.style.cssText = `left:${clx}px;top:${cly - SUB_R - CARD_H/2 - 16}px`;
    lbl.textContent = cat;
    worldEl.appendChild(lbl);
    setTimeout(() => lbl.style.opacity = '1', 350);

    const sorted = [...items].sort((a, b) => b.ts - a.ts);
    const n = sorted.length;

    sorted.forEach((lk, i) => {
      const d   = Math.pow(Math.max(0, (now - lk.ts) / maxAge), .65);
      const scl = 1 - d * .3;
      const sw  = Math.round(CARD_W * scl);
      const sh  = Math.round(CARD_H * scl);
      const op  = 1 - d * .45;
      const zi  = Math.round(100 - d * 80);

      let cx, cy;
      if (n === 1) { cx = clx; cy = cly; }
      else {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r   = SUB_R * (.7 + n * .09);
        cx = clx + r * Math.cos(ang);
        cy = cly + r * Math.sin(ang);
      }
      const px = cx - sw / 2;
      const py = cy - sh / 2;

      const el = document.createElement('div');
      el.className = 'card';
      el.id = 'c' + lk.id;
      el.dataset.cat   = cat;
      el.dataset.depth = d;
      el.dataset.cx    = cx;
      el.dataset.cy    = cy;
      el.dataset.px    = px;
      el.dataset.py    = py;
      el.dataset.sw    = sw;
      el.dataset.sh    = sh;
      el.style.cssText = `left:${px}px;top:${py}px;width:${sw}px;min-height:${sh}px;opacity:${op};z-index:${zi}`;

      const tfs        = Math.round(14 - d * 2);
      const avatarHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:${lk.user_color};font-size:7px;font-weight:700;color:#000;margin-right:4px;flex-shrink:0">${(lk.user_name || '?')[0]}</span>`;
      const deleteBtn  = `<span class="cdel" onclick="event.stopPropagation();deleteLink(${lk.id})"><span class="cdel-icon">✕</span>삭제</span>`;

      el.innerHTML = `<div class="ci">
        <div class="c-top">
          <span class="src-pill ${SRC_CLS[lk.source] || 'sp-web'}">${SRC_LBL[lk.source] || 'WEB'}</span>
          <div class="ctitle" style="font-size:${tfs}px">${lk.title}</div>
        </div>
        <div class="cdetail">
          <div class="c-detail-inner">
            <div class="csummary">${lk.summary}</div>
          </div>
        </div>
        <div class="clink-row">
          <span class="clink" onclick="event.stopPropagation();window.open('${lk.url}','_blank')">원문 읽기 →</span>
          ${deleteBtn}
        </div>
        <hr class="cdiv">
        <div class="c-foot">
          <div class="ccat">
            <div class="cpip" style="background:${cc.color}"></div>
            <span>${cat}</span>
          </div>
          <div style="display:flex;align-items:center;gap:3px">
            ${avatarHtml}
            <span class="cdom">${lk.user_name || lk.domain}</span>
          </div>
        </div>
      </div>`;

      el.addEventListener('click', e => { if (moved) return; e.stopPropagation(); openCard(lk.id); });
      worldEl.appendChild(el);
    });
  });
}

// ── Open / close card ──
function openCard(id) {
  if (openId === id) { closeCard(); return; }
  if (openId) closeCard(false);
  openId = id;
  const el = document.getElementById('c' + id);
  if (!el) return;
  const cx = parseFloat(el.dataset.cx);
  const cy = parseFloat(el.dataset.cy);
  el.classList.add('open');
  el.style.zIndex  = '900';
  el.style.opacity = '1';
  el.style.width   = CARD_W + 'px';
  el.style.height  = 'auto';
  el.style.left    = (cx - CARD_W / 2) + 'px';
  el.style.top     = (cy - CARD_H / 2) + 'px';
  const ts = Math.max(camS, .82);
  cam(W/2 - cx*ts, H/2 - cy*ts - 14, ts, 460);
}

function closeCard() {
  if (!openId) return;
  const el = document.getElementById('c' + openId);
  if (el) {
    el.classList.remove('open');
    const d = parseFloat(el.dataset.depth);
    el.style.width     = el.dataset.sw + 'px';
    el.style.minHeight = el.dataset.sh + 'px';
    el.style.height    = '';
    el.style.left      = el.dataset.px + 'px';
    el.style.top       = el.dataset.py + 'px';
    el.style.opacity   = 1 - d * .45;
    el.style.zIndex    = Math.round(100 - d * 80);
  }
  openId = null;
}

// ── Recommend bar ──
function buildRec() {
  const container = document.getElementById('rec-list');
  container.innerHTML = '';
  if (!LINKS.length) return;
  const picks = []; const seen = new Set();
  const bycat = {};
  LINKS.forEach(l => { (bycat[l.category] || (bycat[l.category] = [])).push(l); });
  const topCat = Object.entries(bycat).sort((a, b) => b[1].length - a[1].length)[0];
  if (topCat) { const o = [...topCat[1]].sort((a, b) => a.ts - b.ts)[0]; if (o && !seen.has(o.id)) { picks.push(o); seen.add(o.id); } }
  const old  = [...LINKS].sort((a, b) => a.ts - b.ts).find(l => !seen.has(l.id));
  if (old)  { picks.push(old);  seen.add(old.id); }
  const diff = LINKS.find(l => !seen.has(l.id) && l.category !== picks[0]?.category);
  if (diff) picks.push(diff);
  picks.forEach(lk => {
    const cc  = CATS[lk.category] || { color: '#888' };
    const div = document.createElement('div');
    div.className = 'rc';
    div.innerHTML = `<div class="rc-cat"><div class="rc-pip" style="background:${cc.color}"></div>${lk.category}</div>
      <div class="rc-title">${lk.title}</div>`;
    div.onclick = () => {
      const el = document.getElementById('c' + lk.id);
      if (!el) return;
      const cx = parseFloat(el.dataset.cx), cy = parseFloat(el.dataset.cy);
      cam(W/2 - cx*Math.max(camS,.9), H/2 - cy*Math.max(camS,.9) - 14, Math.max(camS,.9), 520);
      setTimeout(() => openCard(lk.id), 320);
    };
    container.appendChild(div);
  });
}

function dismissRec() {
  const b = document.getElementById('rec-bar');
  b.style.transition = 'opacity .3s,transform .3s';
  b.style.opacity    = '0';
  b.style.transform  = 'translateX(-50%) translateY(16px)';
  setTimeout(() => b.style.display = 'none', 320);
}

// ── Category legend ──
function buildLeg() {
  legEl.innerHTML = '';
  CAT_KEYS.forEach(name => {
    const c   = CATS[name];
    const cnt = LINKS.filter(l => l.category === name).length;
    if (!cnt) return;
    const el = document.createElement('div');
    el.className = 'li' + (activeCat === name ? ' on' : '');
    el.innerHTML = `<div class="ld" style="background:${c.color}"></div><span>${name}</span><span style="margin-left:3px;opacity:.2">${cnt}</span>`;
    el.onclick = () => {
      activeCat = activeCat === name ? null : name;
      applyFilter(); buildLeg();
      if (activeCat) {
        const { x, y } = clXY(activeCat);
        cam(W/2 - x*Math.max(camS,.85), H/2 - y*Math.max(camS,.85), Math.max(camS,.85), 520);
      }
    };
    legEl.appendChild(el);
  });
}

function applyFilter() {
  worldEl.querySelectorAll('.card').forEach(el => {
    const show = !activeCat || el.dataset.cat === activeCat;
    const d    = parseFloat(el.dataset.depth);
    el.style.opacity       = show ? (1 - d * .45).toString() : '0.03';
    el.style.pointerEvents = show ? 'auto' : 'none';
  });
}
