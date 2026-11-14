import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match links [label](url), inline code `code`, bold **text**, strikethrough ~~text~~, italic *text*
  const tokenRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*\n]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <a
          key={`lnk-${keyIdx++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-500 transition-colors break-all"
        >
          {match[1]}
        </a>
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-amber-700 dark:text-amber-300 font-mono-code text-[0.85em]"
        >
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-neutral-900 dark:text-white">
          {renderInline(match[4])}
        </strong>
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <del key={`del-${keyIdx++}`} className="line-through opacity-75">
          {renderInline(match[5])}
        </del>
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <em key={`i-${keyIdx++}`} className="italic text-neutral-700 dark:text-neutral-300">
          {renderInline(match[6])}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      elements.push(<hr key={`hr-${blockKey++}`} className="my-3 border-neutral-200 dark:border-neutral-700/70" />);
      i++;
      continue;
    }

    // Headings (# .. ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const headingClasses =
        level === 1
          ? 'text-lg font-bold text-neutral-900 dark:text-white mt-4 mb-1.5'
          : level === 2
            ? 'text-base font-bold text-neutral-900 dark:text-white mt-3.5 mb-1'
            : level === 3
              ? 'text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-1'
              : 'text-xs font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 mt-2.5 mb-1';
      elements.push(
        <div key={`h-${blockKey++}`} className={headingClasses}>
          {renderInline(headingText)}
        </div>
      );
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${blockKey++}`}
          className="my-2.5 pl-3.5 pr-3 py-2 border-l-3 border-amber-500/80 bg-amber-500/5 dark:bg-amber-500/10 rounded-r-xl text-neutral-700 dark:text-neutral-300 text-[13px] leading-relaxed space-y-1"
        >
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="m-0">
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Markdown table (| a | b |)
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|[\s:-|]+\|\s*$/.test(lines[i + 1])
    ) {
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(lines[i]);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      elements.push(
        <div key={`tbl-${blockKey++}`} className="my-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/80">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="bg-white/60 dark:bg-transparent">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                      {renderInline(r[cIdx] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list (- or *)
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${blockKey++}`} className="my-2 pl-5 list-disc space-y-1 text-neutral-800 dark:text-neutral-200">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. )
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${blockKey++}`} className="my-2 pl-5 list-decimal space-y-1 text-neutral-800 dark:text-neutral-200">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph (accumulate consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^([-*_])\1{2,}$/.test(lines[i].trim()) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('|')
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    elements.push(
      <p key={`p-${blockKey++}`} className="leading-relaxed whitespace-pre-wrap break-words">
        {paraLines.map((pl, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(pl)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className={`space-y-2 ${className}`}>{elements}</div>;
};
