/* 从 SUBMIT.md 提取三段可复制内容：
 *   1) 标题（复制到标题栏）
 *   2) 正文（复制到正文框）
 *   3) 标签（复制到标签栏）
 * 输出到 post-title.txt / post-body.md / post-tag.txt
 * 用法：node extract-post.js
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, 'SUBMIT.md'), 'utf8');

/* 标题：第一个 ``` 代码块 */
const titleM = raw.match(/## [^\n]*标题[\s\S]*?```[^\S\r\n]*\r?\n([^\r\n]+)\r?\n```/);
const bodyM = raw.match(/```markdown[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```/);
const tagM = raw.match(/## [^\n]*话题标签[\s\S]*?```[^\S\r\n]*\r?\n([^\r\n]+)\r?\n```/);

if (!titleM || !bodyM || !tagM) {
  console.error('未能从 SUBMIT.md 解析出三段内容');
  process.exit(1);
}

const title = titleM[1].trim();
const body = bodyM[1].trim();
const tag = tagM[1].trim();

fs.writeFileSync(path.join(__dirname, 'post-title.txt'), title, 'utf8');
fs.writeFileSync(path.join(__dirname, 'post-body.md'), body + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, 'post-tag.txt'), tag, 'utf8');

console.log('已生成三份可复制文件：');
console.log('  post-title.txt  ' + title.length + ' 字符');
console.log('  post-body.md    ' + body.length + ' 字符');
console.log('  post-tag.txt    ' + tag.length + ' 字符');
console.log('');
console.log('--- 标题 ---');
console.log(title);
console.log('--- 标签 ---');
console.log(tag);
console.log('--- 正文首 3 行 ---');
body.split('\n').slice(0, 3).forEach(l => console.log(l));
console.log('...');
console.log('--- 正文末 2 行 ---');
body.split('\n').slice(-2).forEach(l => console.log(l));
