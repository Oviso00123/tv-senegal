/**
 * Modulo di Internazionalizzazione (i18n)
 * Supporta: Wolof (wo), Francese (fr), Inglese (en), Italiano (it)
 * Ottimizzato per TV browser senza dipendenze esterne
 */
var I18n = (function () {
  var supportedLanguages = ['wo', 'fr', 'en', 'it'];
  var currentLang = 'fr';
  var translations = {};

  function detectLanguage() {
    var savedLang = null;
    try {
      if (localStorage.getItem('tv_senegal_storage_allowed') !== 'false') {
        savedLang = localStorage.getItem('tv_senegal_lang');
      }
    } catch (e) {
      // Ignora restrizioni di storage legacy
    }

    if (savedLang && supportedLanguages.indexOf(savedLang) !== -1) {
      return savedLang;
    }

    var navLang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    for (var i = 0; i < supportedLanguages.length; i++) {
      if (navLang.indexOf(supportedLanguages[i]) === 0) {
        return supportedLanguages[i];
      }
    }
    return 'fr'; // Lingua ufficiale di default in Senegal
  }

  function init(callback) {
    currentLang = detectLanguage();
    loadLanguage(currentLang, callback);
  }

  function loadLanguage(lang, callback) {
    if (supportedLanguages.indexOf(lang) === -1) {
      lang = 'fr';
    }
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', '/locales/' + lang + '.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 304) {
          try {
            translations = JSON.parse(xhr.responseText);
            currentLang = lang;
            applyTranslations();
            if (typeof callback === 'function') {
              callback(null, translations);
            }
          } catch (err) {
            if (typeof callback === 'function') callback(err);
          }
        } else {
          if (typeof callback === 'function') callback(new Error('Errore caricamento traduzioni'));
        }
      }
    };
    xhr.send(null);
  }

  function t(key) {
    return translations[key] || key;
  }

  function applyTranslations() {
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      if (translations[key]) {
        el.textContent = translations[key];
      }
    }
  }

  function setLanguage(lang, callback) {
    loadLanguage(lang, function (err) {
      if (!err) {
        try {
          if (localStorage.getItem('tv_senegal_storage_allowed') !== 'false') {
            localStorage.setItem('tv_senegal_lang', lang);
          }
        } catch (e) {}
      }
      if (callback) callback(err);
    });
  }

  return {
    init: init,
    t: t,
    setLanguage: setLanguage,
    getCurrentLanguage: function () {
      return currentLang;
    }
  };
})();