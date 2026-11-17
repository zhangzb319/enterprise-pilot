import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineSegments, parseMarkdownBlocks } from './markdown';

test('parseMarkdownBlocks parses headings, lists, code fences, and blockquotes', () => {
  const md = [
    '## 会议纪要',
    '',
    '- 议题一：**前端重构**',
    '- 议题二：接口联调',
    '',
    '> 已同步至项目组',
    '',
    '```ts',
    'const ok = true;',
    '```',
  ].join('\n');

  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks[0], { type: 'heading', level: 2, text: '会议纪要' });
  assert.deepEqual(blocks[1], { type: 'list', ordered: false, items: ['议题一：**前端重构**', '议题二：接口联调'] });
  assert.deepEqual(blocks[2], { type: 'blockquote', text: '已同步至项目组' });
  assert.deepEqual(blocks[3], { type: 'code', lang: 'ts', code: 'const ok = true;' });
});

test('parseInlineSegments extracts bold and inline code tokens', () => {
  const segs = parseInlineSegments('请查看 `POST /api/projects` 中的 **权限** 说明');
  assert.deepEqual(segs, [
    { type: 'text', value: '请查看 ' },
    { type: 'code', value: 'POST /api/projects' },
    { type: 'text', value: ' 中的 ' },
    { type: 'bold', value: '权限' },
    { type: 'text', value: ' 说明' },
  ]);
});
