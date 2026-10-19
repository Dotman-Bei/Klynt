// Klynt score bridge. Loaded inside each hosted game's iframe.
// Posts run events to the Klynt page on the same origin. It reports; it does not validate.
// A client-reported score is never enough for a reward on its own (PRD 6.2).
(function () {
  var startedAt = null;
  var origin = window.location.origin;
  function post(msg) {
    if (window.parent && window.parent !== window) window.parent.postMessage(msg, origin);
  }
  window.KlyntBridge = {
    getScore: function () { return 0; },
    start: function () {
      startedAt = Date.now();
      post({ type: 'klynt:run-start' });
    },
    end: function (score) {
      var n = Math.max(0, Math.floor(Number(score) || 0));
      post({ type: 'klynt:run-end', score: n, durationMs: startedAt ? Date.now() - startedAt : 0 });
      startedAt = null;
    },
  };
  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data) return;
    if (e.data.type === 'klynt:end-request') window.KlyntBridge.end(window.KlyntBridge.getScore());
    // The page may mount after this script ran and missed 'ready'; it pings, we answer.
    if (e.data.type === 'klynt:ping') post({ type: 'klynt:ready' });
  });
  post({ type: 'klynt:ready' });
})();
