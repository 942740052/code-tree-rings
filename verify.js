/* 代码年轮 · 命令行自检
 * 直接 node verify.js 运行，不依赖浏览器。
 * 做法：从 index.html 抽出 <script> 内容，注入 DOM/Canvas 桩，跑 runSelfTest()。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('未找到 script 块'); process.exit(1); }
const code = m[1];

/* ---------- DOM 桩 ---------- */
let PASS = 0, FAIL = 0;
const ROWS = [];
const stBody = { innerHTML: '', appendChild: function (tr) { recordRow(tr); } };
const els = {};
function mkEl() {
  const e = {
    value: '', textContent: '', innerHTML: '', className: '', style: {},
    _cells: [],
    classList: { add: function () { }, remove: function () { }, toggle: function () { } },
    setAttribute: function () { }, getAttribute: function () { return null; },
    appendChild: function (c) { this._cells.push(c); },
    removeChild: function () { },
    addEventListener: function () { }, querySelectorAll: function () { return []; },
    getContext: function () { return mkCtx(); }, width: 0, height: 0,
    onclick: null, oninput: null, click: function () { }
  };
  return e;
}
function $(id) { if (id === 'stBody') return stBody; if (!els[id]) els[id] = mkEl(); return els[id]; }

/* ---------- Canvas 2D 桩 ---------- */
function mkCtx() {
  const c = {
    canvas: { width: 0, height: 0 },
    _alpha: 1, _font: '', _fill: '#000', _stroke: '#000',
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    lineWidth: 1, lineCap: 'butt', textAlign: 'left', textBaseline: 'alphabetic',
    save: function () { }, restore: function () { },
    beginPath: function () { }, closePath: function () { }, moveTo: function () { }, lineTo: function () { },
    arc: function () { }, arcTo: function () { }, rect: function () { },
    fill: function () { }, stroke: function () { }, clip: function () { },
    fillRect: function () { }, strokeRect: function () { }, clearRect: function () { },
    fillText: function () { }, strokeText: function () { },
    translate: function () { }, rotate: function () { }, scale: function () { },
    setTransform: function () { }, resetTransform: function () { },
    measureText: function (t) { return { width: String(t).length * 10 }; },
    createLinearGradient: function () { return { addColorStop: function () { } }; },
    createRadialGradient: function () { return { addColorStop: function () { } }; },
    createPattern: function () { return null; },
    getImageData: function (x, y, w, h) { return { data: [255, 255, 255, 255] }; },
    putImageData: function () { }, drawImage: function () { }
  };
  return c;
}

const sandbox = {
  console: console,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array,
  String: String, Number: Number, Boolean: Boolean, RegExp: RegExp,
  Error: Error, Promise: Promise, isNaN: isNaN, parseInt: parseInt,
  parseFloat: parseFloat, encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  document: {
    readyState: 'complete',
    getElementById: $,
    createElement: function (tag) {
      const e = mkEl();
      if (tag === 'canvas') { e.width = 300; e.height = 150; e.toBlob = function (cb) { cb({ size: 12345 }); }; }
      return e;
    },
    querySelector: function () { return mkEl(); },
    querySelectorAll: function () { return []; },
    addEventListener: function () { },
    body: { appendChild: function () { }, removeChild: function () { } }
  },
  location: { search: '?selftest=1' },
  navigator: {},
  localStorage: {
    _d: {},
    getItem: function (k) { return this._d[k] === undefined ? null : this._d[k]; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; }
  },
  FileReader: function () { },
  Blob: function () { },
  URL: { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () { } },
  ArrayBuffer: ArrayBuffer, Uint8Array: Uint8Array
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.__verify = { rows: ROWS };

function recordRow(tr) {
  const cells = tr._cells || [];
  const name = cells[1] ? cells[1].textContent : '(未知断言)';
  const res = cells[2] ? cells[2].textContent : '';
  const msg = cells[3] ? cells[3].textContent : '';
  if (res === 'FAIL') {
    FAIL++;
    ROWS.push('  FAIL  ' + name + (msg ? '  → ' + msg : ''));
  } else {
    PASS++;
    ROWS.push('  pass  ' + name);
  }
}

/* 拦截 tr.appendChild 以收集单元格 */
const origMk = mkEl;
function mkElTracked() {
  const e = origMk();
  e._cells = [];
  e.appendChild = function (c) { e._cells.push(c); };
  return e;
}
try {
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'index.html' });
} catch (e) {
  console.error('执行 script 出错：' + (e && e.stack ? e.stack : e));
  process.exit(1);
}

/* 等 toBlob 之类的微任务跑完 */
setTimeout(function () {
  console.log(ROWS.join('\n'));
  console.log('');
  console.log('结果：' + PASS + ' pass / ' + FAIL + ' fail');
  process.exit(FAIL > 0 ? 1 : 0);
}, 300);
