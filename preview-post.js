/* 极简 Markdown -> HTML 渲染器（仅用于校验投稿文案的渲染效果） */
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'post-body.md'), 'utf8');

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, function (m, c) {
    codes.push(c);
    return '' + (codes.length - 1) + '';
  });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(\d+)/g, function (m, i) {
    return '<code>' + esc(codes[+i]) + '</code>';
  });
  return s;
}

const lines = md.split('\n');
const out = [];
let i = 0;

while (i < lines.length) {
  const l = lines[i];

  if (/^```/.test(l)) {
    const buf = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
    i++;
    out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
    continue;
  }
  if (/^\|/.test(l) && /^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
    const head = l.split('|').slice(1, -1).map(c => c.trim());
    i += 2;
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) {
      rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
      i++;
    }
    out.push('<table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
    continue;
  }
  const hm = /^(#{1,6})\s+(.*)$/.exec(l);
  if (hm) { out.push('<h' + hm[1].length + '>' + inline(hm[2]) + '</h' + hm[1].length + '>'); i++; continue; }
  if (/^---+$/.test(l)) { out.push('<hr>'); i++; continue; }
  if (/^>\s?/.test(l)) {
    const buf = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
    out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
    continue;
  }
  if (/^[-*]\s+/.test(l)) {
    const buf = [];
    while (i < lines.length && /^[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
    out.push('<ul>' + buf.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>');
    continue;
  }
  if (/^\d+\.\s+/.test(l)) {
    const buf = [];
    while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
    out.push('<ol>' + buf.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>');
    continue;
  }
  if (!l.trim()) { i++; continue; }
  const buf = [];
  while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|\s*[-*]\s|\d+\.\s|```|\|)/.test(lines[i])) {
    buf.push(lines[i]); i++;
  }
  out.push('<p>' + inline(buf.join(' ')) + '</p>');
}

const html = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN"><head><meta charset="utf-8"><title>发帖预览</title>',
  '<style>',
  'body{margin:0;background:#F7F7F7;font:15px/1.75 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#222;display:flex;justify-content:center}',
  '.wrap{width:1000px;background:#fff;padding:26px 34px 60px;box-shadow:0 0 0 1px #e3e3e3;margin:20px 0}',
  'h1{font-size:25px;margin:0 0 18px}',
  'h2{font-size:19px;margin:32px 0 12px;padding-bottom:7px;border-bottom:1px solid #e6e6e6}',
  'p{margin:0 0 14px}',
  'img{max-width:100%;border-radius:8px;display:block;margin:6px 0 18px;border:1px solid #eee}',
  'code{background:#f4f4f4;padding:2px 6px;border-radius:4px;font:13px Consolas,monospace;color:#c7254e}',
  'pre{background:#f4f4f4;padding:14px 16px;border-radius:8px;overflow-x:auto;font:13px/1.6 Consolas,monospace}',
  'pre code{background:none;padding:0;color:#333}',
  'blockquote{border-left:3px solid #ddd;margin:0 0 14px;padding:2px 0 2px 16px;color:#555}',
  'ul,ol{padding-left:26px;margin:0 0 14px}',
  'li{margin-bottom:5px}',
  'table{border-collapse:collapse;margin:0 0 16px;width:100%}',
  'th,td{border:1px solid #ddd;padding:7px 11px;text-align:left}',
  'th{background:#f6f6f6}',
  'a{color:#1758a0}',
  'hr{border:0;border-top:1px solid #e6e6e6;margin:28px 0}',
  '</style></head><body><div class="wrap">',
  out.join('\n'),
  '</div></body></html>'
].join('\n');

fs.writeFileSync(path.join(__dirname, 'post-preview.html'), html, 'utf8');
console.log('已生成 post-preview.html');
console.log('图片:', (html.match(/<img /g) || []).length,
  ' 链接:', (html.match(/<a href/g) || []).length,
  ' 表格:', (html.match(/<table>/g) || []).length,
  ' h2:', (html.match(/<h2>/g) || []).length,
  ' 引用:', (html.match(/<blockquote>/g) || []).length);
