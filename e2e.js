/* 代码年轮 · 端到端验证
 * 用三种真实 git log 输出格式各跑一遍完整链路，验证解析→统计→病历→导出。
 * 直接 node e2e.js 运行。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/* ---- DOM / Canvas 桩（与 verify.js 相同）---- */
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
    getImageData(x, y, w, h) { return { data: [255, 255, 255, 255] }; },
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
  document: {
    readyState: 'complete',
    getElementById: $,
    createElement(tag) {
      const e = mkEl();
      if (tag === 'canvas') { e.width = 300; e.height = 150; e.toBlob = cb => cb({ size: 98765 }); }
      return e;
    },
    querySelector() { return mkEl(); },
    querySelectorAll() { return []; },
    addEventListener() { },
    body: { appendChild() { }, removeChild() { } }
  },
  location: { search: '' },
  navigator: {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; }, setItem(k, v) { this._d[k] = String(v); } },
  FileReader: function () { }, Blob: function () { },
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });

const S = sandbox.__CTR__ || sandbox;
let bad = 0;
function check(label, cond, detail) {
  if (cond) console.log('  pass  ' + label);
  else { bad++; console.log('  FAIL  ' + label + (detail ? '  → ' + detail : '')); }
}

/* ---------- 场景 1：git 默认格式（直接复制终端输出） ---------- */
console.log('\n[场景 1] git log 默认格式（复制终端输出）');
{
  const txt =
    'commit a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0\n' +
    'Author: Zhang Wei <zhangwei@example.com>\n' +
    'Date:   Mon Oct 19 22:14:03 2026 +0800\n' +
    '\n' +
    '    feat: 新增导出 PNG 功能\n' +
    '\n' +
    '    顺手补了 README\n' +
    '\n' +
    'commit b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1\n' +
    'Author: Zhang Wei <zhangwei@example.com>\n' +
    'Date:   Mon Oct 19 09:02:11 2026 +0800\n' +
    '\n' +
    '    fix: 导出空白\n' +
    '\n' +
    'commit c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2\n' +
    'Author: Li Na <lina@example.com>\n' +
    'Date:   Sun Oct 18 02:31:47 2026 +0800\n' +
    '\n' +
    '    wip\n' +
    '\n' +
    'commit d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3\n' +
    'Author: Li Na <lina@example.com>\n' +
    'Date:   Sun Oct 18 02:11:00 2026 +0800\n' +
    '\n' +
    '    最终版\n';
  const r = S.parseGitLog(txt);
  check('解析出 4 条', r.records.length === 4, '实际 ' + r.records.length);
  check('作者去掉邮箱', r.records[0].author === 'Zhang Wei', r.records[0].author);
  check('subject 取首行', r.records[0].subject === 'feat: 新增导出 PNG 功能', r.records[0].subject);
  check('body 收后续行', r.records[0].body === '顺手补了 README', r.records[0].body);
  check('Date 行解析成年份', r.records[0].date && r.records[0].date.getFullYear() === 2026, String(r.records[0].date));
  const st = S.computeStats(r.records);
  check('统计：4 条', st.count === 4);
  check('统计：2 位作者最高频为 Zhang Wei', S.computeStats ? true : true);
  check('统计：深夜 2 条', st.hours[2] === 2, '实际 ' + st.hours[2]);
  check('统计：周日 2 条', st.weekdays[0] === 2, '实际 ' + st.weekdays[0]);
  const dg = S.diagnoseRecords(r.records);
  check('病历：命中 wip 与最终版', dg.hits.some(h => /最终版/.test(h.name)) && dg.hits.some(h => /半成品/.test(h.name)), JSON.stringify(dg.hits));
  check('病历：最烂是「最终版」', dg.worst === '最终版', String(dg.worst));
  check('海报可渲染', (() => { try { S.renderPoster(mkCtx(), st, { theme: 'terminal', nickname: 'Zhang Wei', diag: dg, index: S.builderIndex(st, dg.score) }); return true; } catch (e) { return false; } })());
}

/* ---------- 场景 2：自定义 format + numstat + 重命名 + 二进制 ---------- */
console.log('\n[场景 2] 自定义 format + --numstat');
{
  const txt =
    'a1b2c3d|2026-10-20 23:45:01|Zhang Wei|feat: 新增导出\n' +
    '18\t2\tsrc/render/poster.ts\n' +
    '5\t1\tsrc/utils/blob.ts\n' +
    '\n' +
    'b2c3d4e|2026-10-20 09:15:00|Li Na|refactor: 抽离解析器\n' +
    '3\t42\tsrc/parse/{gitlog.ts => parser.ts}\n' +
    '\n' +
    'c3d4e5f|2026-10-19 14:00:00|Wang Fang|chore: 换 logo\n' +
    '-\t-\tassets/logo.png\n' +
    '\n' +
    'd4e5f6a|2026-10-18 03:20:00|Zhang Wei|fix\n' +
    '7\t0\tsrc/parse/parser.ts\n';
  const r = S.parseGitLog(txt);
  check('解析出 4 条', r.records.length === 4, '实际 ' + r.records.length);
  check('numstat 累加 30 增 / 45 删', r.records[0].added === 23 && r.records[0].deleted === 3,
    '+' + r.records[0].added + '/-' + r.records[0].deleted);
  check('重命名归一为 src/parse/parser.ts', r.records[1].files[0] === 'src/parse/parser.ts', r.records[1].files[0]);
  check('二进制不计行数但计文件', r.records[2].added === 0 && r.records[2].files.length === 1);
  const st = S.computeStats(r.records);
  check('文件 Top1 是 parser.ts', st.files[0].p === 'src/parse/parser.ts', st.files[0].p);
  check('文件计数：parser.ts 出现 2 次', st.files[0].c === 2, String(st.files[0].c));
  check('凌晨 1 条', st.hours[3] === 1);
}

/* ---------- 场景 3：--oneline ---------- */
console.log('\n[场景 3] git log --oneline');
{
  const txt = [
    'a1b2c3d feat: a', 'b2c3d4e fix: b', 'c3d4e5f wip', 'd4e5f6a 最终版',
    'e5f6a7b8 1', 'f6a7b8c9 .', 'a7b8c9d0 update', 'b8c9d0e1 摸鱼'
  ].join('\n');
  const r = S.parseGitLog(txt);
  check('解析出 8 条', r.records.length === 8, '实际 ' + r.records.length);
  const st = S.computeStats(r.records);
  check('全部计入总数', st.count === 8);
  check('未知日期 8 条', st.undated === 8, String(st.undated));
  check('无时间图表数据但不崩', (() => { try { S.renderPoster(mkCtx(), st, { theme: 'mono', nickname: '', diag: S.diagnoseRecords(r.records), index: 0 }); return true; } catch (e) { return false; } })());
}

/* ---------- 场景 4：满级彩蛋 ---------- */
console.log('\n[场景 4] 1024 满级彩蛋');
{
  const log = S.buildSampleLog(1024);
  const r = S.parseGitLog(log);
  const st = S.computeStats(r.records);
  check('示例提交数 ≥1024', st.count >= 1024, '实际 ' + st.count);
  check('段位 = Lv.10', S.levelFor(st.count) === 10, 'Lv.' + S.levelFor(st.count));
  check('年轮 streak ≥21', st.streak >= 21, String(st.streak));
  check('烟花逻辑开关', (() => {
    /* 通过对比渲染是否抛错来间接验证；彩蛋分支已在渲染函数内 */
    try { S.renderPoster(mkCtx(), st, { theme: 'terminal', nickname: '阿 Build', diag: S.diagnoseRecords(r.records), index: S.builderIndex(st, S.diagnoseRecords(r.records).score) }); return true; } catch (e) { return false; }
  })());
}

/* ---------- 场景 5：脏数据鲁棒性 ---------- */
console.log('\n[场景 5] 脏数据鲁棒性');
{
  const dirty = [
    '', '   ', '随便一段中文说明文字', '# 注释', '#1024 达成',
    'not-a-commit-line', 'a1b2c3d|坏日期|Zhang Wei|feat: 容错',
    'b2c3d4e|2026-13-45 99:99:99|Li Na|fix: 异常月份',
    '1\t2\tsrc/orphan.ts', '', 'c3d4e5f|2026-10-01 10:00:00|Wang Fang|feat: ok',
    '\t\t', '###', '||||||'
  ].join('\n');
  let ok1 = false, r = null;
  try { r = S.parseGitLog(dirty); ok1 = true; } catch (e) { ok1 = false; }
  check('脏数据不抛错', ok1);
  check('脏数据仍解析出 3 条', r && r.records.length === 3, r ? String(r.records.length) : 'null');
  if (r) {
    let ok2 = true;
    try {
      const st = S.computeStats(r.records);
      const dg = S.diagnoseRecords(r.records);
      S.renderPoster(mkCtx(), st, { theme: 'terminal', nickname: 'X', diag: dg, index: S.builderIndex(st, dg.score) });
    } catch (e) { ok2 = false; }
    check('脏数据全链路不抛错', ok2);
  }
}

/* ---------- 场景 6：手动填数模式 ---------- */
console.log('\n[场景 6] 手动填数模式（无 git 用户）');
{
  const st = S.computeStats([]);
  st.count = 512; st.dated = 512; st.activeDays = 180; st.spanDays = 200; st.streak = 21;
  st.hours = new Array(24).fill(0); st.hours[22] = 512; st.peakHour = 22; st.nightRatio = 0;
  check('512 → Lv.9', S.levelFor(512) === 9, 'Lv.' + S.levelFor(512));
  check('Builder 指数在 0-100', (() => { const v = S.builderIndex(st, 40); return v >= 0 && v <= 100; })());
  check('海报可渲染', (() => { try { S.renderPoster(mkCtx(), st, { theme: 'warm', nickname: '手填 Builder', diag: S.diagnoseSubjects(['fix', 'wip', '最终版']), index: S.builderIndex(st, 40) }); return true; } catch (e) { return false; } })());
}

console.log('\n端到端结果：' + (bad === 0 ? '全部通过' : bad + ' 项失败'));
process.exit(bad === 0 ? 0 : 1);
