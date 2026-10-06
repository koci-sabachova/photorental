// Přepínač jazyka CZ/EN + mobilní menu. Detekce jazyka (bez blikání) je v _partials/head.html.
(function () {
  function applyLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('lang', lang);
    var meta = window.__i18nMeta;
    if (meta) {
      document.title = lang === 'en' ? meta.titleEn : meta.titleCs;
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', lang === 'en' ? meta.descEn : meta.descCs);
    }
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-current', btn.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLang(document.documentElement.getAttribute('data-lang') || 'cs');

    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.getAttribute('data-set-lang'));
      });
    });

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  });
})();
