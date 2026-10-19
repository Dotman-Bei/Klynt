// Klynt score bridge hooks for Hextris.
(function () {
  var origInit = window.init;
  window.init = function (b) { var r = origInit.apply(this, arguments); KlyntBridge.start(); return r; };
  var origOver = window.gameOverDisplay;
  window.gameOverDisplay = function () { var r = origOver.apply(this, arguments); KlyntBridge.end(window.score); return r; };
  KlyntBridge.getScore = function () { return window.score || 0; };
})();
