// The word "Email" copies the address instead of opening a mail program, and says so in a
// small bubble; the envelope icon beside it remains the mailto link.  Where the browser has
// no clipboard, the word stays what it is in the markup: a mailto link too.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a.copy-email').forEach(function (a) {
      var timer;
      a.addEventListener('click', function (e) {
        if (!navigator.clipboard) return;
        e.preventDefault();
        navigator.clipboard.writeText(a.getAttribute('href').replace(/^mailto:/, '')).then(function () {
          a.classList.add('copied');
          clearTimeout(timer);
          timer = setTimeout(function () { a.classList.remove('copied'); }, 1800);
        }, function () {
          location.href = a.href;   // copying was refused: fall back to the mail program
        });
      });
    });
  });
})();
