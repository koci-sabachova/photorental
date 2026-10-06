// Redakční nástroj — běží čistě v prohlížeči, zapisuje přímo do souborů projektu
// přes File System Access API (Chrome / Edge). Žádný server, žádná databáze.
(function () {
  var rootHandle = null;
  var equipmentData = null;

  var els = {
    unsupported: document.getElementById('unsupported'),
    btnOpen: document.getElementById('btn-open'),
    connectStatus: document.getElementById('connect-status'),
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

  if (!window.showDirectoryPicker) {
    els.unsupported.classList.remove('hidden');
    els.btnOpen.disabled = true;
    return;
  }

  els.btnOpen.addEventListener('click', openProject);
  els.btnAddItem.addEventListener('click', addItem);
  els.inpThumb.addEventListener('change', previewThumb);
  els.btnSaveThumb.addEventListener('click', saveThumb);
  els.inpNewsPhoto.addEventListener('change', previewNewsPhoto);
  els.btnSaveNews.addEventListener('click', saveNews);
  els.btnCopyFb.addEventListener('click', copyForFacebook);

  async function openProject() {
    try {
      rootHandle = await window.showDirectoryPicker();
      var dataDir = await rootHandle.getDirectoryHandle('data', { create: true });
      var fileHandle = await dataDir.getFileHandle('equipment.json', { create: false });
      var file = await fileHandle.getFile();
      equipmentData = JSON.parse(await file.text());

      populateCategories();
      els.app.classList.remove('hidden');
      setStatus(els.connectStatus, 'Připojeno ke složce „' + rootHandle.name + '“.', 'ok');
    } catch (err) {
      console.error(err);
      setStatus(els.connectStatus, 'Nepodařilo se otevřít projekt (' + err.message + ').', 'err');
    }
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

  async function writeEquipmentFile() {
    var dataDir = await rootHandle.getDirectoryHandle('data', { create: true });
    var fileHandle = await dataDir.getFileHandle('equipment.json', { create: true });
    var writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(equipmentData, null, 2) + '\n');
    await writable.close();
  }

  async function addItem() {
    var cat = currentCategory();
    var name = els.inpItem.value.trim();
    if (!cat || !name) return;
    cat.items.push({ name: name });
    try {
      await writeEquipmentFile();
      els.inpItem.value = '';
      renderItemList();
      setStatus(els.itemStatus, 'Uloženo: „' + name + '“ přidáno do kategorie „' + cat.name.cs + '“.', 'ok');
    } catch (err) {
      setStatus(els.itemStatus, 'Uložení se nezdařilo (' + err.message + ').', 'err');
    }
  }

  async function removeItem(idx) {
    var cat = currentCategory();
    if (!cat) return;
    cat.items.splice(idx, 1);
    try {
      await writeEquipmentFile();
      renderItemList();
      setStatus(els.itemStatus, 'Položka smazána.', 'ok');
    } catch (err) {
      setStatus(els.itemStatus, 'Smazání se nezdařilo (' + err.message + ').', 'err');
    }
  }

  // --- Fotka kategorie ---
  var pendingThumbBlob = null;

  function previewThumb() {
    var file = els.inpThumb.files[0];
    if (!file) return;
    processImageToSquareGray(file, 560, function (blob, url) {
      pendingThumbBlob = blob;
      els.thumbPreview.src = url;
      els.thumbPreview.classList.remove('hidden');
      els.btnSaveThumb.disabled = false;
    });
  }

  async function saveThumb() {
    var cat = currentCategory();
    if (!cat || !pendingThumbBlob) return;
    try {
      var imgDir = await rootHandle.getDirectoryHandle('assets', { create: true })
        .then(function (d) { return d.getDirectoryHandle('img', { create: true }); })
        .then(function (d) { return d.getDirectoryHandle('rental', { create: true }); })
        .then(function (d) { return d.getDirectoryHandle('thumb', { create: true }); });
      var fileHandle = await imgDir.getFileHandle(cat.id + '.jpg', { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(pendingThumbBlob);
      await writable.close();
      setStatus(els.itemStatus, 'Fotka kategorie „' + cat.name.cs + '“ uložena.', 'ok');
      els.btnSaveThumb.disabled = true;
    } catch (err) {
      setStatus(els.itemStatus, 'Uložení fotky se nezdařilo (' + err.message + ').', 'err');
    }
  }

  // --- Novinka ---
  var pendingNewsBlob = null;

  function previewNewsPhoto() {
    var file = els.inpNewsPhoto.files[0];
    if (!file) return;
    processImageToSquareGray(file, 640, function (blob, url) {
      pendingNewsBlob = blob;
      els.newsPreview.src = url;
      els.newsPreview.classList.remove('hidden');
    });
  }

  async function saveNews() {
    var textCs = els.inpNewsCs.value.trim();
    var textEn = els.inpNewsEn.value.trim();
    if (!textCs && !textEn) {
      setStatus(els.newsStatus, 'Napiš alespoň jeden text.', 'err');
      return;
    }
    try {
      var imagePath = '';
      if (pendingNewsBlob) {
        var imgDir = await rootHandle.getDirectoryHandle('assets', { create: true })
          .then(function (d) { return d.getDirectoryHandle('img', { create: true }); })
          .then(function (d) { return d.getDirectoryHandle('news', { create: true }); });
        var fileHandle = await imgDir.getFileHandle('latest.jpg', { create: true });
        var writable = await fileHandle.createWritable();
        await writable.write(pendingNewsBlob);
        await writable.close();
        imagePath = 'assets/img/news/latest.jpg?v=' + Date.now();
      }
      var news = {
        text_cs: textCs,
        text_en: textEn || textCs,
        image: imagePath,
        date: new Date().toLocaleDateString('cs-CZ'),
      };
      var dataDir = await rootHandle.getDirectoryHandle('data', { create: true });
      var newsHandle = await dataDir.getFileHandle('news.json', { create: true });
      var newsWritable = await newsHandle.createWritable();
      await newsWritable.write(JSON.stringify(news, null, 2) + '\n');
      await newsWritable.close();
      setStatus(els.newsStatus, 'Novinka uložena a nahradila předchozí.', 'ok');
    } catch (err) {
      setStatus(els.newsStatus, 'Uložení se nezdařilo (' + err.message + ').', 'err');
    }
  }

  function copyForFacebook() {
    var text = els.inpNewsCs.value.trim();
    if (!text) { setStatus(els.newsStatus, 'Nejdřív napiš text novinky.', 'err'); return; }
    navigator.clipboard.writeText(text).then(function () {
      setStatus(els.newsStatus, 'Text zkopírován — vlož ho ručně do příspěvku na Facebooku.', 'ok');
    });
  }

  // --- Pomocné funkce ---
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
        canvas.toBlob(function (blob) {
          cb(blob, URL.createObjectURL(blob));
        }, 'image/jpeg', 0.8);
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
