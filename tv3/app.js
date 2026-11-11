/* Marty TV 3 — interface para TV.
 * Escrito em JavaScript "antigo" de propósito (sem ?. ?? etc.): TV boxes
 * costumam ter um WebView desatualizado.
 * Segurança: todo texto que vem da lista passa por esc() antes de ir para o HTML. */
(function () {
  'use strict';

  // Onde o robô publica a lista atualizada. A TV baixa daqui; se falhar,
  // usa a última lista salva ou a que veio dentro do app.
  var CATALOG_URL = 'https://jezusmarty-ops.github.io/marty-tv/tv3/catalog.json';
  var CATALOG_MAX_AGE_MS = 6 * 3600 * 1000;
  var APP_VERSION = '3.0.0';

  var Native = window.NativePlayer || null;

  // ------------------------------------------------------------------ util
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? esc(u) : ''; }
  function setHTML(el, html) { el.innerHTML = html; } // html já montado com esc()
  function load(k, def) {
    try { var v = localStorage.getItem('mtv3.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function save(k, v) { try { localStorage.setItem('mtv3.' + k, JSON.stringify(v)); } catch (e) { /* cheio ou bloqueado */ } }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function tint(id) { return 'hsl(' + (hash(id) % 360) + ',55%,42%)'; }
  function initials(n) {
    var w = String(n).replace(/[^A-Za-z0-9À-ÿ ]/g, ' ').split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : (w[0] || '').charAt(1) || '')).toUpperCase();
  }
  function flag(cc) {
    if (cc === 'UK') cc = 'GB';
    if (!cc || !/^[A-Z]{2}$/.test(cc)) return '';
    try { return String.fromCodePoint(0x1f1e6 + cc.charCodeAt(0) - 65, 0x1f1e6 + cc.charCodeAt(1) - 65); } catch (e) { return ''; }
  }

  // ------------------------------------------------------------------ textos
  var T = {
    pt: {
      home: 'Início', search: 'Buscar', favs: 'Favoritos', apps: 'Mais apps', settings: 'Ajustes',
      live: 'Ao vivo', watch: 'Assistir', addFav: 'Favoritar', remFav: 'Tirar dos favoritos',
      recent: 'Continuar assistindo', seeAll: 'Ver todos', channels: 'canais', all: 'Todos',
      searchPh: 'Digite o nome do canal', searchHint: 'Use as setas e o OK para digitar',
      noResults: 'Nenhum canal encontrado', favEmpty: 'Você ainda não tem favoritos',
      favEmptyHint: 'Aperte a tecla MENU (☰) do controle em cima de um canal, ou use o botão Favoritar no início.',
      lang: 'Idioma do app', kids: 'Modo infantil', kidsD: 'Mostra só canais infantis. Para sair, pede a senha.',
      on: 'Ligado', off: 'Desligado', update: 'Atualizar lista de canais', updateD: 'Baixa a lista mais nova agora',
      about: 'Sobre', aboutD: 'Canais gratuitos e públicos. Sem canais pagos.',
      pinNew: 'Crie uma senha de 4 números', pinAgain: 'Repita a senha', pinAsk: 'Digite a senha',
      pinWrong: 'Senha errada', pinForParents: 'Ela será pedida para sair do modo infantil.',
      kidsOn: 'Modo infantil ligado', kidsOff: 'Modo infantil desligado', kidsTag: 'Modo infantil',
      exit: 'Aperte VOLTAR de novo para sair', updated: 'Lista atualizada', updateFail: 'Sem internet: usando a lista salva',
      broken: 'Fora do ar', offline: 'Canal fora do ar no momento', loading: 'Carregando canais…',
      appsTitle: 'Mais apps grátis', appsSub: 'Atalhos para apps oficiais com milhares de filmes e séries de graça',
      notInstalled: 'Instale este app pela loja da TV', opening: 'Abrindo…', del: 'Apagar', clear: 'Limpar', space: 'Espaço',
      listFrom: 'Lista de', noCatalog: 'Sem internet e sem lista salva. Conecte a TV à internet e abra de novo.',
    },
    es: {
      home: 'Inicio', search: 'Buscar', favs: 'Favoritos', apps: 'Más apps', settings: 'Ajustes',
      live: 'En vivo', watch: 'Ver ahora', addFav: 'Agregar a favoritos', remFav: 'Quitar de favoritos',
      recent: 'Seguir viendo', seeAll: 'Ver todos', channels: 'canales', all: 'Todos',
      searchPh: 'Escribe el nombre del canal', searchHint: 'Usa las flechas y OK para escribir',
      noResults: 'No se encontraron canales', favEmpty: 'Aún no tienes favoritos',
      favEmptyHint: 'Presiona la tecla MENÚ (☰) del control sobre un canal, o usa el botón Agregar a favoritos en el inicio.',
      lang: 'Idioma de la app', kids: 'Modo infantil', kidsD: 'Muestra solo canales infantiles. Para salir, pide la clave.',
      on: 'Activado', off: 'Desactivado', update: 'Actualizar lista de canales', updateD: 'Descarga la lista más nueva ahora',
      about: 'Acerca de', aboutD: 'Canales gratuitos y públicos. Sin canales de pago.',
      pinNew: 'Crea una clave de 4 números', pinAgain: 'Repite la clave', pinAsk: 'Escribe la clave',
      pinWrong: 'Clave incorrecta', pinForParents: 'Se pedirá para salir del modo infantil.',
      kidsOn: 'Modo infantil activado', kidsOff: 'Modo infantil desactivado', kidsTag: 'Modo infantil',
      exit: 'Presiona ATRÁS otra vez para salir', updated: 'Lista actualizada', updateFail: 'Sin internet: usando la lista guardada',
      broken: 'Fuera del aire', offline: 'Canal fuera del aire en este momento', loading: 'Cargando canales…',
      appsTitle: 'Más apps gratis', appsSub: 'Accesos a apps oficiales con miles de películas y series gratis',
      notInstalled: 'Instala esta app desde la tienda de la TV', opening: 'Abriendo…', del: 'Borrar', clear: 'Limpiar', space: 'Espacio',
      listFrom: 'Lista del', noCatalog: 'Sin internet y sin lista guardada. Conecta la TV a internet y abre de nuevo.',
    },
  };
  var lang = load('lang', /^es/i.test(navigator.language || '') ? 'es' : 'pt');
  function t(k) { return (T[lang] && T[lang][k]) || T.pt[k] || k; }

  var APPS = [
    { pkgs: ['tv.pluto.android'], n: 'Pluto TV', ic: '🪐', d: { pt: 'Centenas de canais de filmes, séries e novelas', es: 'Cientos de canales de películas, series y novelas' } },
    { pkgs: ['com.google.android.youtube.tv', 'com.google.android.youtube'], n: 'YouTube', ic: '▶️', d: { pt: 'Filmes completos, música e desenhos', es: 'Películas completas, música y caricaturas' } },
    { pkgs: ['com.tubitv'], n: 'Tubi', ic: '🍿', d: { pt: 'Filmes grátis com propaganda', es: 'Películas gratis con anuncios' } },
    { pkgs: ['com.plexapp.android'], n: 'Plex', ic: '🎞️', d: { pt: 'Filmes e canais grátis', es: 'Películas y canales gratis' } },
  ];

  // ------------------------------------------------------------------ estado
  var cat = null;
  var byId = {};
  var favs = load('favs', []);
  var recent = load('recent', []);
  var broken = load('broken', {}); // id -> horário em que falhou
  var kids = load('kids', false);
  var pin = load('pin', null);
  var page = { name: 'home', arg: null };
  var history = [];
  var focusEl = null;
  var lastFocusId = {};
  var gridState = null;        // { list, shown, key }
  var heroCh = null;

  var BROKEN_TTL = 12 * 3600 * 1000;
  function isBroken(id) { var b = broken[id]; return b && Date.now() - b < BROKEN_TTL; }

  function visible(ch) { return !kids || ch.s === 'infantil'; }
  function secName(s) { return s ? (s[lang] || s.pt) : ''; }
  function sec(id) { for (var i = 0; i < cat.secoes.length; i++) if (cat.secoes[i].id === id) return cat.secoes[i]; return null; }
  function countryName(cc) { return (cat.paises && cat.paises[cc]) || cc; }

  function score(ch) {
    var s = 0;
    if (ch.i) s += 4;
    if (ch.hd) s += 2;
    if (ch.part) s -= 3;
    if (isBroken(ch.id)) s -= 10;
    if (ch.l === lang) s += 1;
    if (ch.p === 'BR' || ch.p === 'PT') s += 1;
    return s;
  }
  function best(list) { return list.slice().sort(function (a, b) { return score(b) - score(a); }); }

  // ------------------------------------------------------------------ catálogo
  function setCatalog(c) {
    cat = c;
    byId = {};
    for (var i = 0; i < c.canais.length; i++) byId[c.canais[i].id] = c.canais[i];
  }
  var fetchCbs = {}, fetchSeq = 0;
  // resposta do download feito pelo Android (Native.fetchText)
  window.martyFetchDone = function (id, ok, text) {
    var cb = fetchCbs[id];
    delete fetchCbs[id];
    if (cb) cb(ok, text);
  };
  function parseCatalog(text) {
    var c = JSON.parse(text);
    if (!c || !c.canais || c.canais.length < 50) throw new Error('lista inválida');
    return c;
  }
  function fetchCatalog(timeoutMs) {
    if (Native && Native.fetchText) {
      return new Promise(function (res, rej) {
        var id = 'f' + (++fetchSeq);
        var timer = setTimeout(function () { delete fetchCbs[id]; rej(new Error('tempo')); }, (timeoutMs || 10000) + 15000);
        fetchCbs[id] = function (ok, text) {
          clearTimeout(timer);
          if (!ok) { rej(new Error('rede')); return; }
          try { res(parseCatalog(text)); } catch (e) { rej(e); }
        };
        Native.fetchText(CATALOG_URL + '?t=' + Date.now(), id);
      });
    }
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('GET', CATALOG_URL + '?t=' + Date.now());
      x.timeout = timeoutMs || 10000;
      x.onload = function () {
        try {
          if (x.status !== 200) throw new Error('HTTP ' + x.status);
          var c = JSON.parse(x.responseText);
          if (!c || !c.canais || c.canais.length < 50) throw new Error('lista inválida');
          res(c);
        } catch (e) { rej(e); }
      };
      x.onerror = x.ontimeout = function () { rej(new Error('rede')); };
      x.send();
    });
  }
  function storeCatalog(c) {
    try { localStorage.setItem('mtv3.catalog', JSON.stringify(c)); save('catalogAt', Date.now()); } catch (e) { /* sem espaço */ }
  }
  function initCatalog() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('mtv3.catalog') || 'null'); } catch (e) { cached = null; }
    var bundled = window.BUNDLED_CATALOG || null;
    var base = cached;
    if (bundled && (!base || bundled.gerado > base.gerado)) base = bundled;
    if (base) setCatalog(base);
    var age = Date.now() - load('catalogAt', 0);
    if (!base || age > CATALOG_MAX_AGE_MS) {
      return fetchCatalog(base ? 10000 : 15000).then(function (c) {
        storeCatalog(c);
        if (!base || c.gerado > base.gerado) { setCatalog(c); return true; }
        return false;
      }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  // ------------------------------------------------------------------ menu lateral
  function railItems() {
    var items = [{ k: 'home', ic: '🏠', lb: t('home') }, { k: 'search', ic: '🔍', lb: t('search') }, { k: 'favs', ic: '⭐', lb: t('favs') }, { sep: 1 }];
    cat.secoes.forEach(function (s) {
      if (kids && s.id !== 'infantil') return;
      items.push({ k: 'sec:' + s.id, ic: s.icon, lb: secName(s) });
    });
    items.push({ sep: 1 });
    if (!kids) items.push({ k: 'apps', ic: '🧩', lb: t('apps') });
    items.push({ k: 'settings', ic: '⚙️', lb: t('settings') });
    return items;
  }
  function renderRail() {
    var h = '<div class="brand"><div class="brand-mark">M</div><div class="brand-name">Marty <b>TV</b></div></div>';
    railItems().forEach(function (it) {
      if (it.sep) { h += '<div class="nav-sep"></div>'; return; }
      var active = currentNavKey() === it.k ? ' active' : '';
      h += '<div class="nav f' + active + '" data-zone="rail" data-key="nav-' + esc(it.k) + '" data-go="' + esc(it.k) + '"><span class="ic">' + esc(it.ic) + '</span><span class="lb">' + esc(it.lb) + '</span></div>';
    });
    setHTML($('#rail'), h);
    var kf = $('#kids-flag');
    kf.textContent = '🧸 ' + t('kidsTag');
    kf.className = 'kids-flag' + (kids ? '' : ' hidden');
  }
  function currentNavKey() {
    if (page.name === 'section') return 'sec:' + page.arg.id;
    return page.name;
  }

  // ------------------------------------------------------------------ cartões
  function card(ch, key, idx) {
    var fav = favs.indexOf(ch.id) >= 0;
    var br = isBroken(ch.id);
    var ini = esc(initials(ch.n));
    var logo = safeUrl(ch.i);
    var thumb = logo
      ? '<img src="' + logo + '" loading="lazy" alt="" data-ini="' + ini + '" onerror="this.parentNode.innerHTML=\'<div class=ini>\'+this.getAttribute(\'data-ini\')+\'</div>\'">'
      : '<div class="ini">' + ini + '</div>';
    var badges = '';
    if (br) badges += '<span class="badge off">' + esc(t('broken')) + '</span>';
    else if (ch.hd) badges += '<span class="badge hd">HD</span>';
    return '<div class="card f' + (br ? ' broken' : '') + '" data-key="' + esc(key) + '" data-ch="' + esc(ch.id) + '"' + (idx != null ? ' data-idx="' + idx + '"' : '') + '>' +
      (fav ? '<span class="fav">⭐</span>' : '') +
      '<div class="thumb" style="--tint:' + tint(ch.id) + '">' + thumb + '</div>' +
      '<div class="meta"><div class="nm">' + esc(ch.n) + '</div>' +
      '<div class="sub"><span>' + flag(ch.p) + '</span><span>' + esc(countryName(ch.p)) + '</span>' + badges + '</div></div></div>';
  }
  function moreCard(key, label, target) {
    return '<div class="card more f" data-key="' + esc(key) + '" data-go="' + esc(target) + '"><div class="thumb"><div class="ini">' + esc(label) + ' →</div></div><div class="meta"><div class="nm">&nbsp;</div></div></div>';
  }
  function row(id, title, list, extra) {
    if (!list.length) return '';
    var h = '<section class="row"><div class="row-head"><div class="row-title">' + esc(title) + '</div>' +
      (extra && extra.count ? '<div class="row-count">' + extra.count + ' ' + esc(t('channels')) + '</div>' : '') + '</div><div class="row-track" data-row="' + esc(id) + '">';
    list.forEach(function (ch, i) { h += card(ch, id + ':' + ch.id, i); });
    if (extra && extra.more) h += moreCard(id + ':more', t('seeAll'), extra.more);
    return h + '</div></section>';
  }

  // ------------------------------------------------------------------ páginas
  function pageHome() {
    var all = cat.canais.filter(visible);
    if (!heroCh || !visible(heroCh)) {
      var pool = all.filter(function (c) { return c.i && c.hd && !c.part && !isBroken(c.id) && (kids || c.s === 'filmes' || c.s === 'abertos'); });
      if (!pool.length) pool = all;
      heroCh = pool[Math.floor(Math.random() * pool.length)] || null;
    }
    var h = '';
    if (heroCh) {
      var fav = favs.indexOf(heroCh.id) >= 0;
      var s = sec(heroCh.s);
      var hlogo = safeUrl(heroCh.i);
      h += '<div class="hero"><div class="hero-bg"><div class="glow" style="background:' + tint(heroCh.id) + '"></div></div>' +
        '<div class="hero-txt"><span class="live-pill">' + esc(t('live')) + '</span><h1>' + esc(heroCh.n) + '</h1>' +
        '<p>' + flag(heroCh.p) + ' ' + esc(countryName(heroCh.p)) + (s ? ' · ' + esc(secName(s)) : '') + '</p>' +
        '<div class="hero-btns"><button class="btn primary f" data-key="hero-play" data-ch="' + esc(heroCh.id) + '">▶ ' + esc(t('watch')) + '</button>' +
        '<button class="btn f" data-key="hero-fav" data-fav="' + esc(heroCh.id) + '">' + (fav ? '★ ' + esc(t('remFav')) : '☆ ' + esc(t('addFav'))) + '</button></div></div>' +
        (hlogo ? '<div class="hero-logo"><img src="' + hlogo + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' : '') + '</div>';
    } else {
      h += '<div class="page-head"><div class="page-title">Marty TV</div></div>';
    }
    var rec = recent.map(function (id) { return byId[id]; }).filter(function (c) { return c && visible(c); });
    h += row('recent', t('recent'), rec.slice(0, 15));
    var fv = favs.map(function (id) { return byId[id]; }).filter(function (c) { return c && visible(c); });
    h += row('favs', t('favs'), fv.slice(0, 15), fv.length > 15 ? { more: 'favs' } : null);
    cat.secoes.forEach(function (s) {
      if (kids && s.id !== 'infantil') return;
      var list = all.filter(function (c) { return c.s === s.id; });
      if (!list.length) return;
      if (kids) {
        h += row('k-pt', s.icon + ' ' + secName(s) + ' · Português', best(list.filter(function (c) { return c.l === 'pt'; })).slice(0, 20));
        h += row('k-es', s.icon + ' ' + secName(s) + ' · Español', best(list.filter(function (c) { return c.l === 'es'; })).slice(0, 30));
        return;
      }
      h += row('s-' + s.id, s.icon + ' ' + secName(s), best(list).slice(0, 16), { count: list.length, more: 'sec:' + s.id });
    });
    return h;
  }

  function pageSection(arg) {
    var s = sec(arg.id);
    var list = cat.canais.filter(function (c) { return c.s === arg.id && visible(c); });
    var counts = {};
    list.forEach(function (c) { counts[c.p] = (counts[c.p] || 0) + 1; });
    var countries = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 14);
    var filtered = best(arg.country ? list.filter(function (c) { return c.p === arg.country; }) : list);
    var h = '<div class="page-head"><div class="page-title">' + esc(s.icon) + ' ' + esc(secName(s)) + '</div><div class="page-sub">' + filtered.length + ' ' + esc(t('channels')) + '</div></div>';
    h += '<div class="chips"><div class="chip f' + (!arg.country ? ' on' : '') + '" data-key="chip-all" data-country="">' + esc(t('all')) + '</div>';
    countries.forEach(function (cc) {
      h += '<div class="chip f' + (arg.country === cc ? ' on' : '') + '" data-key="chip-' + esc(cc) + '" data-country="' + esc(cc) + '">' + flag(cc) + ' ' + esc(countryName(cc)) + ' <span style="opacity:.55">' + counts[cc] + '</span></div>';
    });
    h += '</div><div class="grid" id="grid"></div>';
    gridState = { list: filtered, shown: 0, key: 'g' };
    return h;
  }

  function pageFavs() {
    var list = favs.map(function (id) { return byId[id]; }).filter(function (c) { return c && visible(c); });
    var h = '<div class="page-head"><div class="page-title">⭐ ' + esc(t('favs')) + '</div><div class="page-sub">' + list.length + ' ' + esc(t('channels')) + '</div></div>';
    if (!list.length) return h + '<div class="empty"><div class="big">⭐</div>' + esc(t('favEmpty')) + '<div style="font-size:1.05rem;margin-top:.6rem;color:var(--dim)">' + esc(t('favEmptyHint')) + '</div></div>';
    gridState = { list: list, shown: 0, key: 'g' };
    return h + '<div class="grid" id="grid"></div>';
  }

  var query = '';
  var KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
  function pageSearch() {
    var h = '<div class="page-head"><div class="page-title">🔍 ' + esc(t('search')) + '</div><div class="page-sub">' + esc(t('searchHint')) + '</div></div>';
    h += '<div class="search-wrap"><div><div class="search-box" id="sbox"></div><div class="kb">';
    KEYS.forEach(function (k) { h += '<div class="key f" data-key="k-' + k + '" data-type="' + k + '">' + k + '</div>'; });
    h += '<div class="key wide f" data-key="k-sp" data-type=" ">' + esc(t('space')) + '</div>';
    h += '<div class="key wide f" data-key="k-del" data-type="DEL">⌫ ' + esc(t('del')) + '</div>';
    h += '<div class="key wide f" data-key="k-clr" data-type="CLR">' + esc(t('clear')) + '</div>';
    h += '</div></div><div class="search-results" id="sres"></div></div>';
    return h;
  }
  function norm(s) {
    s = String(s).toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  }
  function updateSearch() {
    setHTML($('#sbox'), query ? esc(query) + '<span class="cur"></span>' : '<span class="ph">' + esc(t('searchPh')) + '</span><span class="cur"></span>');
    var res = $('#sres');
    if (!query.trim()) { setHTML(res, ''); gridState = null; return; }
    var q = norm(query.trim());
    var list = best(cat.canais.filter(function (c) { return visible(c) && norm(c.n).indexOf(q) >= 0; }));
    if (!list.length) { setHTML(res, '<div class="empty"><div class="big">🤷</div>' + esc(t('noResults')) + '</div>'); gridState = null; return; }
    setHTML(res, '<div class="grid" id="grid"></div>');
    gridState = { list: list, shown: 0, key: 'sr' };
    growGrid(30);
  }

  function pageApps() {
    var h = '<div class="page-head"><div class="page-title">🧩 ' + esc(t('appsTitle')) + '</div></div><p class="note">' + esc(t('appsSub')) + '</p><div class="apps">';
    APPS.forEach(function (a, i) {
      h += '<div class="app-tile f" data-key="app-' + i + '" data-app="' + i + '"><div class="ic">' + a.ic + '</div><div><div class="t">' + esc(a.n) + '</div><div class="d">' + esc(a.d[lang] || a.d.pt) + '</div></div></div>';
    });
    return h + '</div>';
  }

  function pageSettings() {
    var when = cat.gerado ? new Date(cat.gerado).toLocaleDateString(lang === 'es' ? 'es' : 'pt-BR') : '?';
    var h = '<div class="page-head"><div class="page-title">⚙️ ' + esc(t('settings')) + '</div></div><div class="list">';
    h += opt('set-lang', '🌐', t('lang'), 'Português / Español', lang === 'pt' ? 'Português' : 'Español');
    h += opt('set-kids', '🧸', t('kids'), t('kidsD'), kids ? t('on') : t('off'));
    if (!kids) h += opt('set-update', '🔄', t('update'), t('updateD') + ' · ' + t('listFrom') + ' ' + when, cat.canais.length + ' ' + t('channels'));
    h += '<div class="opt"><div class="ic">ℹ️</div><div><div class="t">' + esc(t('about')) + ' · Marty TV ' + APP_VERSION + '</div><div class="d">' + esc(t('aboutD')) + ' iptv-org.github.io</div></div></div>';
    return h + '</div>';
  }
  function opt(key, ic, title, desc, val) {
    return '<div class="opt f" data-key="' + key + '" data-set="' + key + '"><div class="ic">' + ic + '</div><div><div class="t">' + esc(title) + '</div><div class="d">' + esc(desc) + '</div></div><div class="v">' + esc(val) + '</div></div>';
  }

  // grade desenhada aos poucos (TV box fraca não aguenta 800 cartões de uma vez)
  function growGrid(n) {
    var g = $('#grid');
    if (!g || !gridState) return;
    var end = Math.min(gridState.list.length, gridState.shown + n);
    var h = '';
    for (var i = gridState.shown; i < end; i++) h += card(gridState.list[i], gridState.key + ':' + gridState.list[i].id, i);
    g.insertAdjacentHTML('beforeend', h);
    gridState.shown = end;
  }

  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }
  function pageKey() { return page.name + (page.arg ? ':' + page.arg.id + ':' + (page.arg.country || '') : ''); }

  function render(keepFocusKey) {
    gridState = null;
    var c = $('#content');
    var h;
    switch (page.name) {
      case 'section': h = pageSection(page.arg); break;
      case 'favs': h = pageFavs(); break;
      case 'search': h = pageSearch(); break;
      case 'apps': h = pageApps(); break;
      case 'settings': h = pageSettings(); break;
      default: h = pageHome();
    }
    setHTML(c, h);
    if (page.name === 'search') updateSearch();
    else if (gridState) growGrid(40);
    renderRail();
    $('#scroller').scrollTop = 0;
    var want = keepFocusKey || lastFocusId[pageKey()];
    var el = want ? $('[data-key="' + cssEsc(want) + '"]', c) : null;
    if (!el && want && gridState) {
      // o foco estava num cartão que ainda não foi desenhado
      var m = String(want).match(/:(.+)$/);
      if (m) {
        for (var i = 0; i < gridState.list.length; i++) if (gridState.list[i].id === m[1]) { growGrid(i + 20 - gridState.shown); break; }
        el = $('[data-key="' + cssEsc(want) + '"]', c);
      }
    }
    setFocus(el || $('.f', c) || $('.nav.f'));
  }

  function go(target, arg) {
    if (focusEl && focusEl.getAttribute('data-zone') !== 'rail') lastFocusId[pageKey()] = focusEl.getAttribute('data-key');
    history.push({ name: page.name, arg: page.arg });
    if (history.length > 20) history.shift();
    if (target.indexOf('sec:') === 0) page = { name: 'section', arg: { id: target.slice(4), country: arg || '' } };
    else page = { name: target, arg: null };
    if (target === 'search') query = '';
    render();
  }

  // ------------------------------------------------------------------ foco / setas
  function setFocus(el) {
    if (!el) return;
    if (focusEl) focusEl.classList.remove('focus');
    focusEl = el;
    el.classList.add('focus');
    var inRail = el.getAttribute('data-zone') === 'rail';
    $('#rail').classList.toggle('open', inRail);
    if (!inRail) {
      if (!el.closest('.modal')) lastFocusId[pageKey()] = el.getAttribute('data-key');
      scrollIntoViewTV(el);
      var idx = el.getAttribute('data-idx');
      if (gridState && idx != null && el.closest('#grid') && +idx > gridState.shown - 12) growGrid(30);
    } else {
      var r = el.getBoundingClientRect(), rr = $('#rail').getBoundingClientRect();
      if (r.bottom > rr.bottom - 10 || r.top < rr.top) $('#rail').scrollTop += r.top - rr.top - rr.height / 2;
    }
  }
  function scrollIntoViewTV(el) {
    if (el.closest('.modal')) return;
    var sc = $('#scroller');
    var r = el.getBoundingClientRect();
    var sr = sc.getBoundingClientRect();
    var track = el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('row-track') ? el.parentNode : null;
    if (track) {
      var tr = track.getBoundingClientRect();
      var pad = tr.width * 0.06;
      if (r.right > tr.right - pad) track.scrollLeft += r.right - tr.right + pad + 16;
      else if (r.left < tr.left + pad) track.scrollLeft -= tr.left + pad - r.left + 16;
    }
    if (el.closest('.hero')) { sc.scrollTop = 0; return; }
    var rowEl = el.closest('.row') || el;
    var rr = rowEl.getBoundingClientRect();
    if (rr.top < sr.top + sr.height * 0.1 || rr.bottom > sr.bottom - sr.height * 0.08) {
      sc.scrollTop = Math.max(0, sc.scrollTop + rr.top - sr.top - sr.height * 0.18);
    }
  }

  function candidates() {
    var modal = $('#modal-root .modal');
    return $all('.f', modal || document).filter(function (e) { return e.offsetParent !== null; });
  }
  function move(dir) {
    if (!focusEl || !document.body.contains(focusEl)) { setFocus(candidates()[0]); return; }
    var cur = focusEl.getBoundingClientRect();
    var cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    var bestEl = null, bestD = Infinity;
    var fromRail = focusEl.getAttribute('data-zone') === 'rail';
    candidates().forEach(function (e) {
      if (e === focusEl) return;
      var toRail = e.getAttribute('data-zone') === 'rail';
      if (fromRail && (dir === 'up' || dir === 'down') && !toRail) return;
      if (!fromRail && toRail && dir !== 'left') return;
      var r = e.getBoundingClientRect();
      var ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      var dx = ex - cx, dy = ey - cy, d;
      if (dir === 'left' || dir === 'right') {
        if (dir === 'right' ? r.left < cur.right - 4 : r.right > cur.left + 4) return;
        var overlap = Math.min(r.bottom, cur.bottom) - Math.max(r.top, cur.top);
        d = Math.abs(dx) + (overlap > 0 ? 0 : Math.abs(dy) * 4 + 4000);
      } else {
        if (dir === 'down' ? r.top < cur.bottom - 4 : r.bottom > cur.top + 4) return;
        var ov = Math.min(r.right, cur.right) - Math.max(r.left, cur.left);
        d = Math.abs(dy) * 2 + Math.abs(dx) * (ov > 0 ? 0.2 : 1);
        // ao trocar de fileira, ignora cartões escondidos fora da tela
        if (e.parentNode && e.parentNode.classList && e.parentNode.classList.contains('row-track')) {
          var tr = e.parentNode.getBoundingClientRect();
          if (r.right < tr.left || r.left > tr.right) d += 5000;
        }
      }
      if (d < bestD) { bestD = d; bestEl = e; }
    });
    if (!bestEl && dir === 'left' && !fromRail && !$('#modal-root .modal')) bestEl = $('.nav.active') || $('.nav.f');
    // ao entrar no menu, cai na seção em que a pessoa está
    if (bestEl && !fromRail && bestEl.getAttribute('data-zone') === 'rail') bestEl = $('.nav.active') || bestEl;
    if (bestEl) {
      if (fromRail && dir === 'right') {
        var k = lastFocusId[pageKey()];
        var back = k ? $('#content [data-key="' + cssEsc(k) + '"]') : null;
        if (back) bestEl = back;
      }
      setFocus(bestEl);
    }
  }

  // ------------------------------------------------------------------ ações
  function activate(el) {
    if (!el) return;
    var target = el.getAttribute('data-go');
    if (target) {
      if (target !== currentNavKey()) go(target);
      else { $('#rail').classList.remove('open'); var f = $('#content .f'); if (f) setFocus(f); }
      return;
    }
    var chId = el.getAttribute('data-ch');
    if (chId) { play(chId, el); return; }
    var favId = el.getAttribute('data-fav');
    if (favId) { toggleFav(favId); render('hero-fav'); return; }
    if (el.hasAttribute('data-country')) { page.arg.country = el.getAttribute('data-country'); render('chip-' + (page.arg.country || 'all')); return; }
    var ty = el.getAttribute('data-type');
    if (ty) {
      if (ty === 'DEL') query = query.slice(0, -1);
      else if (ty === 'CLR') query = '';
      else if (query.length < 30) query += ty;
      updateSearch();
      return;
    }
    var app = el.getAttribute('data-app');
    if (app != null) { openApp(APPS[+app]); return; }
    var set = el.getAttribute('data-set');
    if (set) setting(set);
  }

  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.unshift(id);
    save('favs', favs);
    toast(i >= 0 ? '☆ ' + t('remFav') : '⭐ ' + t('addFav'));
  }

  function addRecent(id) {
    recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 20);
    save('recent', recent);
  }

  // lista para trocar de canal com ▲▼ dentro do player: a fileira/grade de onde veio
  function zapList(el, chId) {
    var ids = [];
    var parent = el && el.parentNode;
    if (parent && parent.classList && (parent.classList.contains('row-track') || parent.id === 'grid')) {
      if (parent.id === 'grid' && gridState) ids = gridState.list.map(function (c) { return c.id; });
      else ids = $all('[data-ch]', parent).map(function (e) { return e.getAttribute('data-ch'); });
    }
    if (ids.indexOf(chId) < 0) {
      var ch = byId[chId];
      ids = best(cat.canais.filter(function (c) { return c.s === ch.s && visible(c); })).map(function (c) { return c.id; });
      if (ids.indexOf(chId) < 0) ids.unshift(chId);
    }
    var i = ids.indexOf(chId);
    var from = Math.max(0, i - 200);
    ids = ids.slice(from, from + 400);
    return { ids: ids, index: ids.indexOf(chId) };
  }

  function play(chId, el) {
    var ch = byId[chId];
    if (!ch) return;
    addRecent(chId);
    var z = zapList(el, chId);
    var items = z.ids.map(function (id) {
      var c = byId[id];
      var s = sec(c.s);
      return { id: c.id, n: c.n, u: c.u, ua: c.ua || '', rf: c.rf || '', meta: flag(c.p) + ' ' + countryName(c.p) + (s ? ' · ' + secName(s) : '') };
    });
    if (Native && Native.playList) {
      try { Native.playList(JSON.stringify(items), z.index, lang); return; } catch (e) { /* cai no player web */ }
    }
    webPlay(items, z.index);
  }

  // chamado pelo app Android quando o player fecha
  window.martyPlayerResult = function (json) {
    try {
      var r = typeof json === 'string' ? JSON.parse(json) : json;
      (r.broken || []).forEach(function (id) { broken[id] = Date.now(); });
      (r.ok || []).forEach(function (id) { delete broken[id]; });
      save('broken', broken);
      if (r.last) addRecent(r.last);
    } catch (e) { /* ignora */ }
    var k = focusEl && focusEl.getAttribute('data-key');
    render(k);
  };

  // ---- player do navegador (só para testar no PC / no site)
  var hlsLib = null;
  function webPlay(items, index) {
    var it = items[index];
    var root = document.createElement('div');
    root.id = 'webplayer';
    var v = document.createElement('video');
    v.autoplay = true; v.controls = true; v.setAttribute('playsinline', '');
    var info = document.createElement('div');
    info.className = 'wp-info';
    info.textContent = it.n + ' · ' + it.meta + ' — ESC';
    root.appendChild(v); root.appendChild(info);
    document.body.appendChild(root);
    function start() {
      if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = it.u; return; }
      if (window.Hls && window.Hls.isSupported()) { hlsLib = new window.Hls(); hlsLib.loadSource(it.u); hlsLib.attachMedia(v); return; }
      v.src = it.u;
    }
    if (window.Hls || v.canPlayType('application/vnd.apple.mpegurl')) start();
    else {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
      s.onload = start; s.onerror = start;
      document.head.appendChild(s);
    }
  }
  function closeWebPlayer() {
    var w = $('#webplayer');
    if (!w) return false;
    if (hlsLib) { try { hlsLib.destroy(); } catch (e) { /* */ } hlsLib = null; }
    w.parentNode.removeChild(w);
    return true;
  }

  function openApp(a) {
    if (!Native || !Native.openApp) { toast(t('notInstalled') + ': ' + a.n); return; }
    for (var i = 0; i < a.pkgs.length; i++) { if (Native.openApp(a.pkgs[i])) { toast(t('opening')); return; } }
    if (Native.openStore && Native.openStore(a.pkgs[0])) return;
    toast(t('notInstalled') + ': ' + a.n);
  }

  // ------------------------------------------------------------------ ajustes
  function setting(k) {
    if (k === 'set-lang') { lang = lang === 'pt' ? 'es' : 'pt'; save('lang', lang); document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'es'; render('set-lang'); return; }
    if (k === 'set-update') {
      toast('🔄 …');
      fetchCatalog(15000).then(function (c) { storeCatalog(c); setCatalog(c); toast('✅ ' + t('updated') + ' · ' + c.canais.length + ' ' + t('channels')); render('set-update'); })
        .catch(function () { toast(t('updateFail')); });
      return;
    }
    if (k === 'set-kids') {
      if (!kids) {
        askPin(pin ? t('pinAsk') : t('pinNew'), function (p1) {
          if (pin) { if (p1 !== pin) { toast(t('pinWrong')); return; } setKids(true); return; }
          askPin(t('pinAgain'), function (p2) {
            if (p1 !== p2) { toast(t('pinWrong')); return; }
            pin = p1; save('pin', pin); setKids(true);
          });
        }, !pin);
      } else {
        askPin(t('pinAsk'), function (p) { if (p === pin) setKids(false); else toast(t('pinWrong')); });
      }
    }
  }
  function setKids(on) {
    kids = on; save('kids', kids);
    heroCh = null; history = [];
    toast(on ? '🧸 ' + t('kidsOn') : t('kidsOff'));
    page = { name: 'home', arg: null };
    render();
  }

  var pinCb = null, pinVal = '', pinPrevFocus = null;
  function askPin(title, cb, isNew) {
    pinCb = cb; pinVal = '';
    if (!$('#modal-root .modal')) pinPrevFocus = focusEl;
    var h = '<div class="modal"><div class="modal-box"><h2>🔒 ' + esc(title) + '</h2><p>' + (isNew ? esc(t('pinForParents')) : '&nbsp;') + '</p><div class="pin-dots" id="pdots"></div><div class="pin-pad">';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'X'].forEach(function (k) {
      h += '<div class="key f" data-key="p-' + k + '" data-pin="' + k + '">' + (k === 'DEL' ? '⌫' : k === 'X' ? '✕' : k) + '</div>';
    });
    setHTML($('#modal-root'), h + '</div></div></div>');
    pinDots();
    setFocus($('[data-pin="5"]'));
  }
  function pinDots() { var h = ''; for (var i = 0; i < 4; i++) h += '<span' + (i < pinVal.length ? ' class="on"' : '') + '></span>'; setHTML($('#pdots'), h); }
  function closeModal() {
    setHTML($('#modal-root'), '');
    if (pinPrevFocus && document.body.contains(pinPrevFocus)) setFocus(pinPrevFocus); else setFocus($('#content .f'));
  }
  function pinKey(k) {
    if (k === 'X') { closeModal(); return; }
    if (k === 'DEL') pinVal = pinVal.slice(0, -1); else if (pinVal.length < 4) pinVal += k;
    pinDots();
    if (pinVal.length === 4) {
      var v = pinVal, cb = pinCb;
      setTimeout(function () { closeModal(); if (cb) cb(v); }, 150);
    }
  }

  // ------------------------------------------------------------------ VOLTAR
  var exitArmed = 0;
  // devolve true se tratou; false = o app pode fechar
  window.martyBack = function () {
    if (closeWebPlayer()) return true;
    if ($('#modal-root .modal')) { closeModal(); return true; }
    if (focusEl && focusEl.getAttribute('data-zone') === 'rail') {
      $('#rail').classList.remove('open');
      var f = $('#content [data-key="' + cssEsc(lastFocusId[pageKey()] || '') + '"]') || $('#content .f');
      if (f) { setFocus(f); return true; }
    }
    if (page.name !== 'home') {
      var prev = history.pop();
      while (prev && prev.name === page.name && JSON.stringify(prev.arg) === JSON.stringify(page.arg)) prev = history.pop();
      page = prev || { name: 'home', arg: null };
      if (page.name === 'search') query = '';
      render();
      return true;
    }
    var first = $('#content .f');
    if (first && focusEl !== first) { setFocus(first); $('#scroller').scrollTop = 0; return true; }
    if (Date.now() - exitArmed < 2500) return false;
    exitArmed = Date.now();
    toast(t('exit'));
    return true;
  };

  // ------------------------------------------------------------------ teclado / controle
  document.addEventListener('keydown', function (ev) {
    var k = ev.key, c = ev.keyCode;
    var handled = true;
    if (k === 'ArrowUp' || c === 38 || c === 19) move('up');
    else if (k === 'ArrowDown' || c === 40 || c === 20) move('down');
    else if (k === 'ArrowLeft' || c === 37 || c === 21) move('left');
    else if (k === 'ArrowRight' || c === 39 || c === 22) move('right');
    else if (k === 'Enter' || c === 13 || c === 23 || c === 66) {
      var pk = focusEl && focusEl.getAttribute('data-pin');
      if (pk) pinKey(pk); else activate(focusEl);
    } else if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || c === 27 || c === 8) {
      if (page.name === 'search' && k === 'Backspace' && query && !$('#modal-root .modal')) { query = query.slice(0, -1); updateSearch(); }
      else window.martyBack();
    } else if (/^[0-9]$/.test(k) && $('#modal-root .modal')) pinKey(k);
    else if (page.name === 'search' && /^[a-z0-9 ]$/i.test(k)) { query += k.toUpperCase(); updateSearch(); }
    else if (k === 'ContextMenu' || c === 82 || c === 93) {
      // tecla MENU do controle: favoritar o canal em foco
      var id = focusEl && focusEl.getAttribute('data-ch');
      if (id) { toggleFav(id); render(focusEl.getAttribute('data-key')); }
    } else handled = false;
    if (handled) ev.preventDefault();
  });
  // mouse / toque (celular, PC): clicar = foco + OK
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('.f') : null;
    if (!el) return;
    setFocus(el);
    var pk = el.getAttribute('data-pin');
    if (pk) pinKey(pk); else activate(el);
  });

  // ------------------------------------------------------------------ aviso / relógio
  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function tick() {
    var d = new Date();
    $('#clock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // ------------------------------------------------------------------ início
  function hideSplash() {
    var s = $('#splash');
    s.style.opacity = '0';
    setTimeout(function () { s.style.display = 'none'; }, 320);
  }
  function boot() {
    $('#splash-msg').textContent = t('loading');
    tick(); setInterval(tick, 20000);
    // flexbox "gap" não existe em WebView antigo: liga um plano B com margens
    var probe = document.createElement('div');
    probe.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    probe.appendChild(document.createElement('div')); probe.appendChild(document.createElement('div'));
    document.body.appendChild(probe);
    if (probe.scrollHeight !== 1) document.documentElement.className += ' nogap';
    probe.parentNode.removeChild(probe);

    var hadCatalog = !!window.BUNDLED_CATALOG;
    try { hadCatalog = hadCatalog || !!localStorage.getItem('mtv3.catalog'); } catch (e) { /* */ }
    var p = initCatalog();
    function first() {
      if (!cat) { $('#splash-msg').textContent = t('noCatalog'); return; }
      render();
      hideSplash();
    }
    if (hadCatalog && cat) {
      first();
      p.then(function (changed) {
        if (changed && page.name === 'home' && focusEl && focusEl.getAttribute('data-key') === 'hero-play') { heroCh = null; render(); }
      });
    } else p.then(first);
  }
  boot();
})();
