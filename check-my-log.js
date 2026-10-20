/* 用真实仓库数据验证作品解析链路 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function mkCtx() {
  return {
    canvas: { width: 0, height: 0 },
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    lineWidth: 1, lineCap: 'butt', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '#000', strokeStyle: '#000', font: '',
    save() { }, restore() { }, beginPath() { }, closePath() { },
    moveTo() { }, lineTo() { }, arc() { }, arcTo() { }, rect() { },
    fill() { }, stroke() { }, clip() { }, fillRect() { }, strokeRect() { }, clearRect() { },
    fillText() { }, strokeText() { }, translate() { }, rotate() { }, scale() { },
    setTransform() { }, resetTransform() { },
    measureText(t) { return { width: String(t).length * 10 }; },
    createLinearGradient() { return { addColorStop() { } }; },
    createRadialGradient() { return { addColorStop() { } }; },
    createPattern() { return null; },
    getImageData() { return { data: [255, 255, 255, 255] }; },
    putImageData() { }, drawImage() { }
  };
}
const els = {};
function mkEl() {
  return {
    value: '', textContent: '', innerHTML: '', className: '', style: {}, _cells: [],
    classList: { add() { }, remove() { }, toggle() { } },
    setAttribute() { }, getAttribute() { return null; },
    appendChild(c) { this._cells.push(c); }, removeChild() { },
    addEventListener() { }, querySelectorAll() { return []; },
    getContext() { return mkCtx(); }, width: 0, height: 0,
    onclick: null, oninput: null, click() { }
  };
}
function $(id) { if (!els[id]) els[id] = mkEl(); return els[id]; }
const sandbox = {
  console, setTimeout, clearTimeout, Date, Math, JSON, Object, Array,
  String, Number, Boolean, RegExp, Error, Promise, isNaN, parseInt, parseFloat,
  encodeURIComponent, decodeURIComponent,
  TextDecoder: TextDecoder, Uint8Array: Uint8Array,
  document: {
    readyState: 'complete', getElementById: $,
    createElement(tag) {
      const e = mkEl();
      if (tag === 'canvas') { e.width = 300; e.height = 150; e.toBlob = cb => cb({ size: 98765 }); }
      return e;
    },
    querySelector() { return mkEl(); }, querySelectorAll() { return []; },
    addEventListener() { }, body: { appendChild() { }, removeChild() { } }
  },
  location: { search: '' }, navigator: {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; }, setItem(k, v) { this._d[k] = String(v); } },
  FileReader: function () { }, Blob: function () { },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });
const S = sandbox.__CTR__;

/* my-gitlog.txt 可能是 UTF-8 或 UTF-16（Windows 重定向），按 BOM 自动判断 */
const raw = fs.readFileSync(path.join(__dirname, 'my-gitlog.txt'));
const txt = (raw[0] === 0xFF && raw[1] === 0xFE) ? raw.toString('utf16le') : raw.toString('utf8');
const r = S.parseGitLog(txt);
const st = S.computeStats(r.records);
const dg = S.diagnoseRecords(r.records);

console.log('=== 解析结果 ===');
console.log('提交数      :', st.count, ' 截断:', r.truncated);
console.log('有日期      :', st.dated, ' 无日期:', st.undated);
console.log('作者        :', [...new Set(r.records.map(x => x.author))].join(', '));
console.log('首条/末条   :', st.firstDate && st.firstDate.toLocaleString('zh-CN'), '/', st.lastDate && st.lastDate.toLocaleString('zh-CN'));
console.log('活跃天数    :', st.activeDays, ' 跨度:', st.spanDays, ' 最长连续:', st.streak);
console.log('段位        : Lv.' + S.levelFor(st.count), S.LEVELS[S.levelFor(st.count)].name);
console.log('Builder 指数:', S.builderIndex(st, dg.score));
console.log('增/删行     :', st.added, '/', st.deleted);
console.log('文件数      :', st.fileTouched);
console.log('峰值小时    :', st.peakHour, '点');
console.log('');
console.log('=== 病历本 ===');
console.log('敷衍指数    :', dg.score, ' 等级:', dg.grade && dg.grade.name);
console.log('最该枪毙    :', dg.worst);
console.log('病种        :', dg.hits.map(h => h.name + '×' + h.c).join('  '));
console.log('');
console.log('=== Top 文件 ===');
st.files.slice(0, 8).forEach(f => console.log('  ' + String(f.c).padStart(4) + '  ' + f.p));
/* 注意：S.files 只保留 Top 5，中文路径要从全部记录里找 */
const allFiles = [];
r.records.forEach(x => x.files.forEach(f => allFiles.push(f)));
const zh = [...new Set(allFiles.filter(f => /[一-龥]/.test(f)))];
console.log('');
console.log('中文路径文件 :', zh.length, '个');
zh.slice(0, 4).forEach(f => console.log('        ' + f));
console.log('');
console.log('=== 提交列表 ===');
r.records.forEach(x => console.log('  ' + x.hash + '  ' + x.date.toLocaleString('zh-CN') + '  ' + x.subject.slice(0, 40)));
console.log('');
/* 判定：提交数与输入里的提交头数一致、有日期、有行数、有文件 */
const heads = (txt.replace(/^﻿/, '').match(/^[0-9a-f]{7,40}\|/gm) || []).length;
const ok = st.count === heads && st.dated === heads && st.added > 0 && st.fileTouched > 0;
console.log(ok ? '✓ 真实数据解析正常' : '✗ 解析异常（提交头 ' + heads + '，解析出 ' + st.count + '）');
process.exit(ok ? 0 : 1);
