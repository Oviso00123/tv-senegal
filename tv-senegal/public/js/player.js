/**
 * Player video per HLS e YouTube
 * Auto-riparazione: se il flusso fallisce chiede un URL nuovo a /api/stream/:id,
 * e se anche quello fallisce passa al replay YouTube.
 * HLS nativo per webOS/Tizen/Safari, hls.js come fallback.
 */
var StreamPlayer = (function () {
  var videoElement = null;
  var iframeElement = null;
  var hlsInstance = null;
  var currentChannel = null;
  var onStatusChangeCallback = null;

  // 0 = normale, 1 = URL rinnovato (secondo errore => replay), 2 = replay/offline definitivo
  var recoveryStage = 0;
  var isRefreshing = false;
  var mediaRecoveries = 0;

  function init(vidEl, ifrEl, onStatusCallback) {
    videoElement = vidEl;
    iframeElement = ifrEl;
    onStatusChangeCallback = onStatusCallback;
    attachVideoEvents();
  }

  function attachVideoEvents() {
    videoElement.addEventListener('playing', function () {
      if (recoveryStage === 1) recoveryStage = 0;
      notifyStatus('LIVE');
    });

    videoElement.addEventListener('error', function () {
      handleStreamError();
    });
  }

  function playChannel(channel) {
    currentChannel = channel;
    recoveryStage = 0;
    isRefreshing = false;

    if (channel.type === 'youtube') {
      showIframe(channel.source);
      notifyStatus('LIVE');
      return;
    }

    showVideo();
    resolveStartUrl(channel, function (url) {
      if (currentChannel !== channel) return; // l'utente ha cambiato canale
      if (url) {
        playHlsSource(url);
      } else {
        handleStreamError();
      }
    });
  }

  // Prova prima l'URL aggiornato dal backend (max 4 s), poi quello di channels.json
  function resolveStartUrl(channel, cb) {
    var done = false;
    function finish(url) {
      if (done) return;
      done = true;
      cb(url || channel.source || null);
    }
    var timer = setTimeout(function () { finish(null); }, 4000);

    if (!window.fetch) { clearTimeout(timer); finish(null); return; }
    fetch('/api/stream/' + encodeURIComponent(channel.id))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { clearTimeout(timer); finish(data && data.url); })
      .catch(function () { clearTimeout(timer); finish(null); });
  }

  function showVideo() {
    iframeElement.style.display = 'none';
    iframeElement.src = 'about:blank';
    videoElement.style.display = 'block';
  }

  function showIframe(url) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoElement.pause();
    videoElement.style.display = 'none';
    iframeElement.style.display = 'block';
    iframeElement.src = url;
  }

  function safePlay() {
    var p = videoElement.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err && err.name === 'NotAllowedError') {
          // Autoplay bloccato dal browser: riparte senza audio
          videoElement.muted = true;
          var p2 = videoElement.play();
          if (p2 && p2.catch) p2.catch(function () {});
        } else if (err && err.name !== 'AbortError') {
          handleStreamError();
        }
      });
    }
  }

  function playHlsSource(srcUrl) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    mediaRecoveries = 0;

    // HLS nativo (Samsung Tizen, LG webOS, iOS/Safari)
    if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = srcUrl;
      safePlay();
    }
    // hls.js (Android TV, Chrome, Firefox)
    else if (window.Hls && window.Hls.isSupported()) {
      hlsInstance = new window.Hls({
        enableWorker: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 2
      });

      hlsInstance.loadSource(srcUrl);
      hlsInstance.attachMedia(videoElement);

      hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function () {
        safePlay();
      });

      hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
        if (!data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
          mediaRecoveries++;
          hlsInstance.recoverMediaError();
        } else {
          handleStreamError();
        }
      });
    } else {
      videoElement.src = srcUrl;
      safePlay();
    }
  }

  function handleStreamError() {
    var ch = currentChannel;
    if (!ch || ch.type === 'youtube' || recoveryStage === 2 || isRefreshing) return;

    // Secondo errore dopo il rinnovo dell'URL: replay
    if (recoveryStage === 1) {
      giveUp();
      return;
    }

    recoveryStage = 1;
    isRefreshing = true;
    notifyStatus('OFFLINE');

    fetch('/api/stream/' + encodeURIComponent(ch.id) + '?refresh=true')
      .then(function (res) {
        if (!res.ok) throw new Error('Refresh failed');
        return res.json();
      })
      .then(function (data) {
        if (currentChannel !== ch) return;
        isRefreshing = false;
        if (data && data.url) {
          playHlsSource(data.url);   // lo stato LIVE arriva dall'evento "playing"
        } else {
          giveUp();
        }
      })
      .catch(function () {
        if (currentChannel !== ch) return;
        isRefreshing = false;
        giveUp();
      });
  }

  function giveUp() {
    if (!fallbackToYouTubeReplay()) {
      recoveryStage = 2;
      notifyStatus('OFFLINE');
    }
  }

  // Restituisce true se ha trovato un replay da mostrare
  function fallbackToYouTubeReplay() {
    if (!currentChannel) return false;
    var url = null;

    if (currentChannel.backupSource && currentChannel.backupSource.indexOf('youtube.com') !== -1) {
      url = currentChannel.backupSource;
    } else if (currentChannel.youtubeChannelId && currentChannel.youtubeChannelId.indexOf('UC') === 0) {
      url = 'https://www.youtube.com/embed/videoseries?list=UU' + currentChannel.youtubeChannelId.substring(2);
    }
    if (!url) return false;

    recoveryStage = 2;
    isRefreshing = false;
    showIframe(url);
    notifyStatus('REPLAY');
    return true;
  }

  function notifyStatus(status) {
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback(status);
    }
  }

  return {
    init: init,
    playChannel: playChannel,
    fallbackToYouTubeReplay: fallbackToYouTubeReplay,
    getCurrentChannel: function () { return currentChannel; }
  };
})();
