// Photo links in the News list: hover shows a small preview strip, click opens
// a lightbox gallery.  A link declares its photos as
//   <a class="photo-link" data-photos="photos/a.jpg,photos/b.jpg">photos</a>
(function () {
  function photosOf(link) {
    return link.getAttribute('data-photos').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // ---- hover preview ----
  var preview = null, hideTimer = null;
  function showPreview(link) {
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'photo-preview';
      document.body.appendChild(preview);
      preview.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
      preview.addEventListener('mouseleave', hidePreview);
    }
    preview.innerHTML = '';
    preview.classList.remove('doc');
    photosOf(link).forEach(function (src, i) {
      var img = document.createElement('img');
      img.src = src; img.alt = 'photo ' + (i + 1);
      img.addEventListener('click', function () { hidePreview(true); openLightbox(link, i); });
      preview.appendChild(img);
    });
    // Fixed placement: the strip's left edge sits on the link's left edge,
    // 8px below it.  The thumbnails have a fixed CSS size, so the strip has
    // the same width before and after the images load and never shifts.
    var r = link.getBoundingClientRect();
    preview.style.display = 'flex';
    var w = preview.offsetWidth;
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - w - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    preview.style.left = left + 'px';
    preview.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }
  function hidePreview(now) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { if (preview) preview.style.display = 'none'; }, now === true ? 0 : 180);
  }

  // ---- lightbox ----
  var box = null, current = [], index = 0;
  function openLightbox(link, i) {
    current = photosOf(link); index = i || 0;
    if (!box) {
      box = document.createElement('div');
      box.className = 'photo-lightbox';
      box.innerHTML =
        '<button class="lb-close" aria-label="Close">&times;</button>' +
        '<button class="lb-prev" aria-label="Previous">&#10094;</button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>' +
        '<button class="lb-next" aria-label="Next">&#10095;</button>';
      document.body.appendChild(box);
      box.querySelector('.lb-close').addEventListener('click', closeLightbox);
      box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
      box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
      box.addEventListener('click', function (e) { if (e.target === box) closeLightbox(); });
      document.addEventListener('keydown', function (e) {
        if (!box || box.style.display !== 'flex') return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
      });
    }
    box.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    render();
  }
  function render() {
    var img = box.querySelector('img');
    img.src = current[index];
    box.querySelector('figcaption').textContent = (index + 1) + ' / ' + current.length;
    box.querySelector('.lb-prev').style.visibility = current.length > 1 ? 'visible' : 'hidden';
    box.querySelector('.lb-next').style.visibility = current.length > 1 ? 'visible' : 'hidden';
  }
  function step(d) { index = (index + d + current.length) % current.length; render(); }
  function closeLightbox() { box.style.display = 'none'; document.body.style.overflow = ''; }

  // ---- single-image hover preview for slide / poster links ----
  function showDocPreview(link) {
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'photo-preview';
      document.body.appendChild(preview);
      preview.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
      preview.addEventListener('mouseleave', hidePreview);
    }
    preview.innerHTML = '';
    preview.classList.add('doc');
    var img = document.createElement('img');
    img.src = link.getAttribute('data-preview'); img.alt = 'preview';
    img.addEventListener('click', function () { hidePreview(true); window.open(link.href, '_blank', 'noopener'); });
    preview.appendChild(img);
    var r = link.getBoundingClientRect();
    preview.style.display = 'flex';
    var w = preview.offsetWidth;
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - w - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    preview.style.left = left + 'px';
    preview.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a.pdf-link[data-preview]').forEach(function (link) {
      link.addEventListener('mouseenter', function () { clearTimeout(hideTimer); showDocPreview(link); });
      link.addEventListener('mouseleave', hidePreview);
      link.addEventListener('click', function () { hidePreview(true); });
    });
    document.querySelectorAll('a.photo-link').forEach(function (link) {
      link.addEventListener('mouseenter', function () { clearTimeout(hideTimer); showPreview(link); });
      link.addEventListener('mouseleave', hidePreview);
      link.addEventListener('click', function (e) { e.preventDefault(); hidePreview(true); openLightbox(link, 0); });
    });
  });
})();
