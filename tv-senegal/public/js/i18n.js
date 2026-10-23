var I18n = (function () {
  var supportedLanguages = ['wo', 'fr', 'en', 'it'];
  var currentLang = 'fr';
  var translations = {};
  function detectLanguage() {
    var savedLang = null;
    try { if (localStorage.getItem('tv_senegal_storage_allowed') !== 'false') savedLang = localStorage.getItem('tv_senegal_lang'); } catch (e) {}
    if (savedLang && supportedLanguages.indexOf(savedLang) !== -1) return savedLang;
    var navLang = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    for (var i = 0; i < supportedLanguages.length; i++) {
      if (navLang.indexOf(supportedLanguages[i]) === 0) return supportedLanguages[i];
    }
    return 'fr';
  }
  function init(callback) { currentLang = detectLanguage(); loadLanguage(currentLang, callback); }
  function loadLanguage(lang, callback) {
    if (supportedLanguages.indexOf(lang) === -1) lang = 'fr';
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
            if (callback) callback(null, translations);
          } catch (err) { if (callback) callback(err); }
        } else { if (callback) callback(new Error('Error i18n')); }
      }
    };
    xhr.send(null);
  }
  function t(k) { return translations[k] || k; }
  function applyTranslations() {
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var key = elements[i].getAttribute('data-i18n');
      if (translations[key]) elements[i].textContent = translations[key];
    }
  }
  function setLanguage(lang, callback) {
    loadLanguage(lang, function (err) {
      if (!err) {
        try { if (localStorage.getItem('tv_senegal_storage_allowed') !== 'false') localStorage.setItem('tv_senegal_lang', lang); } catch (e) {}
      }
      if (callback) callback(err);
    });
  }
  return { init: init, t: t, setLanguage: setLanguage, getCurrentLanguage: function() { return currentLang; } };
})();
