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
    // The thumbnails have a fixed CSS size, so the strip has the same width
    // before and after the images load and never shifts.
    placePreview(link);
  }
  function hidePreview(now) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { if (preview) preview.style.display = 'none'; }, now === true ? 0 : 180);
  }
  // The box's left edge sits on the link's left edge, 8px below it.  If that
  // would push its right edge past the screen, it slides left just until the
  // right edge meets the screen's right edge.  It is never wider than the
  // screen (a longer photo strip scrolls sideways), so it can never widen the
  // page, which on phones would zoom the whole page out.
  function placePreview(link) {
    var vw = document.documentElement.clientWidth;
    // measure at the far left: an absolute box's width depends on how much
    // room is left to its right, so it must be measured before it is moved
    preview.style.left = '0px';
    preview.style.maxWidth = vw + 'px';
    preview.style.display = 'flex';
    var w = preview.offsetWidth;
    var r = link.getBoundingClientRect();
    preview.style.left = (window.scrollX + Math.min(r.left, vw - w)) + 'px';
    preview.style.top = (r.bottom + window.scrollY + 8) + 'px';
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
      // phones: swipe sideways for the next / previous photo, down to close.
      // A two-finger pinch (zooming in on a photo) is not a swipe.
      var sx = 0, sy = 0, pinch = false;
      box.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) { pinch = true; return; }
        pinch = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (pinch || e.touches.length) return;
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) { if (current.length > 1) step(dx < 0 ? 1 : -1); }
        else if (dy > 80 && dy > 1.5 * Math.abs(dx)) closeLightbox();
      });
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
    // the page's width is only known once it has loaded: if it was not in the
    // cache yet, place the box again then, or a wide slide could stick out
    img.addEventListener('load', function () { if (img.parentNode === preview && preview.style.display !== 'none') placePreview(link); });
    preview.appendChild(img);
    placePreview(link);
  }

  // Preload every preview and gallery image right after the page is up, so
  // the first hover shows the picture instantly instead of an empty box.
  var cache = [];
  function preload() {
    var urls = [];
    document.querySelectorAll('a.pdf-link[data-preview]').forEach(function (l) { urls.push(l.getAttribute('data-preview')); });
    document.querySelectorAll('a.photo-link').forEach(function (l) { urls = urls.concat(photosOf(l)); });
    urls.forEach(function (u) { var im = new Image(); im.decoding = 'async'; im.src = u; cache.push(im); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.requestIdleCallback) { requestIdleCallback(preload); } else { setTimeout(preload, 200); }
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
