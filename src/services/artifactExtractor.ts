import { Artifact, ArtifactVersion } from '../types';

export interface ExtractedArtifact {
  id: string;
  title: string;
  type: 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid';
  language?: string;
  content: string;
  isComplete: boolean;
}

/**
 * Extracts artifact declarations and code blocks from assistant text.
 */
export function extractArtifactsFromText(text: string): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];

  // 1. Check for explicit <antArtifact ...> tag structure (Claude native format, attributes in any order)
  const tagRegex = /<antArtifact\s+([^>]+)>([\s\S]*?)(?:<\/antArtifact>|$)/gi;
  let match: RegExpExecArray | null;

  const extractAttr = (attrs: string, namePattern: string): string | undefined => {
    const m = attrs.match(new RegExp(`(?:${namePattern})\\s*=\\s*["']([^"']+)["']`, 'i'));
    return m ? m[1] : undefined;
  };

  while ((match = tagRegex.exec(text)) !== null) {
    const [, attrStr, content] = match;
    const id = extractAttr(attrStr, 'identifier|id');
    const rawType = extractAttr(attrStr, 'type') || 'code';
    const language = extractAttr(attrStr, 'language');
    const title = extractAttr(attrStr, 'title');
    const isComplete = match[0].toLowerCase().endsWith('</antartifact>');
    const type = mapRawTypeToArtifact(rawType, language);

    artifacts.push({
      id: id || `artifact-${artifacts.length + 1}`,
      title: title || 'Artifact sem título',
      type,
      language: language || type,
      content: content.trim(),
      isComplete,
    });
  }

  // 2. Fallback: Check for large standalone code blocks (html, tsx, jsx, svg, markdown) if no explicit antArtifact tag found
  if (artifacts.length === 0) {
    const codeBlockRegex = /```(html|tsx|jsx|react|ts|js|svg|markdown|md|mermaid|json|python)\b[^\n]*\r?\n([\s\S]*?)(?:```|$)/gi;
    let codeMatch: RegExpExecArray | null;

    let index = 1;
    while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
      const [, rawLang, content] = codeMatch;
      const lang = rawLang.toLowerCase();
      const cleanContent = content.trim();

      // Only elevate substantial code blocks (>8 lines or >150 chars) to artifacts
      if (cleanContent.length > 150 || cleanContent.split('\n').length > 8) {
        let type: 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid' = 'code';
        let title = `Artifact #${index}`;

        if (lang === 'html' || cleanContent.toLowerCase().includes('<!doctype html>')) {
          type = 'html';
          title = extractTitleFromHtml(cleanContent) || `Página HTML #${index}`;
        } else if (
          lang === 'tsx' ||
          lang === 'jsx' ||
          lang === 'react' ||
          cleanContent.includes('export default function') ||
          cleanContent.includes('export default ')
        ) {
          type = 'react';
          title = extractTitleFromReact(cleanContent) || `Componente React #${index}`;
        } else if (lang === 'svg' || cleanContent.trim().startsWith('<svg')) {
          type = 'svg';
          title = `Vetor SVG #${index}`;
        } else if (lang === 'markdown' || lang === 'md') {
          type = 'markdown';
          title = extractTitleFromMarkdown(cleanContent) || `Documento Markdown #${index}`;
        } else if (lang === 'mermaid') {
          type = 'mermaid';
          title = `Diagrama Mermaid #${index}`;
        }

        artifacts.push({
          id: `extracted-${lang}-${index}`,
          title,
          type,
          language: lang,
          content: cleanContent,
          isComplete: codeMatch[0].endsWith('```'),
        });
        index++;
      }
    }
  }

  return artifacts;
}

function mapRawTypeToArtifact(rawType: string, lang?: string): 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid' {
  const lower = (rawType || '').toLowerCase();
  if (lower.includes('html') || lower.includes('application/vnd.ant.html')) return 'html';
  if (lower.includes('react') || lower.includes('jsx') || lower.includes('tsx')) return 'react';
  if (lower.includes('svg') || lower.includes('image/svg+xml')) return 'svg';
  if (lower.includes('markdown') || lower.includes('text/markdown')) return 'markdown';
  if (lower.includes('mermaid') || lower.includes('diagram')) return 'mermaid';
  if (lang === 'tsx' || lang === 'jsx' || lang === 'react') return 'react';
  if (lang === 'html') return 'html';
  if (lang === 'svg') return 'svg';
  return 'code';
}

function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) return titleMatch[1].trim();
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) return h1Match[1].replace(/<[^>]+>/g, '').trim();
  return null;
}

function extractTitleFromReact(code: string): string | null {
  const match = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (match && match[1]) {
    return match[1].replace(/([A-Z])/g, ' $1').trim();
  }
  return null;
}

function extractTitleFromMarkdown(md: string): string | null {
  const h1Match = md.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) return h1Match[1].trim();
  return null;
}

/**
 * Updates or appends an artifact version in store without creating 200 versions during streaming.
 */
export function updateArtifactInStore(
  existingArtifacts: Record<string, Artifact>,
  extracted: ExtractedArtifact,
  sourceMessageId?: string
): { updatedStore: Record<string, Artifact>; artifactId: string } {
  const now = new Date().toISOString();
  const existing = existingArtifacts[extracted.id];

  if (!existing) {
    const newArtifact: Artifact = {
      id: extracted.id,
      title: extracted.title,
      type: extracted.type,
      language: extracted.language,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          version: 1,
          timestamp: now,
          title: extracted.title,
          type: extracted.type,
          language: extracted.language,
          content: extracted.content,
          ...(sourceMessageId ? { sourceMessageId } : {}),
        } as ArtifactVersion & { sourceMessageId?: string },
      ],
    };

    return {
      updatedStore: { ...existingArtifacts, [extracted.id]: newArtifact },
      artifactId: extracted.id,
    };
  }

  const lastVersion = existing.versions[existing.versions.length - 1] as (ArtifactVersion & { sourceMessageId?: string }) | undefined;
  if (lastVersion && lastVersion.content === extracted.content) {
    return { updatedStore: existingArtifacts, artifactId: extracted.id };
  }

  // Update the active streaming version in-place if triggered from the same assistant message
  if (lastVersion && sourceMessageId && lastVersion.sourceMessageId === sourceMessageId) {
    const updatedVersions = [...existing.versions];
    updatedVersions[updatedVersions.length - 1] = {
      ...lastVersion,
      timestamp: now,
      title: extracted.title,
      type: extracted.type,
      language: extracted.language,
      content: extracted.content,
    };
    return {
      updatedStore: {
        ...existingArtifacts,
        [extracted.id]: {
          ...existing,
          title: extracted.title,
          type: extracted.type,
          language: extracted.language,
          updatedAt: now,
          versions: updatedVersions,
        },
      },
      artifactId: extracted.id,
    };
  }

  const nextVersionNum = existing.versions.length + 1;
  const newVersion = {
    version: nextVersionNum,
    timestamp: now,
    title: extracted.title,
    type: extracted.type,
    language: extracted.language,
    content: extracted.content,
    ...(sourceMessageId ? { sourceMessageId } : {}),
  } as ArtifactVersion;

  const updatedArtifact: Artifact = {
    ...existing,
    title: extracted.title,
    type: extracted.type,
    language: extracted.language,
    currentVersion: nextVersionNum,
    updatedAt: now,
    versions: [...existing.versions, newVersion],
  };

  return {
    updatedStore: { ...existingArtifacts, [extracted.id]: updatedArtifact },
    artifactId: extracted.id,
  };
}
