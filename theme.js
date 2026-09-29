// Picks the colour theme before first paint: light while the sun is up where
// the visitor is, dark between sunset and sunrise.  "Where" is the principal
// city of the browser's time zone (tz-coords.js, loaded just before this), so
// no location permission is needed.  A click on the toggle overrides that for
// one session, i.e. for two hours after the click; then the sun decides again.
(function () {
  var DAY_START = 7, NIGHT_START = 19;   // fallback when the time zone has no known place (e.g. UTC)
  var SESSION_MS = 2 * 60 * 60 * 1000;   // how long a manual choice is kept
  var KEY = 'themeChoice';               // {"theme": "dark", "at": <ms of the click>}
  var mine = null;                       // the same record, for when storage is blocked

  var place = null;                      // [lat, lon] in degrees
  try { place = TZ_COORDS[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) {}

  // Is the sun above the horizon at lat/lon right now, i.e. is it between
  // today's sunrise and sunset there?  Low-precision solar position (USNO's
  // approximation, good to about a minute of sunrise time); -0.833 deg is the
  // standard sunrise/sunset horizon (refraction plus the sun's radius).  It
  // also covers the midnight sun and the polar night.
  function sunUp(lat, lon) {
    var rad = Math.PI / 180;
    var d = Date.now() / 864e5 - 10957.5;                        // days since J2000.0
    var g = (357.529 + 0.98560028 * d) * rad;                     // mean anomaly
    var L = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;  // ecliptic longitude
    var e = (23.439 - 0.00000036 * d) * rad;                      // obliquity of the ecliptic
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));  // right ascension
    var dec = Math.asin(Math.sin(e) * Math.sin(L));               // declination
    var H = (280.46061837 + 360.98564736629 * d + lon) * rad - ra; // local hour angle
    var alt = Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H));
    return alt > -0.833 * rad;
  }

  function byDaylight() {
    if (place) return sunUp(place[0], place[1]) ? 'light' : 'dark';
    var h = new Date().getHours();
    return h >= DAY_START && h < NIGHT_START ? 'light' : 'dark';
  }

  // the visitor's own choice, if they made one within the last two hours
  function chosen() {
    var c = mine;
    try { c = JSON.parse(localStorage.getItem(KEY)) || c; } catch (e) {}
    return c && Date.now() - c.at < SESSION_MS ? c.theme : null;
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function update() { apply(chosen() || byDaylight()); }

  try { localStorage.removeItem('theme'); } catch (e) {}   // the old choice, which was kept forever
  update();

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      mine = { theme: next, at: Date.now() };
      try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) {}
    });
  });

  // A page left open keeps following the sun: it turns dark at sunset, and a
  // manual choice lapses once its two hours are up.
  setInterval(update, 60 * 1000);
  document.addEventListener('visibilitychange', update);
})();
