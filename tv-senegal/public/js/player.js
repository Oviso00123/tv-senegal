var StreamPlayer = (function () {
  var video = null, iframe = null, hls = null, current = null, isRecovering = false, onStatus = null;
  function init(v, ifr, cb) { video = v; iframe = ifr; onStatus = cb; video.addEventListener('playing', function(){ isRecovering = false; notify('LIVE'); }); video.addEventListener('error', handleError); }
  function notify(s) { if (onStatus) onStatus(s); }
  function playChannel(ch) {
    current = ch; isRecovering = false;
    if (ch.type === 'youtube') { showIframe(ch.source); notify('LIVE'); return; }
    showVideo(); playHls(ch.source);
  }
  function showVideo() { iframe.style.display = 'none'; iframe.src = 'about:blank'; video.style.display = 'block'; }
  function showIframe(u) { if (hls) { hls.destroy(); hls = null; } video.pause(); video.style.display = 'none'; iframe.style.display = 'block'; iframe.src = u; }
  function playHls(url) {
    if (hls) { hls.destroy(); hls = null; }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      var p = video.play();
      if (p) p.catch(handleError);
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({ enableWorker: true, manifestLoadingTimeOut: 8000 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, function () { video.play(); });
      hls.on(window.Hls.Events.ERROR, function (ev, data) { if (data.fatal) handleError(); });
    } else {
      video.src = url; video.play();
    }
  }
  function handleError() {
    if (isRecovering) return;
    isRecovering = true;
    notify('OFFLINE');
    if (!current) return;
    fetch('/api/stream/' + current.id + '?refresh=true')
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d && d.url) { playHls(d.url); notify('LIVE'); } else fallback(); })
      .catch(fallback);
  }
  function fallback() {
    notify('REPLAY');
    if (current && current.backupSource) showIframe(current.backupSource);
    else if (current && current.youtubeChannelId) {
      showIframe('https://www.youtube.com/embed/videoseries?list=UU' + current.youtubeChannelId.substring(2));
    }
  }
  return { init: init, playChannel: playChannel, fallbackToYouTubeReplay: fallback };
})();
