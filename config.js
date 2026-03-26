// ── Supabase ──
const SUPA_URL = 'https://caqeygcbjrsokpvbqjgh.supabase.co';
const SUPA_KEY = 'sb_publishable_VGszEQPNCsg0LCHBqGsg8w_ql4C5mII';
const ANTHROPIC_KEY = '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';

// ── Categories ──
const CATS = {
  '커리어':         { color: '#e2e8f0', angle: 0   },
  'AI·기술':        { color: '#a78bfa', angle: 72  },
  '창업·비즈니스':  { color: '#38bdf8', angle: 144 },
  '마인드셋':       { color: '#f472b6', angle: 216 },
  '디자인·프로덕트':{ color: '#34d399', angle: 288 },
  '기타':           { color: '#888',    angle: 324 },
};
const CAT_KEYS = Object.keys(CATS);

// ── Source labels ──
const SRC_LBL = { web: 'WEB', youtube: 'YT', instagram: 'IG', twitter: 'X' };
const SRC_CLS = { web: 'sp-web', youtube: 'sp-yt', instagram: 'sp-ig', twitter: 'sp-tw' };

// ── Card layout ──
const CARD_W  = 192;
const CARD_H  = 130;
const CAT_R   = 300;
const SUB_R   = 92;

// ── User colors ──
const USER_COLORS = ['#58a6ff','#a78bfa','#34d399','#f472b6','#38bdf8','#fbbf24','#fb7185'];
