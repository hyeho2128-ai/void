// ── Global state ──
const wrap    = document.getElementById('wrap');
const worldEl = document.getElementById('world');
const cv      = document.getElementById('bg');
const titleEl = document.getElementById('center-title');
const zlbl    = document.getElementById('zlbl');
const legEl   = document.getElementById('leg');

let ctx, W = 0, H = 0, T = 0;
let camX = 0, camY = 0, camS = 1;
let isDrag = false, moved = false, dsx = 0, dsy = 0, dcx = 0, dcy = 0;
let openId = null, activeCat = null;
let LINKS = [];

// ── User identity ──
let userName = localStorage.getItem('void_username') || '';
if (!userName) {
  userName = '익명_' + Math.random().toString(36).slice(2, 6).toUpperCase();
  localStorage.setItem('void_username', userName);
}
let userColor = localStorage.getItem('void_usercolor');
if (!userColor) {
  userColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  localStorage.setItem('void_usercolor', userColor);
}

// ── Helpers ──
function detectSource(url) {
  try {
    const h = new URL(url).hostname;
    if (/youtube\.com|youtu\.be/.test(h)) return 'youtube';
    if (/instagram\.com/.test(h))         return 'instagram';
    if (/twitter\.com|x\.com/.test(h))    return 'twitter';
  } catch (e) {}
  return 'web';
}
function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return url; }
}
function showStatus(msg, dur = 2500) {
  const el = document.getElementById('add-status');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), dur);
}

// ── Camera ──
function cam(x, y, s, dur = 0) {
  camX = x; camY = y; camS = s;
  worldEl.style.transition = dur ? `transform ${dur}ms cubic-bezier(.22,1,.36,1)` : 'none';
  worldEl.style.transform  = `translate(${x}px,${y}px) scale(${s})`;
  zlbl.textContent = Math.round(s * 100) + '%';
}
const clampS = s => Math.max(.12, Math.min(5, s));

function introFly() {
  worldEl.style.transition = 'none';
  cam(W/2, H/2, 2.6, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => cam(W/2, H/2, .55, 1100)));
}

// ── Add link ──
async function addLink() {
  const input = document.getElementById('url-input');
  const btn   = document.getElementById('add-btn');
  let url = input.value.trim();
  if (!url) return;
  if (!url.startsWith('http')) url = 'https://' + url;

  btn.disabled = true; btn.textContent = '분석 중...';
  showStatus('정보를 가져오는 중이에요...', 30000);

  // CORS 우회 프록시로 og 메타 가져오기
  let metaTitle = '', metaDesc = '';
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  try {
    const r    = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
    const json = await r.json();
    const doc  = new DOMParser().parseFromString(json.contents, 'text/html');
    const og   = s => doc.querySelector(s)?.getAttribute('content') || '';
    metaTitle  = og('meta[property="og:title"]')       || doc.querySelector('title')?.textContent?.trim() || '';
    metaDesc   = og('meta[property="og:description"]') || og('meta[name="description"]') || '';
  } catch (e) {}

  // URL에서 기본 정보 추출 (프록시 실패시 폴백)
  const domain = getDomain(url);
  if (!metaTitle) {
    // URL 경로에서 제목 추측
    try {
      const path = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
      metaTitle = path.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '') || domain;
    } catch(e) { metaTitle = domain; }
  }

  let pageInfo = `URL: ${url}\n도메인: ${domain}\n플랫폼: ${detectSource(url)}`;
  if (metaTitle) pageInfo += `\n제목: ${metaTitle}`;
  if (metaDesc)  pageInfo += `\n설명: ${metaDesc}`;

  let info = {
    title:    metaTitle || domain,
    summary:  metaDesc  || '',
    category: '기타',
  };

  // Claude AI 분류
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:     `링크 분류 전문가. JSON만 반환. 카테고리는 반드시: 커리어, AI·기술, 창업·비즈니스, 마인드셋, 디자인·프로덕트, 기타 중 하나.\n형식: {"title":"...(35자 이내)","summary":"...(70자 이내)","category":"..."}`,
        messages:   [{ role: 'user', content: pageInfo }],
      }),
    });
    const data = await res.json();
    let raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    // AI 결과가 있으면 덮어쓰되, 없으면 메타 정보 유지
    info = {
      title:    parsed.title    || info.title,
      summary:  parsed.summary  || info.summary,
      category: parsed.category || '기타',
    };
  } catch (e) {}

  // Supabase 저장
  const error = await saveLink({
    url,
    title:      info.title,
    summary:    info.summary,
    category:   info.category,
    source:     detectSource(url),
    domain:     domain,
    ts:         Date.now(),
    user_name:  userName,
    user_color: userColor,
  });

  if (error) showStatus('저장 실패 — ' + error.message);
  else { showStatus('✓ 저장됐어요'); input.value = ''; }

  btn.disabled = false; btn.textContent = '추가';
}

// ── Nickname tag ──
function renderNameTag() {
  let tag = document.getElementById('name-tag');
  if (!tag) {
    tag = document.createElement('span');
    tag.id = 'name-tag';
    tag.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);white-space:nowrap;cursor:pointer;padding:2px 4px;border-radius:4px;transition:color .15s;flex-shrink:0';
    tag.title = '클릭해서 닉네임 변경';
    document.getElementById('add-inner').insertBefore(tag, document.getElementById('add-btn'));
    tag.onclick = () => {
      const n = prompt('닉네임을 입력하세요', userName);
      if (n && n.trim()) { userName = n.trim(); localStorage.setItem('void_username', userName); renderNameTag(); }
    };
  }
  tag.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${userColor};margin-right:4px;vertical-align:middle"></span>${userName}`;
}

// ── Drag ──
wrap.addEventListener('mousedown', e => {
  if (e.target.closest('.card,.li,.hb,#add-bar,#rec-bar')) return;
  isDrag = true; moved = false;
  dsx = e.clientX; dsy = e.clientY; dcx = camX; dcy = camY;
  wrap.classList.add('drag');
  if (openId) closeCard();
});
window.addEventListener('mousemove', e => {
  if (!isDrag) return;
  const dx = e.clientX - dsx, dy = e.clientY - dsy;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  cam(dcx + dx, dcy + dy, camS, 0);
});
window.addEventListener('mouseup', () => { isDrag = false; wrap.classList.remove('drag'); setTimeout(() => moved = false, 60); });

// ── Wheel zoom ──
wrap.addEventListener('wheel', e => {
  e.preventDefault();
  const r  = wrap.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const ns = clampS(camS * (1 - e.deltaY * .001));
  cam(mx - (mx - camX) * (ns / camS), my - (my - camY) * (ns / camS), ns, 0);
}, { passive: false });

// ── Touch ──
let lD = 0, tB = { x: 0, y: 0, s: 1, px: 0, py: 0 };
wrap.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 2) {
    const [a, b] = [e.touches[0], e.touches[1]];
    lD = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const r = wrap.getBoundingClientRect();
    tB = { x: camX, y: camY, s: camS, px: (a.clientX+b.clientX)/2-r.left, py: (a.clientY+b.clientY)/2-r.top };
  } else {
    const t = e.touches[0];
    dsx = t.clientX; dsy = t.clientY; dcx = camX; dcy = camY;
    isDrag = true; moved = false;
    if (openId) closeCard();
  }
}, { passive: false });
wrap.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 2) {
    const [a, b] = [e.touches[0], e.touches[1]];
    const d  = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const ns = clampS(tB.s * (d / lD));
    cam(tB.px - (tB.px - tB.x) * (ns / tB.s), tB.py - (tB.py - tB.y) * (ns / tB.s), ns, 0);
  } else if (isDrag) {
    const t = e.touches[0];
    const dx = t.clientX - dsx, dy = t.clientY - dsy;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    cam(dcx + dx, dcy + dy, camS, 0);
  }
}, { passive: false });
wrap.addEventListener('touchend', () => { isDrag = false; lD = 0; setTimeout(() => moved = false, 60); });

// ── HUD buttons ──
document.getElementById('bp').onclick = () => { const c = W/2, d = H/2; cam(c-(c-camX)*1.25, d-(d-camY)*1.25, clampS(camS*1.25), 360); };
document.getElementById('bm').onclick = () => { const c = W/2, d = H/2; cam(c-(c-camX)*.8,   d-(d-camY)*.8,   clampS(camS*.8),   360); };
document.getElementById('bf').onclick = () => { activeCat = null; applyFilter(); buildLeg(); if (openId) closeCard(); introFly(); };

// ── Init ──
initBg();
makeStars();
renderNameTag();
document.getElementById('url-input').addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
loadLinks().then(() => subscribeRealtime());
setTimeout(introFly, 80);
drawBg();
