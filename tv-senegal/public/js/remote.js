/**
 * Driver navigazione D-Pad per telecomandi Smart TV
 * Supporta: Samsung Tizen, LG webOS, Android TV Key Codes e tastiere standard.
 */
var RemoteController = (function () {
  var KEY_CODES = {
    LEFT: [37],
    UP: [38],
    RIGHT: [39],
    DOWN: [40],
    ENTER: [13],
    BACK: [8, 27, 461, 10009] // 8: Backspace, 27: Esc, 461: webOS Back, 10009: Tizen Back
  };

  var registeredCallbacks = {
    onBack: null,
    onEnter: null
  };

  function init() {
    window.addEventListener('keydown', handleKeyDown, true);
  }

  function isKey(keyCode, keyGroup) {
    return keyGroup.indexOf(keyCode) !== -1;
  }

  function handleKeyDown(e) {
    var code = e.keyCode || e.which;

    if (isKey(code, KEY_CODES.BACK)) {
      e.preventDefault();
      if (typeof registeredCallbacks.onBack === 'function') {
        registeredCallbacks.onBack();
      }
      return;
    }

    if (isKey(code, KEY_CODES.ENTER)) {
      var activeEl = document.activeElement;
      if (activeEl && typeof activeEl.click === 'function' && activeEl !== document.body) {
        // preventDefault evita il doppio click (manuale + nativo del browser)
        e.preventDefault();
        activeEl.click();
      }
      if (typeof registeredCallbacks.onEnter === 'function') {
        registeredCallbacks.onEnter(activeEl);
      }
      return;
    }

    if (isKey(code, KEY_CODES.UP) || isKey(code, KEY_CODES.DOWN) ||
        isKey(code, KEY_CODES.LEFT) || isKey(code, KEY_CODES.RIGHT)) {
      spatialNavigation(code);
      e.preventDefault();
    }
  }

  function getFocusableElements() {
    var modal = document.querySelector('.modal-backdrop:not(.hidden)');
    var selector = 'button, [tabindex="0"], a, input, select';
    var scope = modal ? modal : document;
    var elements = Array.prototype.slice.call(scope.querySelectorAll(selector));
    
    return elements.filter(function (el) {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled && !isInsideCollapsed(el);
    });
  }

  // La sidebar chiusa è solo traslata fuori schermo: i suoi elementi non devono ricevere il focus
  function isInsideCollapsed(el) {
    while (el) {
      if (el.classList && el.classList.contains('collapsed')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function spatialNavigation(directionCode) {
    var focusables = getFocusableElements();
    if (focusables.length === 0) return;

    var current = document.activeElement;
    var currentIndex = focusables.indexOf(current);

    if (currentIndex === -1) {
      focusables[0].focus();
      return;
    }

    var currentRect = current.getBoundingClientRect();
    var bestMatch = null;
    var minDistance = Number.MAX_VALUE;

    for (var i = 0; i < focusables.length; i++) {
      var target = focusables[i];
      if (target === current) continue;

      var targetRect = target.getBoundingClientRect();

      var isCandidate = false;
      if (isKey(directionCode, KEY_CODES.DOWN) && targetRect.top >= currentRect.bottom - 5) {
        isCandidate = true;
      } else if (isKey(directionCode, KEY_CODES.UP) && targetRect.bottom <= currentRect.top + 5) {
        isCandidate = true;
      } else if (isKey(directionCode, KEY_CODES.RIGHT) && targetRect.left >= currentRect.right - 5) {
        isCandidate = true;
      } else if (isKey(directionCode, KEY_CODES.LEFT) && targetRect.right <= currentRect.left + 5) {
        isCandidate = true;
      }

      if (isCandidate) {
        // Distanza euclidea tra centri con peso per penalizzare elementi disallineati
        var cx1 = currentRect.left + currentRect.width / 2;
        var cy1 = currentRect.top + currentRect.height / 2;
        var cx2 = targetRect.left + targetRect.width / 2;
        var cy2 = targetRect.top + targetRect.height / 2;
        var dist = Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2);

        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = target;
        }
      }
    }

    if (bestMatch) {
      bestMatch.focus();
      bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  return {
    init: init,
    onBack: function (fn) { registeredCallbacks.onBack = fn; },
    onEnter: function (fn) { registeredCallbacks.onEnter = fn; }
  };
})();