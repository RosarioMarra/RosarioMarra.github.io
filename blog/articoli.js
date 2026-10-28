// Elenco automatico degli articoli.
// Legge i file .html presenti nella cartella /blog della repository GitHub
// (esclusi quelli che iniziano con "_", come il modello) e ricava da ogni pagina
// titolo, descrizione, data, categoria e minuti di lettura dai suoi meta tag.
// Basta caricare un nuovo articolo in /blog perché compaia in home e in blog.html.
(() => {
  const REPO = 'RosarioMarra/RosarioMarra.github.io';
  const BRANCH = 'main';
  const DIR = 'blog';
  const CACHE = 'articoli-v1';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const meta = a => [fmt(a.data), a.minuti && a.minuti + ' min'].filter(Boolean).join(' · ');

  async function leggi(nome) {
    const html = await (await fetch(`${DIR}/${nome}`)).text();
    const d = new DOMParser().parseFromString(html, 'text/html');
    const m = sel => d.querySelector(sel)?.getAttribute('content') || '';
    return {
      url: `${DIR}/${nome}`,
      titolo: m('meta[property="og:title"]') || d.title,
      descrizione: m('meta[property="og:description"]') || m('meta[name="description"]'),
      data: m('meta[property="article:published_time"]'),
      categoria: m('meta[property="article:section"]') || 'Articolo',
      minuti: m('meta[name="reading-time"]'),
    };
  }

  async function load() {
    try { const c = sessionStorage.getItem(CACHE); if (c) return JSON.parse(c); } catch (e) {}
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}?ref=${BRANCH}`);
    if (!r.ok) throw new Error('Elenco non disponibile');
    const nomi = (await r.json())
      .filter(f => f.type === 'file' && f.name.endsWith('.html') && !f.name.startsWith('_'))
      .map(f => f.name);
    const list = (await Promise.all(nomi.map(n => leggi(n).catch(() => null))))
      .filter(Boolean)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    try { sessionStorage.setItem(CACHE, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  // Sostituisce gli articoli scritti nella pagina solo se l'elenco automatico è disponibile:
  // se GitHub non risponde restano visibili quelli già presenti nell'HTML.
  async function render(el, template, limit) {
    if (!el) return [];
    try {
      const list = await load();
      if (!list.length) return [];
      el.innerHTML = list.slice(0, limit || list.length).map(template).join('');
      return list;
    } catch (e) { return []; }
  }

  window.Articoli = { load, render, esc, fmt, meta };
})();
