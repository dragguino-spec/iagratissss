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

  // 1. Check for explicit <antArtifact id="..." type="..." title="..."> tag structure (Claude native format)
  const tagRegex = /<antArtifact\s+(?:identifier|id)="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)">([\s\S]*?)(?:<\/antArtifact>|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const [, id, rawType, language, title, content] = match;
    const isComplete = text.includes('</antArtifact>');
    const type = mapRawTypeToArtifact(rawType, language);

    artifacts.push({
      id: id || `artifact-${Date.now()}`,
      title: title || 'Artifact sem título',
      type,
      language: language || type,
      content: content.trim(),
      isComplete,
    });
  }

  // 2. Fallback: Check for large standalone code blocks (html, tsx, jsx, svg, markdown) if no explicit antArtifact tag found
  if (artifacts.length === 0) {
    const codeBlockRegex = /```(html|tsx|jsx|svg|markdown|mermaid|json|python)\b\n([\s\S]*?)(?:```|$)/gi;
    let codeMatch: RegExpExecArray | null;

    let index = 1;
    while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
      const [, lang, content] = codeMatch;
      const cleanContent = content.trim();

      // Only elevate substantial code blocks (>10 lines or >150 chars) to artifacts
      if (cleanContent.length > 150 || cleanContent.split('\n').length > 8) {
        let type: 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid' = 'code';
        let title = `Artifact #${index}`;

        if (lang === 'html' || cleanContent.toLowerCase().includes('<!doctype html>')) {
          type = 'html';
          title = extractTitleFromHtml(cleanContent) || `Página HTML #${index}`;
        } else if (lang === 'tsx' || lang === 'jsx' || cleanContent.includes('export default function')) {
          type = 'react';
          title = extractTitleFromReact(cleanContent) || `Componente React #${index}`;
        } else if (lang === 'svg' || cleanContent.trim().startsWith('<svg')) {
          type = 'svg';
          title = `Vetor SVG #${index}`;
        } else if (lang === 'markdown') {
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
          isComplete: text.includes('```', codeMatch.index + 3),
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
  if (lang === 'tsx' || lang === 'jsx') return 'react';
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
    // Convert CamelCase to spaced Title
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
 * Updates or appends an artifact version in store
 */
export function updateArtifactInStore(
  existingArtifacts: Record<string, Artifact>,
  extracted: ExtractedArtifact
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
        },
      ],
    };

    return {
      updatedStore: { ...existingArtifacts, [extracted.id]: newArtifact },
      artifactId: extracted.id,
    };
  }

  // Check if content has changed noticeably for a new version
  const lastVersion = existing.versions[existing.versions.length - 1];
  if (lastVersion && lastVersion.content === extracted.content) {
    return { updatedStore: existingArtifacts, artifactId: extracted.id };
  }

  // Update current version in-place if completing live stream, or bump version
  const nextVersionNum = existing.versions.length + 1;
  const newVersion: ArtifactVersion = {
    version: nextVersionNum,
    timestamp: now,
    title: extracted.title,
    type: extracted.type,
    language: extracted.language,
    content: extracted.content,
  };

  const updatedArtifact: Artifact = {
    ...existing,
    title: extracted.title,
    currentVersion: nextVersionNum,
    updatedAt: now,
    versions: [...existing.versions, newVersion],
  };

  return {
    updatedStore: { ...existingArtifacts, [extracted.id]: updatedArtifact },
    artifactId: extracted.id,
  };
}
