// Načte data/equipment.json a vykreslí kategorie techniky (rozbalovací seznamy).
(function () {
  var root = document.getElementById('categories');
  if (!root) return;

  fetch(window.BASE_PATH + '/data/equipment.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data.categories || []); })
    .catch(function (err) {
      root.innerHTML = '<p class="lede">Seznam techniky se nepodařilo načíst.</p>';
      console.error(err);
    });

  var selected = [];

  function render(categories) {
    root.innerHTML = '';
    categories.forEach(function (cat) {
      var count = cat.items.filter(function (i) { return i.name; }).length;
      var section = document.createElement('article');
      section.className = 'category category--collapsed';
      section.id = cat.id;

      var listHtml = cat.items.map(function (item) {
        if (item.sub) {
          return '<li class="is-sub">' +
            '<span lang="cs">' + escapeHtml(item.sub.cs) + '</span>' +
            '<span lang="en">' + escapeHtml(item.sub.en) + '</span>' +
          '</li>';
        }
        return '<li class="gear-list__item">' +
          '<label><input type="checkbox" data-select-item value="' + escapeHtml(item.name.cs) + '"> ' +
            '<span lang="cs">' + escapeHtml(item.name.cs) + '</span>' +
            '<span lang="en">' + escapeHtml(item.name.en) + '</span>' +
          '</label></li>';
      }).join('');

      section.innerHTML =
        '<img class="category__thumb" src="' + window.BASE_PATH + '/' + cat.thumb + '" alt="" loading="lazy" width="160" height="160">' +
        '<div>' +
          '<h3 class="category__name">' +
            '<span lang="cs">' + escapeHtml(cat.name.cs) + '</span>' +
            '<span lang="en">' + escapeHtml(cat.name.en) + '</span>' +
          '</h3>' +
          '<p class="category__count">' + count +
            ' <span lang="cs">položek</span><span lang="en">items</span></p>' +
          '<ul class="gear-list">' + listHtml + '</ul>' +
          '<button type="button" class="btn btn--text category__toggle">' +
            '<span lang="cs">Zobrazit vše</span><span lang="en">See all</span>' +
          '</button>' +
        '</div>';

      var toggle = section.querySelector('.category__toggle');
      toggle.addEventListener('click', function () {
        var collapsed = section.classList.toggle('category--collapsed');
        toggle.innerHTML = collapsed
          ? '<span lang="cs">Zobrazit vše</span><span lang="en">See all</span>'
          : '<span lang="cs">Skrýt</span><span lang="en">Hide</span>';
      });

      root.appendChild(section);
    });
    setupSelection();
  }

  var bar = null;

  function setupSelection() {
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-select-item]')) return;
      var name = e.target.value;
      if (e.target.checked) {
        if (selected.indexOf(name) === -1) selected.push(name);
      } else {
        selected = selected.filter(function (n) { return n !== name; });
      }
      updateBar();
    });

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'selection-bar hidden';
      bar.innerHTML =
        '<span class="selection-bar__count"></span>' +
        '<a class="btn" id="selection-bar__send" href="#">' +
          '<span lang="cs">Poptat vybranou techniku</span><span lang="en">Request selected gear</span>' +
        '</a>';
      document.body.appendChild(bar);
    }
  }

  function updateBar() {
    var countEl = bar.querySelector('.selection-bar__count');
    var sendEl = bar.querySelector('#selection-bar__send');
    if (selected.length === 0) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    countEl.innerHTML =
      '<span lang="cs">Vybráno: ' + selected.length + ' položek</span>' +
      '<span lang="en">Selected: ' + selected.length + ' items</span>';
    var subject = 'Poptávka techniky — Photo Rental Prague';
    var body = 'Dobrý den,\n\nmám zájem o zapůjčení následující techniky:\n\n' +
      selected.map(function (n) { return '- ' + n; }).join('\n') +
      '\n\nDěkuji za nabídku.';
    sendEl.href = 'mailto:tomasoralek@gmail.com?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
