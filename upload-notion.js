const https = require('https');
const fs = require('fs');

const TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = process.env.NOTION_PAGE_ID || '370291a09b41807da356f7ff20c77a42';
const IMG_BASE = 'https://raw.githubusercontent.com/ubin2914/face-balance/master/screenshots';

function makeRichText(text) {
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  text = text.trim();
  if (!text) return [{ type: 'text', text: { content: '' } }];

  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0, match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const c = text.slice(lastIndex, match.index);
      if (c) parts.push({ type: 'text', text: { content: c } });
    }
    if (match[0].startsWith('**'))
      parts.push({ type: 'text', text: { content: match[2] }, annotations: { bold: true } });
    else if (match[0].startsWith('*'))
      parts.push({ type: 'text', text: { content: match[3] }, annotations: { italic: true } });
    else
      parts.push({ type: 'text', text: { content: match[4] }, annotations: { code: true } });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const c = text.slice(lastIndex);
    if (c) parts.push({ type: 'text', text: { content: c } });
  }
  return parts.length > 0 ? parts : [{ type: 'text', text: { content: text } }];
}

function imageBlock(url) {
  return { type: 'image', image: { type: 'external', external: { url } } };
}

function parseMarkdown(content) {
  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading_1', heading_1: { rich_text: makeRichText(line.slice(2).trim()) } });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading_2', heading_2: { rich_text: makeRichText(line.slice(3).trim()) } });
      i++; continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading_3', heading_3: { rich_text: makeRichText(line.slice(4).trim()) } });
      i++; continue;
    }
    if (line.trim() === '---') {
      blocks.push({ type: 'divider', divider: {} });
      i++; continue;
    }
    if (line.startsWith('> ')) {
      const txt = line.slice(2).trim();
      blocks.push({ type: 'quote', quote: { rich_text: makeRichText(txt) } });
      i++; continue;
    }

    // 이미지
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
    if (imgMatch) {
      const filename = imgMatch[2].replace('screenshots/', '');
      blocks.push(imageBlock(`${IMG_BASE}/${filename}`));
      i++; continue;
    }

    // 테이블
    if (line.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      const dataRows = tableRows.filter(row => !row.match(/^\|[\s\-|:]+\|$/));
      if (dataRows.length > 0) {
        const parsedRows = dataRows.map(row =>
          row.split('|')
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map(cell => cell.trim())
        );
        const colCount = Math.max(...parsedRows.map(r => r.length));
        blocks.push({
          type: 'table',
          table: {
            table_width: colCount,
            has_column_header: true,
            has_row_header: false,
            children: parsedRows.map(row => ({
              type: 'table_row',
              table_row: {
                cells: Array.from({ length: colCount }, (_, ci) => makeRichText(row[ci] || ''))
              }
            }))
          }
        });
      }
      continue;
    }

    if (line.match(/^[-*] /)) {
      blocks.push({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: makeRichText(line.replace(/^[-*] /, '').trim()) } });
      i++; continue;
    }
    if (line.match(/^\d+\. /)) {
      blocks.push({ type: 'numbered_list_item', numbered_list_item: { rich_text: makeRichText(line.replace(/^\d+\. /, '').trim()) } });
      i++; continue;
    }
    if (line.trim() === '') { i++; continue; }
    if (line.trim()) {
      blocks.push({ type: 'paragraph', paragraph: { rich_text: makeRichText(line.trim()) } });
    }
    i++;
  }
  return blocks;
}

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'api.notion.com', path, method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const content = fs.readFileSync('/Users/kongyubin/face-balance/PORTFOLIO.md', 'utf8');
  const blocks = parseMarkdown(content);
  console.log(`📄 총 ${blocks.length}개 블록`);

  const BATCH = 100;
  for (let i = 0; i < blocks.length; i += BATCH) {
    const batch = blocks.slice(i, i + BATCH);
    const result = await apiRequest('PATCH', `/v1/blocks/${PAGE_ID}/children`, { children: batch });
    if (result.object === 'error') {
      console.error('❌', result.message);
      console.error(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`✅ ${i + 1}~${Math.min(i + BATCH, blocks.length)} 업로드`);
  }
  console.log('🎉 완료!');
}

main().catch(console.error);
