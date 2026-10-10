// Homepage novinka — poslední přidaná technika (data/news.json), nastavuje editační nástroj v /admin/.
(function () {
  var root = document.getElementById('news-slot');
  if (!root) return;

  fetch(window.BASE_PATH + '/data/news.json')
    .then(function (r) { return r.json(); })
    .then(function (news) { render(news); })
    .catch(function () { renderEmpty(); });

  function render(news) {
    if (!news || (!news.text_cs && !news.text_en)) { renderEmpty(); return; }
    var img = news.image
      ? '<img class="news__img" src="' + window.BASE_PATH + '/' + news.image + '" alt="">'
      : '<div class="news__img" aria-hidden="true"></div>';
    root.innerHTML =
      '<div class="news">' +
        img +
        '<div>' +
          '<p class="news__label"><span lang="cs">Novinka</span><span lang="en">News</span></p>' +
          '<p lang="cs">' + escapeHtml(news.text_cs || '') + '</p>' +
          '<p lang="en">' + escapeHtml(news.text_en || news.text_cs || '') + '</p>' +
          (news.date ? '<p class="news__date">' + escapeHtml(news.date) + '</p>' : '') +
        '</div>' +
      '</div>';
  }

  function renderEmpty() {
    root.innerHTML =
      '<div class="news news--empty">' +
        '<span lang="cs">Zatím žádná novinka.</span>' +
        '<span lang="en">No news yet.</span>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
