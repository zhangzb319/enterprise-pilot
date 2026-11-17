import React from 'react';
import { parseInlineSegments, parseMarkdownBlocks } from '../lib/markdown';

function InlineText({ text }: { text: string }) {
  const segments = parseInlineSegments(text);
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'bold') {
          return (
            <strong key={idx} className="font-semibold text-zinc-900">
              {seg.value}
            </strong>
          );
        }
        if (seg.type === 'code') {
          return (
            <code
              key={idx}
              className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] text-zinc-800 border border-zinc-200"
            >
              {seg.value}
            </code>
          );
        }
        return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
      })}
    </>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed text-zinc-700">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const cls =
            block.level === 1
              ? 'text-base font-semibold text-zinc-900 pt-1'
              : block.level === 2
                ? 'text-[14px] font-semibold text-zinc-900 pt-1'
                : 'text-[13px] font-semibold text-zinc-900 pt-0.5';
          return (
            <h4 key={idx} className={cls}>
              <InlineText text={block.text} />
            </h4>
          );
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag
              key={idx}
              className={`space-y-1 pl-4 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-zinc-400`}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-0.5">
                  <InlineText text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600"
            >
              <InlineText text={block.text} />
            </blockquote>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-md border border-zinc-200 bg-zinc-900 p-3 font-mono text-[12px] leading-5 text-zinc-100"
            >
              <code>{block.code}</code>
            </pre>
          );
        }
        return (
          <p key={idx}>
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
