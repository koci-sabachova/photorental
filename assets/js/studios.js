// Zobrazení plánku a lightbox pro fotky na stránce /studios/.
(function () {
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

  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.hidden = true;
  var lightboxImg = document.createElement('img');
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);
  lightbox.addEventListener('click', function () { lightbox.hidden = true; });

  document.querySelectorAll('.gallery img').forEach(function (img) {
    img.addEventListener('click', function () {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.hidden = false;
    });
  });
})();
