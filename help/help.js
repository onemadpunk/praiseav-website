// Search the help (from search-index.js, so it works offline too) and the contents menu on phones.
(() => {
  const input = document.getElementById('search');
  const list = document.getElementById('results');
  const index = window.HELP_INDEX || [];
  let active = -1;

  const words = (q) => q.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const escape = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const mark = (t, ws) => escape(t).replace(new RegExp(`(${ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), '<mark>$1</mark>');

  function search(q) {
    const ws = words(q);
    if (!ws.length) return [];
    return index
      .map((e) => {
        const page = e.page.toLowerCase();
        const heading = e.heading.toLowerCase();
        const text = e.text.toLowerCase();
        let score = 0;
        for (const w of ws) {
          const inText = text.includes(w);
          if (!inText && !page.includes(w) && !heading.includes(w)) return null; // every word must appear
          if (heading.includes(w)) score += 6;
          if (page.includes(w)) score += 4;
          if (inText) score += 1 + Math.min(4, text.split(w).length - 1) * 0.5;
        }
        return { e, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ e }) => {
        const text = e.text;
        const at = Math.max(0, text.toLowerCase().indexOf(ws[0]) - 60);
        const snippet = (at ? '…' : '') + text.slice(at, at + 160) + '…';
        return { e, snippet: e.summary || snippet, ws };
      });
  }

  function show() {
    const found = search(input.value);
    active = -1;
    if (!input.value.trim()) {
      list.hidden = true;
      return;
    }
    list.innerHTML = found.length
      ? found
          .map(
            ({ e, snippet, ws }) =>
              `<li><a href="${e.url}"><span class="r-title">${mark(e.heading || e.page, ws)}</span>${
                e.heading ? ` <span class="r-where">in ${escape(e.page)}</span>` : ''
              }<span class="r-snip">${mark(snippet, ws)}</span></a></li>`
          )
          .join('')
      : '<li class="r-none">Nothing found. Try fewer or different words.</li>';
    list.hidden = false;
  }

  input?.addEventListener('input', show);
  input?.addEventListener('keydown', (e) => {
    const links = [...list.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(0, Math.min(links.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
      links.forEach((l, i) => l.classList.toggle('active', i === active));
    } else if (e.key === 'Enter' && links.length) {
      location.href = links[Math.max(active, 0)].getAttribute('href');
    } else if (e.key === 'Escape') {
      input.value = '';
      list.hidden = true;
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) list.hidden = true;
  });
  // "/" or Ctrl+F jumps to the search box.
  document.addEventListener('keydown', (e) => {
    if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'f')) && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
  // Opened with ?q=… (the app's Help search): search straight away.
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    input.value = q;
    show();
    input.focus();
  }
  document.getElementById('menu')?.addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
})();
