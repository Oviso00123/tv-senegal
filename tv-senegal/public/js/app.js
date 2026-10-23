/**
 * Logica applicativa principale, gestione privacy e flusso UI
 */
(function () {
  var channels = [];
  var currentChannel = null;
  var lastStatus = null;
  var isStorageAllowed = true;
  var isSidebarOpen = true;
  var toastTimer = null;

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
    storageStatusTxt: document.getElementById('storage-status-text'),
    langButtons: document.querySelectorAll('.lang-btn'),
    toast: document.getElementById('toast-msg')
  };

  function init() {
    loadPrivacySetting();

    I18n.init(function () {
      RemoteController.init();
      RemoteController.onBack(handleBack);
      StreamPlayer.init(
        document.getElementById('main-video'),
        document.getElementById('youtube-iframe'),
        onStreamStatus
      );

      updateStorageToggleUI();
      updateLangButtons();
      bindEvents();
      loadChannels();
    });
  }

  /* ---------- Privacy / storage ---------- */
  function loadPrivacySetting() {
    try {
      var saved = localStorage.getItem('tv_senegal_storage_allowed');
      isStorageAllowed = (saved !== 'false');
    } catch (e) {
      isStorageAllowed = false;
    }
  }

  function updateStorageToggleUI() {
    if (isStorageAllowed) {
      DOM.storageToggle.classList.add('active');
      DOM.storageToggle.setAttribute('aria-checked', 'true');
      DOM.storageStatusTxt.textContent = I18n.t('storage_active');
    } else {
      DOM.storageToggle.classList.remove('active');
      DOM.storageToggle.setAttribute('aria-checked', 'false');
      DOM.storageStatusTxt.textContent = I18n.t('storage_disabled');
    }
  }

  function setStorageAllowed(allowed) {
    isStorageAllowed = allowed;
    try {
      if (!allowed) {
        localStorage.clear();
        localStorage.setItem('tv_senegal_storage_allowed', 'false');
      } else {
        localStorage.setItem('tv_senegal_storage_allowed', 'true');
        localStorage.setItem('tv_senegal_lang', I18n.getCurrentLanguage());
        if (currentChannel) {
          localStorage.setItem('tv_senegal_last_channel', currentChannel.id);
        }
      }
    } catch (e) {}
    updateStorageToggleUI();
  }

  /* ---------- Toast ---------- */
  function showToast(msg) {
    DOM.toast.textContent = msg;
    DOM.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      DOM.toast.classList.remove('show');
    }, 4000);
  }

  /* ---------- Canali ---------- */
  function loadChannels() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/channels.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 304) {
        try {
          channels = JSON.parse(xhr.responseText);
          renderChannelsList();
          checkInitialLaunch();
        } catch (e) {
          console.error('JSON parse error', e);
        }
      } else {
        console.error('channels.json non raggiungibile');
      }
    };
    xhr.send();
  }

  function renderChannelsList() {
    DOM.channelList.innerHTML = '';
    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      var btn = document.createElement('button');
      btn.className = 'channel-item dpad-nav';
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('data-id', ch.id);

      var img = document.createElement('img');
      img.className = 'logo';
      img.src = ch.logo;
      img.alt = ch.name;
      img.setAttribute('loading', 'lazy');

      var meta = document.createElement('div');
      meta.className = 'channel-meta';
      var title = document.createElement('div');
      title.className = 'channel-title';
      title.textContent = ch.name;
      var sub = document.createElement('div');
      sub.className = 'channel-sub';
      sub.textContent = ch.category + ' \u2022 ' + ch.type.toUpperCase();
      meta.appendChild(title);
      meta.appendChild(sub);

      btn.appendChild(img);
      btn.appendChild(meta);

      (function (channelData, element) {
        element.addEventListener('click', function () {
          selectChannel(channelData, true);
        });
      })(ch, btn);

      DOM.channelList.appendChild(btn);
    }
  }

  function selectChannel(ch, hideSidebarAfter) {
    currentChannel = ch;
    lastStatus = null;
    DOM.currentName.textContent = ch.name;

    var items = DOM.channelList.querySelectorAll('.channel-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('active');
      if (items[i].getAttribute('data-id') === ch.id) {
        items[i].classList.add('active');
      }
    }

    if (isStorageAllowed) {
      try {
        localStorage.setItem('tv_senegal_last_channel', ch.id);
      } catch (e) {}
    }

    StreamPlayer.playChannel(ch);

    // Dopo la scelta la barra si chiude: video a tutto schermo
    if (hideSidebarAfter && isSidebarOpen) {
      toggleSidebar();
    }
  }

  /* ---------- Avvio ---------- */
  function checkInitialLaunch() {
    var hasSeenGuide = false;
    try {
      hasSeenGuide = localStorage.getItem('tv_senegal_guide_viewed') === 'true';
    } catch (e) {}

    setTimeout(function () {
      DOM.splash.classList.add('hidden');

      if (!hasSeenGuide) {
        DOM.instructionsModal.classList.remove('hidden');
        DOM.btnCloseInstructions.focus();
      } else {
        restoreLastSession();
      }
    }, 700);
  }

  function restoreLastSession() {
    var targetChannel = channels[0];
    if (isStorageAllowed) {
      try {
        var lastId = localStorage.getItem('tv_senegal_last_channel');
        if (lastId) {
          for (var i = 0; i < channels.length; i++) {
            if (channels[i].id === lastId) {
              targetChannel = channels[i];
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (targetChannel) {
      selectChannel(targetChannel, false);
    }

    var activeEl = DOM.channelList.querySelector('.channel-item.active') ||
                   DOM.channelList.querySelector('.channel-item');
    if (activeEl) activeEl.focus();
  }

  /* ---------- Stato player ---------- */
  function renderStatusBadge(status) {
    if (!status) return;
    DOM.statusBadge.style.display = '';
    DOM.statusBadge.className = 'status-badge';
    if (status === 'LIVE') {
      DOM.statusBadge.classList.add('status-live');
      DOM.statusBadge.textContent = I18n.t('live');
    } else if (status === 'REPLAY') {
      DOM.statusBadge.classList.add('status-replay');
      DOM.statusBadge.textContent = I18n.t('replay');
    } else {
      DOM.statusBadge.classList.add('status-offline');
      DOM.statusBadge.textContent = I18n.t('offline');
    }
  }

  function onStreamStatus(status) {
    var previous = lastStatus;
    lastStatus = status;
    renderStatusBadge(status);

    if (status === 'OFFLINE' && previous !== 'OFFLINE') {
      showToast(I18n.t('stream_error'));
    } else if (status === 'REPLAY' && previous !== 'REPLAY') {
      showToast(I18n.t('offline_message'));
    } else if (status === 'LIVE' && previous === 'OFFLINE') {
      showToast(I18n.t('stream_repaired'));
    }
  }

  /* ---------- Sidebar e modali ---------- */
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    if (isSidebarOpen) {
      DOM.sidebar.classList.remove('collapsed');
      var activeItem = DOM.channelList.querySelector('.channel-item.active') ||
                       DOM.channelList.querySelector('.channel-item');
      if (activeItem) activeItem.focus();
    } else {
      DOM.sidebar.classList.add('collapsed');
      DOM.btnToggleMenu.focus();
    }
  }

  function isHidden(modal) {
    return modal.classList.contains('hidden');
  }

  function closeInstructions() {
    DOM.instructionsModal.classList.add('hidden');
    if (isStorageAllowed) {
      try {
        localStorage.setItem('tv_senegal_guide_viewed', 'true');
      } catch (e) {}
    }
    restoreLastSession();
  }

  function openSettings() {
    updateStorageToggleUI();
    updateLangButtons();
    DOM.settingsModal.classList.remove('hidden');
    DOM.btnCloseSettings.focus();
  }

  function closeSettings() {
    DOM.settingsModal.classList.add('hidden');
    DOM.btnSettings.focus();
  }

  function handleBack() {
    if (!isHidden(DOM.settingsModal)) {
      closeSettings();
    } else if (!isHidden(DOM.instructionsModal)) {
      closeInstructions();
    } else {
      toggleSidebar();
    }
  }

  function updateLangButtons() {
    var cur = I18n.getCurrentLanguage();
    for (var i = 0; i < DOM.langButtons.length; i++) {
      var b = DOM.langButtons[i];
      if (b.getAttribute('data-lang') === cur) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    }
  }

  function bindEvents() {
    DOM.btnToggleMenu.addEventListener('click', toggleSidebar);
    DOM.btnSettings.addEventListener('click', openSettings);
    DOM.btnCloseSettings.addEventListener('click', closeSettings);
    DOM.btnCloseInstructions.addEventListener('click', closeInstructions);

    DOM.btnReplay.addEventListener('click', function () {
      if (!currentChannel) return;
      if (!StreamPlayer.fallbackToYouTubeReplay()) {
        showToast(I18n.t('offline'));
      }
    });

    DOM.storageToggle.addEventListener('click', function () {
      setStorageAllowed(!isStorageAllowed);
    });

    for (var i = 0; i < DOM.langButtons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          I18n.setLanguage(btn.getAttribute('data-lang'), function (err) {
            if (err) return;
            updateLangButtons();
            updateStorageToggleUI();
            renderStatusBadge(lastStatus);
          });
        });
      })(DOM.langButtons[i]);
    }
  }

  init();
})();
