const OWNER = 'koci-sabachova';
const REPO = 'photorental';
const BRANCH = 'main';
const API = 'https://api.github.com';

function b64encodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

async function ghRequest(env, path, init) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'photorental-admin-worker',
      ...(init && init.headers),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function ghGetFile(env, filePath) {
  const data = await ghRequest(env, `contents/${filePath}?ref=${BRANCH}`);
  return { sha: data.sha, content: b64decodeUtf8(data.content) };
}

async function ghGetFileSha(env, filePath) {
  try {
    const data = await ghRequest(env, `contents/${filePath}?ref=${BRANCH}`);
    return data.sha;
  } catch (err) {
    return null;
  }
}

async function ghPutFile(env, filePath, contentBase64, sha, message) {
  return ghRequest(env, `contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: contentBase64,
      sha: sha || undefined,
      branch: BRANCH,
    }),
  });
}

async function ghPutJson(env, filePath, obj, message) {
  const sha = await ghGetFileSha(env, filePath);
  const content = b64encodeUtf8(JSON.stringify(obj, null, 2) + '\n');
  return ghPutFile(env, filePath, content, sha, message);
}

function checkAuth(request, env) {
  const pw = request.headers.get('X-Admin-Password') || '';
  return pw.length > 0 && pw === env.ADMIN_PASSWORD;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handleApi(request, env, url) {
  if (!checkAuth(request, env)) return json({ error: 'Špatné heslo.' }, 401);

  if (url.pathname === '/api/equipment' && request.method === 'GET') {
    const { content } = await ghGetFile(env, 'data/equipment.json');
    return json(JSON.parse(content));
  }

  if (url.pathname === '/api/equipment' && request.method === 'POST') {
    const body = await request.json();
    const { content } = await ghGetFile(env, 'data/equipment.json');
    const data = JSON.parse(content);
    const cat = data.categories.find((c) => c.id === body.categoryId);
    if (!cat) return json({ error: 'Kategorie nenalezena.' }, 400);

    let message;
    if (body.action === 'add') {
      const name = (body.name || '').trim();
      if (!name) return json({ error: 'Chybí název položky.' }, 400);
      cat.items.push({ name });
      message = `Admin: přidána položka „${name}“ do kategorie „${cat.name.cs}“`;
    } else if (body.action === 'remove') {
      if (typeof body.idx !== 'number' || !cat.items[body.idx]) {
        return json({ error: 'Položka nenalezena.' }, 400);
      }
      cat.items.splice(body.idx, 1);
      message = `Admin: smazána položka z kategorie „${cat.name.cs}“`;
    } else {
      return json({ error: 'Neznámá akce.' }, 400);
    }

    await ghPutJson(env, 'data/equipment.json', data, message);
    return json(data);
  }

  if (url.pathname === '/api/thumb' && request.method === 'POST') {
    const body = await request.json();
    if (!body.categoryId || !body.imageBase64) return json({ error: 'Chybí data.' }, 400);
    const filePath = `assets/img/rental/thumb/${body.categoryId}.jpg`;
    const sha = await ghGetFileSha(env, filePath);
    await ghPutFile(env, filePath, body.imageBase64, sha, `Admin: nahrazena fotka kategorie „${body.categoryId}“`);
    return json({ ok: true });
  }

  if (url.pathname === '/api/news' && request.method === 'GET') {
    const { content } = await ghGetFile(env, 'data/news.json');
    return json(JSON.parse(content));
  }

  if (url.pathname === '/api/news' && request.method === 'POST') {
    const body = await request.json();
    const textCs = (body.text_cs || '').trim();
    const textEn = (body.text_en || '').trim();
    if (!textCs && !textEn) return json({ error: 'Napiš alespoň jeden text.' }, 400);

    let imagePath = '';
    if (body.imageBase64) {
      const filePath = 'assets/img/news/latest.jpg';
      const sha = await ghGetFileSha(env, filePath);
      await ghPutFile(env, filePath, body.imageBase64, sha, 'Admin: nová fotka k novince');
      imagePath = `assets/img/news/latest.jpg?v=${Date.now()}`;
    }

    const news = {
      text_cs: textCs,
      text_en: textEn || textCs,
      image: imagePath,
      date: new Date().toLocaleDateString('cs-CZ'),
    };
    await ghPutJson(env, 'data/news.json', news, 'Admin: nová novinka na homepage');
    return json(news);
  }

  return json({ error: 'Neznámý endpoint.' }, 404);
}

const PAGE = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redakce — Photo Rental Prague</title>
<meta name="robots" content="noindex">
<style>
  :root {
    --black: hsl(0,0%,8%); --ink: hsl(0,0%,15%); --grey-70: hsl(0,0%,45%);
    --grey-30: hsl(0,0%,82%); --grey-15: hsl(0,0%,92%); --white: hsl(0,0%,100%);
    --line: hsl(0,0%,85%); --ok: hsl(0,0%,20%); --err: hsl(0,70%,40%);
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; color:var(--ink); background:var(--white); line-height:1.5; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 100px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  h2 { font-size: 17px; margin: 0 0 14px; }
  .muted { color: var(--grey-70); font-size: 14px; }
  section { border-top: 1px solid var(--line); padding: 32px 0; }
  section:first-of-type { border-top: 0; }
  label { display:block; font-size: 13px; color: var(--grey-70); margin: 16px 0 6px; }
  input[type=text], input[type=password], textarea, select, input[type=file] {
    width: 100%; font: inherit; padding: 10px 12px; border: 1px solid var(--grey-30); background: var(--white); color: var(--ink);
  }
  textarea { min-height: 70px; resize: vertical; }
  button {
    font: inherit; cursor: pointer; padding: 10px 20px; border: 1px solid var(--black);
    background: var(--white); color: var(--black); margin-top: 16px; margin-right: 10px;
  }
  button:hover { background: var(--black); color: var(--white); }
  button.secondary { border-color: var(--grey-30); color: var(--grey-70); }
  button:disabled { opacity: .4; cursor: not-allowed; }
  .item-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--grey-15); font-size:14px; }
  .item-row button { margin:0; padding:2px 8px; font-size:12px; border-color: var(--grey-30); color: var(--grey-70); }
  .status { margin-top: 14px; font-size: 14px; }
  .status.ok { color: var(--ok); }
  .status.err { color: var(--err); }
  .hidden { display: none !important; }
  .thumb-preview { width: 80px; height: 80px; object-fit: cover; margin-top: 10px; filter: grayscale(1); border:1px solid var(--line); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Redakce — Photo Rental Prague</h1>
  <p class="muted">Interní nástroj pro přidávání techniky a novinek. Neveřejné — nepublikuje se na web.</p>

  <section id="login-section">
    <label for="inp-password">Heslo</label>
    <input type="password" id="inp-password" autocomplete="current-password">
    <button id="btn-login" type="button">Přihlásit</button>
    <p class="status" id="login-status"></p>
  </section>

  <div id="app" class="hidden">
    <section>
      <h2>Přidat techniku do kategorie</h2>
      <label for="sel-category">Kategorie</label>
      <select id="sel-category"></select>

      <label for="inp-item">Název nové položky</label>
      <input type="text" id="inp-item" placeholder="např. Profoto B10 Plus 250Ws">

      <button id="btn-add-item" type="button">Přidat položku</button>
      <p class="status" id="item-status"></p>

      <div style="margin-top:24px;">
        <strong style="font-size:14px;">Aktuální položky v kategorii</strong>
        <div id="item-list"></div>
      </div>

      <label for="inp-thumb">Nahradit ilustrační fotku kategorie (volitelné)</label>
      <input type="file" id="inp-thumb" accept="image/*">
      <img id="thumb-preview" class="thumb-preview hidden" alt="">
      <button id="btn-save-thumb" type="button" class="secondary" disabled>Uložit fotku kategorie</button>
    </section>

    <section>
      <h2>Novinka na homepage</h2>
      <p class="muted">Nová novinka vždy nahradí tu předchozí.</p>

      <label for="inp-news-cs">Text česky</label>
      <textarea id="inp-news-cs" placeholder="Máme nové světlo Profoto B10 Plus."></textarea>

      <label for="inp-news-en">Text anglicky</label>
      <textarea id="inp-news-en" placeholder="We have a new Profoto B10 Plus light."></textarea>

      <label for="inp-news-photo">Fotka (volitelné)</label>
      <input type="file" id="inp-news-photo" accept="image/*">
      <img id="news-preview" class="thumb-preview hidden" alt="">

      <button id="btn-save-news" type="button">Uložit novinku</button>
      <button id="btn-copy-fb" type="button" class="secondary">Zkopírovat text pro Facebook</button>
      <p class="status" id="news-status"></p>
    </section>

    <section>
      <p class="muted">Uložení rovnou commitne a nahraje změnu na web. Během minuty nebo dvou se web sám aktualizuje.</p>
    </section>
  </div>
</div>

<script>
(function () {
  var password = '';
  var equipmentData = null;

  var els = {
    loginSection: document.getElementById('login-section'),
    inpPassword: document.getElementById('inp-password'),
    btnLogin: document.getElementById('btn-login'),
    loginStatus: document.getElementById('login-status'),
    app: document.getElementById('app'),
    selCategory: document.getElementById('sel-category'),
    inpItem: document.getElementById('inp-item'),
    btnAddItem: document.getElementById('btn-add-item'),
    itemStatus: document.getElementById('item-status'),
    itemList: document.getElementById('item-list'),
    inpThumb: document.getElementById('inp-thumb'),
    thumbPreview: document.getElementById('thumb-preview'),
    btnSaveThumb: document.getElementById('btn-save-thumb'),
    inpNewsCs: document.getElementById('inp-news-cs'),
    inpNewsEn: document.getElementById('inp-news-en'),
    inpNewsPhoto: document.getElementById('inp-news-photo'),
    newsPreview: document.getElementById('news-preview'),
    btnSaveNews: document.getElementById('btn-save-news'),
    btnCopyFb: document.getElementById('btn-copy-fb'),
    newsStatus: document.getElementById('news-status'),
  };

  els.btnLogin.addEventListener('click', login);
  els.inpPassword.addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  els.btnAddItem.addEventListener('click', addItem);
  els.inpThumb.addEventListener('change', previewThumb);
  els.btnSaveThumb.addEventListener('click', saveThumb);
  els.inpNewsPhoto.addEventListener('change', previewNewsPhoto);
  els.btnSaveNews.addEventListener('click', saveNews);
  els.btnCopyFb.addEventListener('click', copyForFacebook);

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'X-Admin-Password': password }, opts.headers || {});
    return fetch(path, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Chyba ' + res.status));
        return data;
      });
    });
  }

  function login() {
    password = els.inpPassword.value;
    api('/api/equipment').then(function (data) {
      equipmentData = data;
      els.loginSection.classList.add('hidden');
      els.app.classList.remove('hidden');
      populateCategories();
    }).catch(function (err) {
      setStatus(els.loginStatus, err.message, 'err');
    });
  }

  function populateCategories() {
    els.selCategory.innerHTML = equipmentData.categories.map(function (c) {
      return '<option value="' + c.id + '">' + c.name.cs + '</option>';
    }).join('');
    els.selCategory.addEventListener('change', renderItemList);
    renderItemList();
  }

  function currentCategory() {
    var id = els.selCategory.value;
    return equipmentData.categories.find(function (c) { return c.id === id; });
  }

  function renderItemList() {
    var cat = currentCategory();
    if (!cat) return;
    els.itemList.innerHTML = cat.items.map(function (item, idx) {
      var label = item.sub ? '<em>' + escapeHtml(item.sub) + '</em>' : escapeHtml(item.name);
      return '<div class="item-row"><span>' + label + '</span>' +
        '<button type="button" data-remove="' + idx + '">Smazat</button></div>';
    }).join('');
    els.itemList.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () { removeItem(Number(btn.dataset.remove)); });
    });
  }

  function addItem() {
    var cat = currentCategory();
    var name = els.inpItem.value.trim();
    if (!cat || !name) return;
    els.btnAddItem.disabled = true;
    api('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', categoryId: cat.id, name: name }),
    }).then(function (data) {
      equipmentData = data;
      els.inpItem.value = '';
      renderItemList();
      setStatus(els.itemStatus, 'Uloženo a nahráno: „' + name + '“ přidáno do kategorie „' + cat.name.cs + '“.', 'ok');
    }).catch(function (err) {
      setStatus(els.itemStatus, 'Uložení se nezdařilo (' + err.message + ').', 'err');
    }).finally(function () { els.btnAddItem.disabled = false; });
  }

  function removeItem(idx) {
    var cat = currentCategory();
    if (!cat) return;
    api('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', categoryId: cat.id, idx: idx }),
    }).then(function (data) {
      equipmentData = data;
      renderItemList();
      setStatus(els.itemStatus, 'Položka smazána a změna nahrána.', 'ok');
    }).catch(function (err) {
      setStatus(els.itemStatus, 'Smazání se nezdařilo (' + err.message + ').', 'err');
    });
  }

  var pendingThumbBase64 = null;

  function previewThumb() {
    var file = els.inpThumb.files[0];
    if (!file) return;
    processImageToSquareGray(file, 560, function (base64, url) {
      pendingThumbBase64 = base64;
      els.thumbPreview.src = url;
      els.thumbPreview.classList.remove('hidden');
      els.btnSaveThumb.disabled = false;
    });
  }

  function saveThumb() {
    var cat = currentCategory();
    if (!cat || !pendingThumbBase64) return;
    els.btnSaveThumb.disabled = true;
    api('/api/thumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: cat.id, imageBase64: pendingThumbBase64 }),
    }).then(function () {
      setStatus(els.itemStatus, 'Fotka kategorie „' + cat.name.cs + '“ uložena a nahrána.', 'ok');
    }).catch(function (err) {
      setStatus(els.itemStatus, 'Uložení fotky se nezdařilo (' + err.message + ').', 'err');
      els.btnSaveThumb.disabled = false;
    });
  }

  var pendingNewsBase64 = null;

  function previewNewsPhoto() {
    var file = els.inpNewsPhoto.files[0];
    if (!file) return;
    processImageToSquareGray(file, 640, function (base64, url) {
      pendingNewsBase64 = base64;
      els.newsPreview.src = url;
      els.newsPreview.classList.remove('hidden');
    });
  }

  function saveNews() {
    var textCs = els.inpNewsCs.value.trim();
    var textEn = els.inpNewsEn.value.trim();
    if (!textCs && !textEn) {
      setStatus(els.newsStatus, 'Napiš alespoň jeden text.', 'err');
      return;
    }
    els.btnSaveNews.disabled = true;
    api('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_cs: textCs, text_en: textEn, imageBase64: pendingNewsBase64 }),
    }).then(function () {
      setStatus(els.newsStatus, 'Novinka uložena, nahrána a nahradila předchozí.', 'ok');
    }).catch(function (err) {
      setStatus(els.newsStatus, 'Uložení se nezdařilo (' + err.message + ').', 'err');
    }).finally(function () { els.btnSaveNews.disabled = false; });
  }

  function copyForFacebook() {
    var text = els.inpNewsCs.value.trim();
    if (!text) { setStatus(els.newsStatus, 'Nejdřív napiš text novinky.', 'err'); return; }
    navigator.clipboard.writeText(text).then(function () {
      setStatus(els.newsStatus, 'Text zkopírován — vlož ho ručně do příspěvku na Facebooku.', 'ok');
    });
  }

  function processImageToSquareGray(file, size, cb) {
    var img = new Image();
    var reader = new FileReader();
    reader.onload = function (e) {
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var side = Math.min(img.width, img.height);
        var sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        var imageData = ctx.getImageData(0, 0, size, size);
        var d = imageData.data;
        for (var i = 0; i < d.length; i += 4) {
          var gray = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
          d[i] = d[i + 1] = d[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cb(dataUrl.split(',')[1], dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = 'status ' + (kind || '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
</script>
</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }
    return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
