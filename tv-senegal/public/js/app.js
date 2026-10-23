(function () {
  var channels = [], currentChannel = null, isStorageAllowed = true, isSidebarOpen = true;
  var DOM = {
    splash: document.getElementById('splash-screen'),
    sidebar: document.getElementById('sidebar'),
    channelList: document.getElementById('channel-list'),
    currentName: document.getElementById('current-channel-name'),
    statusBadge: document.getElementById('stream-status-badge'),
    btnToggleMenu: document.getElementById('btn-toggle-menu'),
    btnSettings: document.getElementById('btn-settings'),
    btnReplay: document.getElementById('btn-replay'),
    instructionsModal: document.getElementById('instructions-modal'),
    btnCloseInstructions: document.getElementById('btn-close-instructions'),
    settingsModal: document.getElementById('settings-modal'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    storageToggle: document.getElementById('storage-toggle'),
    storageStatusTxt: document.getElementById('storage-status-text')
  };
  function init() {
    try { isStorageAllowed = (localStorage.getItem('tv_senegal_storage_allowed') !== 'false'); } catch(e){ isStorageAllowed = false; }
    updateToggleUI();
    I18n.init(function () {
      RemoteController.init();
      StreamPlayer.init(document.getElementById('main-video'), document.getElementById('youtube-iframe'), updateStatus);
      bind();
      loadChannels();
    });
  }
  function updateToggleUI() {
    if (isStorageAllowed) { DOM.storageToggle.classList.add('active'); DOM.storageStatusTxt.textContent = I18n.t('storage_active'); }
    else { DOM.storageToggle.classList.remove('active'); DOM.storageStatusTxt.textContent = I18n.t('storage_disabled'); }
  }
  function setStorageAllowed(v) {
    isStorageAllowed = v;
    try {
      if (!v) { localStorage.clear(); localStorage.setItem('tv_senegal_storage_allowed', 'false'); }
      else { localStorage.setItem('tv_senegal_storage_allowed', 'true'); if (currentChannel) localStorage.setItem('tv_senegal_last_channel', currentChannel.id); }
    } catch(e) {}
    updateToggleUI();
  }
  function loadChannels() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/channels.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 304)) {
        channels = JSON.parse(xhr.responseText);
        renderChannels();
        checkStartup();
      }
    };
    xhr.send();
  }
  function renderChannels() {
    DOM.channelList.innerHTML = '';
    channels.forEach(function (ch) {
      var btn = document.createElement('button');
      btn.className = 'channel-item dpad-nav';
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('data-id', ch.id);
      btn.innerHTML = '<img class="logo" src="' + ch.logo + '" alt="' + ch.name + '" />' +
        '<div class="channel-meta"><div class="channel-title">' + ch.name + '</div><div class="channel-sub">' + ch.category + ' &bull; ' + ch.type.toUpperCase() + '</div></div>';
      btn.addEventListener('click', function () { selectChannel(ch); });
      DOM.channelList.appendChild(btn);
    });
  }
  function selectChannel(ch) {
    currentChannel = ch;
    DOM.currentName.textContent = ch.name;
    var items = DOM.channelList.querySelectorAll('.channel-item');
    items.forEach(function(i){ i.classList.remove('active'); if(i.getAttribute('data-id') === ch.id) i.classList.add('active'); });
    if (isStorageAllowed) { try { localStorage.setItem('tv_senegal_last_channel', ch.id); } catch(e){} }
    StreamPlayer.playChannel(ch);
  }
  function checkStartup() {
    var seen = false;
    try { seen = localStorage.getItem('tv_senegal_guide_viewed') === 'true'; } catch(e){}
    setTimeout(function () {
      DOM.splash.classList.add('hidden');
      if (!seen) {
        DOM.instructionsModal.classList.remove('hidden');
        DOM.btnCloseInstructions.focus();
      } else {
        restore();
      }
    }, 700);
  }
  function restore() {
    var target = channels[0];
    if (isStorageAllowed) {
      try {
        var lid = localStorage.getItem('tv_senegal_last_channel');
        if (lid) { for(var i=0; i<channels.length; i++) if(channels[i].id === lid) { target = channels[i]; break; } }
      } catch(e){}
    }
    if (target) selectChannel(target);
    var first = DOM.channelList.querySelector('.channel-item');
    if (first) first.focus();
  }
  function updateStatus(status) {
    DOM.statusBadge.className = 'status-badge';
    if (status === 'LIVE') { DOM.statusBadge.classList.add('status-live'); DOM.statusBadge.textContent = I18n.t('live'); }
    else if (status === 'REPLAY') { DOM.statusBadge.classList.add('status-replay'); DOM.statusBadge.textContent = I18n.t('replay'); }
    else { DOM.statusBadge.classList.add('status-offline'); DOM.statusBadge.textContent = I18n.t('offline'); }
  }
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    if (isSidebarOpen) { DOM.sidebar.classList.remove('collapsed'); var a = DOM.channelList.querySelector('.channel-item.active') || DOM.channelList.querySelector('.channel-item'); if (a) a.focus(); }
    else { DOM.sidebar.classList.add('collapsed'); DOM.btnToggleMenu.focus(); }
  }
  function bind() {
    DOM.btnToggleMenu.addEventListener('click', toggleSidebar);
    DOM.btnReplay.addEventListener('click', function () { StreamPlayer.fallbackToYouTubeReplay(); });
    DOM.btnSettings.addEventListener('click', function () { DOM.settingsModal.classList.remove('hidden'); DOM.storageToggle.focus(); });
    DOM.btnCloseSettings.addEventListener('click', function () { DOM.settingsModal.classList.add('hidden'); DOM.btnSettings.focus(); });
    DOM.btnCloseInstructions.addEventListener('click', function () {
      DOM.instructionsModal.classList.add('hidden');
      try { if (isStorageAllowed) localStorage.setItem('tv_senegal_guide_viewed', 'true'); } catch(e){}
      restore();
    });
    DOM.storageToggle.addEventListener('click', function () { setStorageAllowed(!isStorageAllowed); });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang');
        I18n.setLanguage(lang, function () {
          document.querySelectorAll('.lang-btn').forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          updateToggleUI();
        });
      });
    });
    RemoteController.onBack(function () {
      if (!DOM.instructionsModal.classList.contains('hidden')) { DOM.btnCloseInstructions.click(); return; }
      if (!DOM.settingsModal.classList.contains('hidden')) { DOM.btnCloseSettings.click(); return; }
      toggleSidebar();
    });
  }
  window.addEventListener('DOMContentLoaded', init);
})();
