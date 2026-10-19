// Patches the vendored open-source games in public/games for Klynt:
// strips ads, analytics, remote scripts and the old Galaxy Gaming coin API, and wires in the score bridge.
// Run once after copying fresh upstream sources: node scripts/vendor-games.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../public/games/', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');
const write = (p, s) => writeFileSync(new URL(p, root), s);

function cut(src, from, to, label) {
  const a = src.indexOf(from);
  if (a < 0) throw new Error(`${label}: start not found`);
  const b = src.indexOf(to, a);
  if (b < 0) throw new Error(`${label}: end not found`);
  return src.slice(0, a) + src.slice(b + to.length);
}

// ---------- Hextris (GPL-3.0) ----------
{
  let html = read('hextris/index.html');
  html = html.replace(/\s*<script data-ad-client[^\n]*\n/, '\n');
  html = html.replace(/\s*<script> \(function\(i,s,o,g,r,a,m\)[\s\S]*?<\/script>\n/, '\n');
  html = cut(html, '<script type="text/javascript">\n\t\t\t\t(function addRussianSocialShare', '</script>', 'hextris share');
  html = html.replace(/\s*<script type="text\/javascript" src='vendor\/rrssb.min.js'><\/script>/, '');
  html = html.replace("<link href='http://fonts.googleapis.com", "<link href='https://fonts.googleapis.com");
  html = html.replace('</body>', '\t<script src="../klynt-bridge.js"></script>\n\t\t<script src="klynt-hook.js"></script>\n\t</body>');
  write('hextris/index.html', html);

  let init = read('hextris/js/initialization.js');
  init = cut(init, '(function(i, s, o, g, r, a, m) {', "ga('send', 'pageview');", 'hextris ga');
  write('hextris/js/initialization.js', init);

  let main = read('hextris/js/main.js');
  main = main.replace("$.get('http://54.183.184.126/' + String(score))", '');
  main = cut(main, '(function(){\n    \tvar script = document.createElement(\'script\');', '})()', 'hextris remote a.js');
  write('hextris/js/main.js', main);

  write('hextris/klynt-hook.js', `// Klynt score bridge hooks for Hextris.
(function () {
  var origInit = window.init;
  window.init = function (b) { var r = origInit.apply(this, arguments); KlyntBridge.start(); return r; };
  var origOver = window.gameOverDisplay;
  window.gameOverDisplay = function () { var r = origOver.apply(this, arguments); KlyntBridge.end(window.score); return r; };
  KlyntBridge.getScore = function () { return window.score || 0; };
})();
`);
}

// ---------- Tower Blocks (MIT, CodePen) ----------
{
  let js = read('tower-blocks/script.js');
  js = cut(js, 'var score = this.scoreContainer.innerHTML;\n            (async() => {', '})();', 'tower start fetch');
  const a = js.indexOf('    async endGame() {');
  const b = js.indexOf('    tick() {', a);
  if (a < 0 || b < 0) throw new Error('tower endGame not found');
  js = js.slice(0, a) + `    endGame() {
        this.updateState(this.STATES.ENDED);
        KlyntBridge.end(this.blocks.length - 2);
    }
` + js.slice(b);
  js = js.replace("this.updateState(this.STATES.PLAYING);\n            this.addBlock();", "this.updateState(this.STATES.PLAYING);\n            this.addBlock();\n            KlyntBridge.start();");
  js += `\nKlyntBridge.getScore = function () { return Math.max(0, game.blocks.length - 2); };\n`;
  write('tower-blocks/script.js', js);
  write('tower-blocks/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,user-scalable=no">
<title>Tower Blocks</title>
<link rel="stylesheet" href="./style.css">
</head>
<body>
<div id="container">
  <div id="game"></div>
  <div id="score">0</div>
  <div id="instructions">Click (or press the spacebar) to place the block</div>
  <div class="game-over"><h2>Game Over</h2><p>Click or spacebar to start again</p></div>
  <div class="game-ready"><div id="start-button">Start</div><div></div></div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r83/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/TweenMax.min.js"></script>
<script src="../klynt-bridge.js"></script>
<script src="./script.js"></script>
</body>
</html>
`);
  write('tower-blocks/LICENSE.md', `Tower Blocks by ste-vg (https://codepen.io/ste-vg/pen/ppLQNW), published on CodePen.
Public CodePen pens are licensed under the MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

Klynt changes: removed the Galaxy Gaming coin API calls, added the Klynt score bridge.
`);
}

// ---------- Astray (public domain) ----------
{
  let html = read('astray/index.html');
  // Upstream loads its textures from the site root; Klynt serves it from /games/astray/.
  html = html.replace(/loadTexture\('\/(ball|concrete|brick)\.png'\)/g, "loadTexture('$1.png')");
  if (!html.includes('klynt-bridge.js')) {
    html = html.replace('</body>', '    <script src="../klynt-bridge.js"></script>\n    <script>KlyntBridge.start(); KlyntBridge.getScore = function () { return Math.max(0, Math.floor((mazeDimension - 1) / 2 - 4) - 1); };</script>\n</body>');
  }
  write('astray/index.html', html);
}

console.log('patched hextris, tower-blocks, astray');
