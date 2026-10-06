// Rozbalování popisu studia a zobrazení plánku na stránce /studios/.
(function () {
  document.querySelectorAll('[data-expand]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('data-expand'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var collapsed = target.classList.toggle('is-collapsed');
      btn.innerHTML = collapsed
        ? '<span lang="cs">Číst více</span><span lang="en">Read more</span>'
        : '<span lang="cs">Skrýt</span><span lang="en">Hide</span>';
    });
  });

  document.querySelectorAll('[data-show-plan]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('data-show-plan'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var hidden = target.hasAttribute('hidden');
      if (hidden) target.removeAttribute('hidden'); else target.setAttribute('hidden', '');
      btn.innerHTML = hidden
        ? '<span lang="cs">Skrýt plánek</span><span lang="en">Hide floor plan</span>'
        : '<span lang="cs">Zobrazit plánek</span><span lang="en">Show floor plan</span>';
    });
  });

  document.querySelectorAll('.studio__plan img').forEach(function (img) {
    img.addEventListener('error', function () {
      var note = document.createElement('p');
      note.className = 'studio__plan-missing';
      note.innerHTML = '<span lang="cs">Plánek zatím není nahraný.</span><span lang="en">Floor plan not uploaded yet.</span>';
      img.replaceWith(note);
    });
  });
})();
