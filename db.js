// ── Supabase client ──
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── Load all links ──
async function loadLinks() {
  showStatus('우주를 불러오는 중...', 10000);
  const { data, error } = await sb.from('links').select('*').order('ts', { ascending: false }).limit(200);
  if (error) { showStatus('연결 실패 — DB를 확인해주세요'); console.error(error); return; }
  LINKS = data.map(r => ({
    id:         r.id,
    url:        r.url,
    title:      r.title || r.domain,
    summary:    r.summary || '',
    category:   r.category || '기타',
    source:     r.source || 'web',
    domain:     r.domain || getDomain(r.url),
    ts:         r.ts || new Date(r.created_at).getTime(),
    user_name:  r.user_name || '익명',
    user_color: r.user_color || '#888',
  }));
  buildWorld(); buildLeg(); buildRec();
  showStatus(`✓ ${LINKS.length}개 링크 로드됨`);
}

// ── Realtime — new card appears instantly ──
function subscribeRealtime() {
  sb.channel('public:links')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'links' }, payload => {
      const r = payload.new;
      if (LINKS.find(l => l.id === r.id)) return;
      const newLink = {
        id:         r.id,
        url:        r.url,
        title:      r.title || r.domain || '링크',
        summary:    r.summary || '',
        category:   r.category || '기타',
        source:     r.source || 'web',
        domain:     r.domain || getDomain(r.url || ''),
        ts:         r.ts || new Date(r.created_at).getTime(),
        user_name:  r.user_name || '익명',
        user_color: r.user_color || '#888',
      };
      LINKS.unshift(newLink);
      buildWorld(); buildLeg(); buildRec();
      if (newLink.user_name !== userName) {
        showStatus(`✦ ${newLink.user_name}님이 링크를 추가했어요`);
      }
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') console.log('realtime connected ✓');
    });
}

// ── Save new link ──
async function saveLink(linkData) {
  const { error } = await sb.from('links').insert(linkData);
  return error;
}

// ── Delete link ──
async function deleteLink(id) {
  if (!confirm('이 링크를 삭제할까요?')) return;
  const { error } = await sb.from('links').delete().eq('id', id);
  if (error) { showStatus('삭제 실패 — ' + error.message); return; }
  LINKS = LINKS.filter(l => l.id !== id);
  closeCard();
  buildWorld(); buildLeg(); buildRec();
  showStatus('삭제됐어요');
}
