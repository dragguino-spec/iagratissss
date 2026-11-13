import JSZip from 'jszip';
import { AttachmentKind, ChatAttachment } from '../types';

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB chunks for streaming upload & byte scanning
const FULL_TEXT_LIMIT = 180 * 1024; // 180 KB inline text directly
const JSZIP_MAX_IN_MEMORY = 80 * 1024 * 1024; // 80 MB safe limit for full JSZip unpacking in browser

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'pyw', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
  'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'kts', 'dart', 'lua', 'r', 'scala', 'sh', 'bash',
  'zsh', 'fish', 'ps1', 'bat', 'cmd', 'sql', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'svg',
  'xml', 'xsd', 'xsl', 'json', 'jsonl', 'ndjson', 'yaml', 'yml', 'toml', 'ini', 'env', 'vue',
  'svelte', 'astro', 'prisma', 'graphql', 'gql', 'proto', 'tf', 'tfvars', 'hcl', 'gradle', 'cmake',
  'makefile', 'dockerfile', 'nix', 'zig', 'elm', 'ex', 'exs', 'erl', 'clj', 'cljs', 'pl', 'pm',
]);

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'mdx', 'csv', 'tsv', 'log', 'out', 'err', 'conf', 'cfg', 'properties',
  'srt', 'vtt', 'ass', 'sub', 'tex', 'bib', 'rst', 'adoc', 'org', 'gitignore', 'gitattributes',
  'editorconfig', 'npmrc', 'yarnrc', 'htaccess', 'robots', 'diff', 'patch',
]);

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'avif', 'tiff', 'tif', 'heic', 'heif', 'jfif',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'weba', 'wma', 'aiff', 'amr', 'mid', 'midi',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv', '3gp', 'wmv', 'mpg', 'mpeg', 'ts', 'mts',
]);

const OFFICE_EXTENSIONS = new Set([
  'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'doc', 'xls', 'ppt',
]);

const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'apk', 'jar', 'war', 'ipa', 'iso', 'cab',
]);

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val >= 10 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

export function getExtension(filename: string): string {
  const base = filename.split('/').pop() || filename;
  if (!base.includes('.')) {
    const lower = base.toLowerCase();
    if (lower === 'dockerfile' || lower === 'makefile') return lower;
    return '';
  }
  return (base.split('.').pop() || '').toLowerCase();
}

export function inferMimeType(file: File): string {
  if (file.type && file.type.trim()) return file.type;
  const ext = getExtension(file.name);
  const map: Record<string, string> = {
    md: 'text/markdown',
    txt: 'text/plain',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    json: 'application/json',
    jsonl: 'application/x-ndjson',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    xml: 'application/xml',
    svg: 'image/svg+xml',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    js: 'text/javascript',
    jsx: 'text/javascript',
    py: 'text/x-python',
    sql: 'application/sql',
    log: 'text/plain',
    pdf: 'application/pdf',
    zip: 'application/zip',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext] || 'application/octet-stream';
}

async function sniffTextRatio(file: File): Promise<boolean> {
  const slice = file.slice(0, Math.min(file.size, 32 * 1024));
  const buf = new Uint8Array(await slice.arrayBuffer());
  if (buf.length === 0) return true;
  let printable = 0;
  let nulls = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0) {
      nulls++;
    } else if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b >= 128) {
      printable++;
    }
  }
  if (nulls > 2) return false;
  return printable / buf.length >= 0.85;
}

export async function detectAttachmentKind(file: File): Promise<AttachmentKind> {
  const ext = getExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  // .ts can be TypeScript source or MPEG-TS video: sniff bytes if needed
  if (ext === 'ts' && mime.startsWith('video/')) return 'video';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (IMAGE_EXTENSIONS.has(ext) || (mime.startsWith('image/') && !mime.includes('svg'))) return 'image';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (AUDIO_EXTENSIONS.has(ext) || mime.startsWith('audio/')) return 'audio';
  if (VIDEO_EXTENSIONS.has(ext) || mime.startsWith('video/')) return 'video';
  if (OFFICE_EXTENSIONS.has(ext)) return 'office';
  if (ARCHIVE_EXTENSIONS.has(ext) || mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
    return 'archive';
  }
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript')) {
    return 'text';
  }

  // Fallback sniff: unknown extension or empty MIME type -> check if readable UTF-8/ASCII text
  if (await sniffTextRatio(file)) {
    return 'text';
  }
  return 'binary';
}

function detectMagicSignature(bytes: Uint8Array): string {
  if (bytes.length < 4) return 'Arquivo pequeno/desconhecido';
  const hex = Array.from(bytes.slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  const ascii4 = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  if (ascii4 === '%PDF') return 'PDF Document (%PDF)';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    return 'ZIP / OOXML / APK / JAR Container (PK)';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'PNG Image';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'JPEG Image';
  if (ascii4 === 'GIF8') return 'GIF Image';
  if (ascii4 === 'RIFF') return 'RIFF Container (WAV / AVI / WebP)';
  if (ascii4 === 'OggS') return 'Ogg Audio/Video';
  if (ascii4 === 'fLaC') return 'FLAC Audio';
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'MP3 Audio (ID3)';
  if (bytes.length >= 8 && String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === 'ftyp') {
    return 'MP4 / M4A / MOV (ISO BMFF)';
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'Matroska / WebM Video';
  }
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return 'Linux ELF Executable/Library';
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return 'Windows PE Executable/DLL (MZ)';
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return 'GZIP Compressed Archive';
  if (bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf) return '7-Zip Archive';
  if (ascii4 === 'Rar!') return 'RAR Archive';
  if (ascii4 === 'SQLi') return 'SQLite 3 Database';
  if (ascii4 === 'PAR1') return 'Apache Parquet Columnar Data';
  if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) return 'WebAssembly Binary (.wasm)';
  return `Binário genérico (Header: ${hex})`;
}

function extractPrintableStrings(bytes: Uint8Array, minLen = 6, maxChars = 6000): string {
  const results: string[] = [];
  let current = '';
  let total = 0;

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 9) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= minLen) {
        results.push(current.trim());
        total += current.length + 1;
        if (total >= maxChars) break;
      }
      current = '';
    }
  }
  if (current.length >= minLen && total < maxChars) {
    results.push(current.trim());
  }
  return results.filter(Boolean).join('\n');
}

async function countNewlinesStreaming(file: File): Promise<{ lines: number; isLikelyMinified: boolean }> {
  let lines = 1;
  let offset = 0;
  let checkedFirstChunk = false;
  let firstChunkNewlines = 0;

  while (offset < file.size) {
    const end = Math.min(file.size, offset + CHUNK_SIZE_BYTES);
    const buf = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    let chunkLines = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 10) chunkLines++;
    }
    lines += chunkLines;
    if (!checkedFirstChunk) {
      checkedFirstChunk = true;
      firstChunkNewlines = chunkLines;
    }
    offset = end;
  }

  return {
    lines,
    isLikelyMinified: file.size > 20 * 1024 && firstChunkNewlines < 3,
  };
}

async function extractTextFileAnalysis(file: File, kind: AttachmentKind): Promise<{ summary: string; extractedText: string }> {
  const ext = getExtension(file.name);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  if (file.size <= FULL_TEXT_LIMIT) {
    const fullText = decoder.decode(await file.arrayBuffer());
    const lineCount = fullText.split('\n').length;
    let extraNote = '';

    if (ext === 'csv' || ext === 'tsv') {
      const firstLine = fullText.split(/\r?\n/)[0] || '';
      const delim = ext === 'tsv' ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
      const cols = firstLine.split(delim).map((c) => c.trim());
      extraNote = `[CSV/TSV: ${lineCount} linhas, ${cols.length} colunas (${cols.slice(0, 15).join(', ')})]\n`;
    }

    return {
      summary: `${formatFileSize(file.size)} · ${lineCount.toLocaleString('pt-BR')} linhas`,
      extractedText: `${extraNote}${fullText}`,
    };
  }

  // Large text/code/log/csv up to 500 MB: stream line count + head & tail slices cleanly
  const { lines } = await countNewlinesStreaming(file);
  const headBytes = new Uint8Array(await file.slice(0, 90 * 1024).arrayBuffer());
  const tailStart = Math.max(90 * 1024, file.size - 45 * 1024);
  const tailBytes = new Uint8Array(await file.slice(tailStart, file.size).arrayBuffer());

  const headText = decoder.decode(headBytes);
  const tailText = decoder.decode(tailBytes);

  let csvHeaderInfo = '';
  if (ext === 'csv' || ext === 'tsv') {
    const firstLine = headText.split(/\r?\n/)[0] || '';
    const delim = ext === 'tsv' ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
    const cols = firstLine.split(delim).map((c) => c.trim());
    csvHeaderInfo = `- Colunas detectadas (${cols.length}): ${cols.slice(0, 30).join(' | ')}\n`;
  }

  const extractedText =
    `[ARQUIVO ${kind === 'code' ? 'DE CÓDIGO' : 'DE TEXTO/DADOS'} GRANDE — AMOSTRAGEM ESTRUTURADA]\n` +
    `- Tamanho total: ${formatFileSize(file.size)} (${file.size.toLocaleString('pt-BR')} bytes)\n` +
    `- Total exato de linhas: ${lines.toLocaleString('pt-BR')}\n` +
    csvHeaderInfo +
    `\n--- INÍCIO DO ARQUIVO (primeiros ${formatFileSize(headBytes.length)}) ---\n` +
    headText +
    `\n\n--- ... [${formatFileSize(Math.max(0, file.size - headBytes.length - tailBytes.length))} omitidos no meio para economia de contexto] ... ---\n\n` +
    `--- FINAL DO ARQUIVO (últimos ${formatFileSize(tailBytes.length)}) ---\n` +
    tailText;

  return {
    summary: `${formatFileSize(file.size)} · ${lines.toLocaleString('pt-BR')} linhas (amostra inteligente)`,
    extractedText,
  };
}

async function compressImageForVision(file: File): Promise<{ dataUrl?: string; width?: number; height?: number }> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return {};

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Imagem não decodificada nativamente no navegador'));
      el.src = objectUrl;
    });

    const maxDim = 1600;
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    if (targetW > maxDim || targetH > maxDim) {
      const ratio = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.round(targetW * ratio);
      targetH = Math.round(targetH * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, targetW);
    canvas.height = Math.max(1, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: img.naturalWidth, height: img.naturalHeight };

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const outMime = file.type === 'image/png' && file.size < 1.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(outMime, 0.85);

    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    // Fallback if small non-standard image or canvas unavailable
    if (file.size <= 2 * 1024 * 1024) {
      const dataUrl = await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      });
      return { dataUrl };
    }
    return {};
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readLargeZipDirectoryTail(file: File): Promise<{ entriesCount: number; previewList: string }> {
  // Parse ZIP Central Directory headers safely from the last 2 MB of a massive (80MB-500MB) archive
  const tailSize = Math.min(file.size, 2 * 1024 * 1024);
  const buf = new Uint8Array(await file.slice(file.size - tailSize, file.size).arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  const entries: string[] = [];
  for (let i = 0; i <= buf.length - 46; i++) {
    // Central directory file header signature: 0x02014b50 ('PK\x01\x02')
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      const compressedSize = view.getUint32(i + 20, true);
      const uncompressedSize = view.getUint32(i + 24, true);
      const nameLen = view.getUint16(i + 28, true);
      const extraLen = view.getUint16(i + 30, true);
      const commentLen = view.getUint16(i + 32, true);
      if (i + 46 + nameLen <= buf.length && nameLen > 0 && nameLen < 512) {
        const name = decoder.decode(buf.subarray(i + 46, i + 46 + nameLen));
        entries.push(`- ${name} (${formatFileSize(uncompressedSize)}, comprimido ${formatFileSize(compressedSize)})`);
        i += 45 + nameLen + extraLen + commentLen;
      }
    }
  }

  if (entries.length === 0) {
    return {
      entriesCount: 0,
      previewList: 'Arquivo ZIP muito grande para descompactação total no navegador; metadados da estrutura central não encontrados nos últimos 2 MB (possível ZIP64 ou arquivo corrompido).',
    };
  }

  return {
    entriesCount: entries.length,
    previewList: entries.slice(0, 220).join('\n') + (entries.length > 220 ? `\n... +${entries.length - 220} arquivos no diretório central.` : ''),
  };
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<w:p\b[^>]*>/gi, '\n')
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:br\b[^>]*\/>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractZipOrOfficeAnalysis(file: File, kind: AttachmentKind): Promise<{ summary: string; extractedText: string }> {
  const ext = getExtension(file.name);

  if (file.size > JSZIP_MAX_IN_MEMORY) {
    const dir = await readLargeZipDirectoryTail(file);
    return {
      summary: `${formatFileSize(file.size)} · Arquivo compactado (${dir.entriesCount > 0 ? `${dir.entriesCount} entradas listadas` : 'grande porte'})`,
      extractedText:
        `[ARQUIVO ${ext.toUpperCase() || 'ZIP'} DE GRANDE PORTE (${formatFileSize(file.size)})]\n` +
        `Índice de arquivos detectados no diretório central:\n${dir.previewList}`,
    };
  }

  try {
    const zip = await JSZip.loadAsync(file);
    const allEntries = Object.values(zip.files);
    const filesOnly = allEntries.filter((f) => !f.dir);

    if (ext === 'docx') {
      const docXml = await zip.file('word/document.xml')?.async('string');
      if (docXml) {
        const text = stripXmlTags(docXml).slice(0, 120_000);
        return {
          summary: `${formatFileSize(file.size)} · Documento Word (${text.length.toLocaleString('pt-BR')} chars extraídos)`,
          extractedText: `[CONTEÚDO DO DOCUMENTO WORD (.docx): ${file.name}]\n\n${text}`,
        };
      }
    }

    if (ext === 'xlsx') {
      const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
      const sharedStrings: string[] = [];
      if (sharedXml) {
        const matches = sharedXml.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
        matches.forEach((m) => sharedStrings.push(stripXmlTags(m)));
      }
      const sheetNames = filesOnly
        .map((f) => f.name)
        .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n))
        .sort();
      const parts: string[] = [
        `[PLANILHA EXCEL (.xlsx): ${file.name} — ${sheetNames.length} aba(s), ${sharedStrings.length} strings compartilhadas]`,
      ];
      if (sharedStrings.length > 0) {
        parts.push(`Valores de texto na planilha (amostra):\n${sharedStrings.slice(0, 600).join(' | ')}`);
      }
      for (const sName of sheetNames.slice(0, 5)) {
        const sXml = await zip.file(sName)?.async('string');
        if (sXml) {
          parts.push(`\n--- ${sName} ---\n${stripXmlTags(sXml).slice(0, 12_000)}`);
        }
      }
      return {
        summary: `${formatFileSize(file.size)} · Planilha Excel (${sheetNames.length} aba${sheetNames.length === 1 ? '' : 's'})`,
        extractedText: parts.join('\n\n').slice(0, 110_000),
      };
    }

    if (ext === 'pptx') {
      const slideNames = filesOnly
        .map((f) => f.name)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const nb = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return na - nb;
        });
      const slideTexts: string[] = [];
      for (const sName of slideNames.slice(0, 60)) {
        const sXml = await zip.file(sName)?.async('string');
        if (sXml) {
          const clean = stripXmlTags(sXml);
          if (clean) slideTexts.push(`### Slide ${sName.match(/\d+/)?.[0] || ''}\n${clean}`);
        }
      }
      return {
        summary: `${formatFileSize(file.size)} · Apresentação PowerPoint (${slideNames.length} slides)`,
        extractedText: `[APRESENTAÇÃO POWERPOINT (.pptx): ${file.name}]\n\n${slideTexts.join('\n\n').slice(0, 110_000)}`,
      };
    }

    // Generic ZIP / APK / JAR / ODT
    const tree = filesOnly
      .slice(0, 200)
      .map((f) => `- ${f.name}`)
      .join('\n');

    const readableInnerSamples: string[] = [];
    let budget = 65_000;
    const priorityRegex = /(readme|package\.json|tsconfig|manifest|requirements|cargo\.toml|pom\.xml|\.(txt|md|json|ts|tsx|js|jsx|py|sql|xml|yaml|yml|html|css|csv|env|sh))$/i;
    const sortedReadable = filesOnly
      .filter((f) => priorityRegex.test(f.name) && !f.name.includes('node_modules/'))
      .slice(0, 18);

    for (const entry of sortedReadable) {
      if (budget <= 0) break;
      try {
        const text = await entry.async('string');
        if (text && !text.includes('\u0000')) {
          const slice = text.slice(0, Math.min(text.length, 8000, budget));
          readableInnerSamples.push(`\n--- Arquivo interno: ${entry.name} ---\n${slice}`);
          budget -= slice.length;
        }
      } catch {
        // skip unreadable inner entry
      }
    }

    return {
      summary: `${formatFileSize(file.size)} · ${filesOnly.length} arquivo${filesOnly.length === 1 ? '' : 's'} internos`,
      extractedText:
        `[PACOTE ${kind === 'office' ? 'OFFICE' : 'COMPACTADO'} (${ext.toUpperCase()}): ${file.name} — ${filesOnly.length} arquivos]\n` +
        `Estrutura de arquivos (primeiros ${Math.min(filesOnly.length, 200)}):\n${tree}` +
        (readableInnerSamples.length > 0 ? `\n\nTrechos de arquivos internos legíveis:${readableInnerSamples.join('\n')}` : ''),
    };
  } catch (err: any) {
    // Non-ZIP archive (.rar, .7z, .tar, .gz, .iso) -> inspect magic bytes & printable strings
    const head = new Uint8Array(await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer());
    const sig = detectMagicSignature(head);
    const strings = extractPrintableStrings(head, 6, 4000);
    return {
      summary: `${formatFileSize(file.size)} · ${sig}`,
      extractedText:
        `[ARQUIVO COMPACTADO / IMAGEM: ${file.name}]\n` +
        `- Formato detectado: ${sig}\n- Tamanho: ${formatFileSize(file.size)}\n` +
        (strings ? `- Nomes/strings legíveis detectadas no cabeçalho:\n${strings}` : ''),
    };
  }
}

async function extractPdfAnalysis(file: File): Promise<{ summary: string; extractedText: string; inlineBase64?: string }> {
  const decoder = new TextDecoder('latin1');
  let pageCount = 0;

  // Scan file in 4MB slices to count PDF page markers cleanly even on 500MB PDFs
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(file.size, offset + CHUNK_SIZE_BYTES);
    const chunkText = decoder.decode(await file.slice(offset, end).arrayBuffer());
    const matches = chunkText.match(/\/Type\s*\/Page\b/g);
    if (matches) pageCount += matches.length;
    offset = end;
  }

  // Extract readable metadata & literal text fragments from first 4MB
  const sampleBuf = new Uint8Array(await file.slice(0, Math.min(file.size, 4 * 1024 * 1024)).arrayBuffer());
  const sampleRaw = decoder.decode(sampleBuf);
  const literalMatches = sampleRaw.match(/\(([^()\\]{4,180})\)\s*(?:Tj|TJ|')/g) || [];
  const extractedLiterals = literalMatches
    .map((m) => m.replace(/^\(/, '').replace(/\)\s*(?:Tj|TJ|')$/, ''))
    .filter((s) => /[a-zA-ZÀ-ÿ0-9]{3,}/.test(s))
    .slice(0, 600)
    .join(' ');

  let inlineBase64: string | undefined;
  if (file.size <= 2.5 * 1024 * 1024) {
    inlineBase64 = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }

  const pageLabel = pageCount > 0 ? `~${pageCount} pág.` : 'PDF';
  const extractedText =
    `[DOCUMENTO PDF: ${file.name}]\n` +
    `- Tamanho: ${formatFileSize(file.size)}\n` +
    `- Páginas estimadas: ${pageCount > 0 ? pageCount : 'Não determinado na varredura rápida (pode usar FlateDecode/streams comprimidos)'}\n` +
    (extractedLiterals
      ? `\nTrechos de texto legível extraídos do PDF:\n${extractedLiterals.slice(0, 25_000)}`
      : `\nNota: Este PDF utiliza streams comprimidos ou páginas rasterizadas. Quando o backend Gemini Files API estiver disponível, o arquivo original completo é enviado diretamente ao modelo.`);

  return {
    summary: `${formatFileSize(file.size)} · ${pageLabel}`,
    extractedText,
    inlineBase64,
  };
}

async function readMediaMetadata(file: File, kind: 'audio' | 'video'): Promise<{ duration?: number; width?: number; height?: number }> {
  if (typeof document === 'undefined') return {};
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const el = document.createElement(kind);
      const timer = setTimeout(() => resolve({}), 1800);
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        clearTimeout(timer);
        const res: { duration?: number; width?: number; height?: number } = {
          duration: Number.isFinite(el.duration) ? el.duration : undefined,
        };
        if (kind === 'video' && el instanceof HTMLVideoElement) {
          res.width = el.videoWidth || undefined;
          res.height = el.videoHeight || undefined;
        }
        resolve(res);
      };
      el.onerror = () => {
        clearTimeout(timer);
        resolve({});
      };
      el.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function extractBinaryOrMediaAnalysis(file: File, kind: AttachmentKind): Promise<{ summary: string; extractedText: string; inlineBase64?: string }> {
  const headSlice = new Uint8Array(await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer());
  const sig = detectMagicSignature(headSlice);
  const hexHeader = Array.from(headSlice.slice(0, 96))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  const stringsSample = extractPrintableStrings(headSlice, 6, 5000);

  let mediaMetaText = '';
  let mediaBadge = sig;
  if (kind === 'audio' || kind === 'video') {
    const meta = await readMediaMetadata(file, kind);
    if (meta.duration) {
      const mins = Math.floor(meta.duration / 60);
      const secs = Math.round(meta.duration % 60);
      const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      mediaMetaText += `- Duração: ${durStr}\n`;
      mediaBadge = `${durStr}${meta.width && meta.height ? ` · ${meta.width}x${meta.height}` : ''}`;
    }
    if (meta.width && meta.height) {
      mediaMetaText += `- Resolução: ${meta.width}x${meta.height}px\n`;
    }
  }

  let inlineBase64: string | undefined;
  if ((kind === 'audio' || kind === 'video') && file.size <= 2 * 1024 * 1024) {
    inlineBase64 = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }

  const extractedText =
    `[ARQUIVO ${kind.toUpperCase()}: ${file.name}]\n` +
    `- Tipo MIME: ${inferMimeType(file)}\n` +
    `- Tamanho: ${formatFileSize(file.size)} (${file.size.toLocaleString('pt-BR')} bytes)\n` +
    `- Assinatura detectada: ${sig}\n` +
    mediaMetaText +
    `- Primeiros 96 bytes (Hex): ${hexHeader}\n` +
    (stringsSample ? `\nStrings legíveis encontradas no cabeçalho:\n${stringsSample}` : '');

  return {
    summary: `${formatFileSize(file.size)} · ${mediaBadge}`,
    extractedText,
    inlineBase64,
  };
}

export async function uploadFileInChunks(
  file: File,
  uploadId: string,
  mimeType: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<{ uploaded: boolean; serverlessFallback?: boolean }> {
  const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
  const endpoint = `${apiBase}/api/files/upload-chunk`;
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelado pelo usuário', 'AbortError');
    }

    const start = chunkIndex * CHUNK_SIZE_BYTES;
    const end = Math.min(file.size, start + CHUNK_SIZE_BYTES);
    const chunkBlob = file.slice(start, end);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Upload-Id': uploadId,
        'X-Chunk-Index': String(chunkIndex),
        'X-Total-Chunks': String(totalChunks),
        'X-File-Name': encodeURIComponent(file.name),
        'X-File-Size': String(file.size),
        'X-Mime-Type': mimeType,
      },
      body: chunkBlob,
      signal,
    });

    const ct = res.headers.get('content-type') || '';
    // On Netlify / static serverless deployment, chunked /tmp disk route returns 404 or 501 JSON
    if (res.status === 404 || res.status === 501 || ct.includes('text/html')) {
      onProgress(100);
      return { uploaded: false, serverlessFallback: true };
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      try {
        const j = JSON.parse(raw);
        if (j?.serverless) {
          onProgress(100);
          return { uploaded: false, serverlessFallback: true };
        }
        throw new Error(j?.error || `Falha no envio do bloco ${chunkIndex + 1}/${totalChunks}`);
      } catch (e: any) {
        if (e?.message) throw e;
        throw new Error(`HTTP ${res.status} ao enviar bloco ${chunkIndex + 1}`);
      }
    }

    const percent = Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100));
    onProgress(percent);
  }

  return { uploaded: true };
}

export async function cancelServerUpload(uploadId: string): Promise<void> {
  try {
    const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
    await fetch(`${apiBase}/api/files/${encodeURIComponent(uploadId)}`, { method: 'DELETE' });
  } catch {
    // Ignore cleanup errors
  }
}

export async function processAndUploadAttachment(
  file: File,
  onUpdate: (patch: Partial<ChatAttachment>) => void,
  signal?: AbortSignal
): Promise<ChatAttachment> {
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const mimeType = inferMimeType(file);

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const err = `Arquivo "${file.name}" (${formatFileSize(file.size)}) excede o limite máximo de 500 MB.`;
    const failed: ChatAttachment = {
      id,
      name: file.name,
      size: file.size,
      mimeType,
      kind: 'binary',
      status: 'error',
      progress: 0,
      errorMessage: err,
    };
    onUpdate(failed);
    return failed;
  }

  const kind = await detectAttachmentKind(file);
  const baseAttachment: ChatAttachment = {
    id,
    name: file.name,
    size: file.size,
    mimeType,
    kind,
    status: 'processing',
    progress: 5,
    summary: `${formatFileSize(file.size)} · Analisando...`,
  };
  onUpdate(baseAttachment);

  let summary = formatFileSize(file.size);
  let extractedText = '';
  let imageDataUrl: string | undefined;
  let inlineBase64: string | undefined;

  if (kind === 'text' || kind === 'code') {
    const textRes = await extractTextFileAnalysis(file, kind);
    summary = textRes.summary;
    extractedText = textRes.extractedText;
  } else if (kind === 'image') {
    const imgRes = await compressImageForVision(file);
    imageDataUrl = imgRes.dataUrl;
    const dims = imgRes.width && imgRes.height ? ` · ${imgRes.width}x${imgRes.height}` : '';
    summary = `${formatFileSize(file.size)}${dims}`;
    extractedText = `[IMAGEM ANEXADA: ${file.name} (${formatFileSize(file.size)}${dims})]`;
  } else if (kind === 'archive' || kind === 'office') {
    const zipRes = await extractZipOrOfficeAnalysis(file, kind);
    summary = zipRes.summary;
    extractedText = zipRes.extractedText;
  } else if (kind === 'pdf') {
    const pdfRes = await extractPdfAnalysis(file);
    summary = pdfRes.summary;
    extractedText = pdfRes.extractedText;
    inlineBase64 = pdfRes.inlineBase64;
  } else {
    const binRes = await extractBinaryOrMediaAnalysis(file, kind);
    summary = binRes.summary;
    extractedText = binRes.extractedText;
    inlineBase64 = binRes.inlineBase64;
  }

  onUpdate({
    summary,
    extractedText,
    imageDataUrl,
    inlineBase64,
    status: 'uploading',
    progress: 10,
  });

  let finalUploadId: string | undefined;
  try {
    const uploadRes = await uploadFileInChunks(
      file,
      uploadId,
      mimeType,
      (pct) => {
        onUpdate({ status: 'uploading', progress: Math.max(10, pct) });
      },
      signal
    );
    if (uploadRes.uploaded) {
      finalUploadId = uploadId;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    // If chunk upload fails (e.g. network hiccup on non-Express host), keep local analysis ready
  }

  const readyAttachment: ChatAttachment = {
    id,
    name: file.name,
    size: file.size,
    mimeType,
    kind,
    summary,
    extractedText,
    imageDataUrl,
    inlineBase64,
    uploadId: finalUploadId,
    status: 'ready',
    progress: 100,
  };
  onUpdate(readyAttachment);
  return readyAttachment;
}

/**
 * Strips heavy payloads before persisting sessions to localStorage (5MB browser quota safety).
 */
export function sanitizeAttachmentForStorage(att: ChatAttachment): ChatAttachment {
  return {
    id: att.id,
    name: att.name,
    size: att.size,
    mimeType: att.mimeType,
    kind: att.kind,
    summary: att.summary,
    uploadId: att.uploadId,
    status: att.status,
    progress: att.progress,
    // Keep only a compact preview snippet for history reload, never raw huge strings/base64 blobs
    extractedText: att.extractedText ? att.extractedText.slice(0, 1500) : undefined,
    imageDataUrl: att.imageDataUrl && att.imageDataUrl.length < 140_000 ? att.imageDataUrl : undefined,
  };
}
