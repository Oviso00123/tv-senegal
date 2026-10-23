var RemoteController = (function () {
  var KEY_CODES = { LEFT: [37], UP: [38], RIGHT: [39], DOWN: [40], ENTER: [13], BACK: [8, 27, 461, 10009] };
  var cb = { onBack: null, onEnter: null };
  function init() { window.addEventListener('keydown', handleKeyDown, true); }
  function isKey(c, g) { return g.indexOf(c) !== -1; }
  function handleKeyDown(e) {
    var code = e.keyCode || e.which;
    if (isKey(code, KEY_CODES.BACK)) { e.preventDefault(); if (cb.onBack) cb.onBack(); return; }
    if (isKey(code, KEY_CODES.ENTER)) {
      var a = document.activeElement;
      if (a && typeof a.click === 'function') a.click();
      if (cb.onEnter) cb.onEnter(a);
      return;
    }
    if (isKey(code, KEY_CODES.UP) || isKey(code, KEY_CODES.DOWN) || isKey(code, KEY_CODES.LEFT) || isKey(code, KEY_CODES.RIGHT)) {
      spatialNavigation(code);
      e.preventDefault();
    }
  }
  function getFocusableElements() {
    var m = document.querySelector('.modal-backdrop:not(.hidden)');
    var scope = m ? m : document;
    var el = Array.prototype.slice.call(scope.querySelectorAll('button, [tabindex="0"], a'));
    return el.filter(function(x) { return x.offsetWidth > 0 && x.offsetHeight > 0 && !x.disabled; });
  }
  function spatialNavigation(code) {
    var focusables = getFocusableElements();
    if (!focusables.length) return;
    var cur = document.activeElement;
    if (focusables.indexOf(cur) === -1) { focusables[0].focus(); return; }
    var cR = cur.getBoundingClientRect();
    var best = null, minDist = Number.MAX_VALUE;
    for (var i = 0; i < focusables.length; i++) {
      var t = focusables[i];
      if (t === cur) continue;
      var tR = t.getBoundingClientRect();
      var cand = false;
      if (isKey(code, KEY_CODES.DOWN) && tR.top >= cR.bottom - 5) cand = true;
      else if (isKey(code, KEY_CODES.UP) && tR.bottom <= cR.top + 5) cand = true;
      else if (isKey(code, KEY_CODES.RIGHT) && tR.left >= cR.right - 5) cand = true;
      else if (isKey(code, KEY_CODES.LEFT) && tR.right <= cR.left + 5) cand = true;
      if (cand) {
        var d = Math.pow((tR.left + tR.width/2) - (cR.left + cR.width/2), 2) + Math.pow((tR.top + tR.height/2) - (cR.top + cR.height/2), 2);
        if (d < minDist) { minDist = d; best = t; }
      }
    }
    if (best) { best.focus(); best.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  return { init: init, onBack: function(f){ cb.onBack = f; }, onEnter: function(f){ cb.onEnter = f; } };
})();
