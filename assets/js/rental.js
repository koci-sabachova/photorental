// Načte data/equipment.json a vykreslí kategorie techniky (rozbalovací seznamy).
(function () {
  var root = document.getElementById('categories');
  if (!root) return;

  fetch('/data/equipment.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data.categories || []); })
    .catch(function (err) {
      root.innerHTML = '<p class="lede">Seznam techniky se nepodařilo načíst.</p>';
      console.error(err);
    });

  function render(categories) {
    root.innerHTML = '';
    categories.forEach(function (cat) {
      var count = cat.items.filter(function (i) { return i.name; }).length;
      var section = document.createElement('article');
      section.className = 'category category--collapsed';
      section.id = cat.id;

      var listHtml = cat.items.map(function (item) {
        if (item.sub) {
          return '<li class="is-sub">' + escapeHtml(item.sub) + '</li>';
        }
        return '<li>' + escapeHtml(item.name) + '</li>';
      }).join('');

      section.innerHTML =
        '<img class="category__thumb" src="/' + cat.thumb + '" alt="" loading="lazy" width="160" height="160">' +
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
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
