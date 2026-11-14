import { getWatchableVideoUrl, sanitizeEmailUrl } from '../visual-builder/utils';
import { BlockType, DEFAULT_EMAIL_THEME, EmailTheme, TemplateBlock } from './types';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeCssValue = (value: unknown): string => {
  let cleaned = String(value ?? '').replace(/[<>;"'`]/g, '');
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '');
  }
  return cleaned.trim();
};

export function sanitizeCustomCss(customCss: unknown): string {
  let cleaned = String(customCss ?? '').replace(/\u0000/g, '');
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/<\/style/gi, '')
      .replace(/<!--/g, '')
      .replace(/-->/g, '')
      .replace(/@import\b[^;\n]*(?:;|$)/gi, '')
      .replace(/@import/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '');
  }
  return cleaned.trim();
}

const NAMED_CHECK_ENTITIES: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodeHtmlAttrEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (full, entity: string) => {
    const lower = entity.toLowerCase();
    switch (lower) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        if (lower.startsWith('#x')) {
          const code = Number.parseInt(lower.slice(2), 16);
          return Number.isFinite(code) && code > 0 && code <= 0x10ffff
            ? String.fromCodePoint(code)
            : full;
        }
        if (lower.startsWith('#')) {
          const code = Number.parseInt(lower.slice(1), 10);
          return Number.isFinite(code) && code > 0 && code <= 0x10ffff
            ? String.fromCodePoint(code)
            : full;
        }
        return full;
    }
  });

const decodeEntitiesForSecurityCheck = (value: string): string =>
  value
    .replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (full, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower in NAMED_CHECK_ENTITIES) {
        return NAMED_CHECK_ENTITIES[lower];
      }
      if (lower.startsWith('#x')) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : '';
      }
      if (lower.startsWith('#')) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : '';
      }
      return full;
    })
    .replace(/[\u0000-\u001F\u007F]/g, '');

const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'poster',
  'background',
  'cite',
  'data',
]);

const SRC_ONLY_ATTRIBUTES = new Set(['src', 'poster', 'background', 'data']);

const DANGEROUS_CONTAINER_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'applet',
  'noscript',
  'template',
]);

const DANGEROUS_VOID_TAGS = new Set(['embed', 'base', 'meta', 'link']);

function sanitizeUrlAttr(attrName: string, rawVal: string): string | null {
  const decodedCompact = decodeEntitiesForSecurityCheck(rawVal).replace(/\s+/g, '').toLowerCase();
  if (
    decodedCompact.startsWith('javascript:') ||
    decodedCompact.startsWith('vbscript:') ||
    decodedCompact.startsWith('data:') ||
    decodedCompact.startsWith('//') ||
    decodedCompact.startsWith('/\\')
  ) {
    return SRC_ONLY_ATTRIBUTES.has(attrName) ? null : '#';
  }
  const sanitized = sanitizeEmailUrl(rawVal);
  if (SRC_ONLY_ATTRIBUTES.has(attrName)) {
    if (!sanitized || sanitized === '#' || sanitized.startsWith('mailto:') || sanitized.startsWith('tel:')) {
      return null;
    }
  }
  return sanitized;
}

function sanitizeSrcsetAttr(rawVal: string): string | null {
  const safeEntries = rawVal
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const spaceIdx = entry.search(/\s/);
      const urlPart = spaceIdx === -1 ? entry : entry.slice(0, spaceIdx);
      const descriptor = spaceIdx === -1 ? '' : entry.slice(spaceIdx).trim();
      const safeUrl = sanitizeUrlAttr('src', urlPart);
      if (!safeUrl) return '';
      return descriptor ? `${safeUrl} ${escapeHtml(descriptor)}` : safeUrl;
    })
    .filter(Boolean);
  return safeEntries.length > 0 ? safeEntries.join(', ') : null;
}

function sanitizeInlineStyleAttr(rawStyle: string): string {
  let cleaned = decodeEntitiesForSecurityCheck(rawStyle).replace(/[<>`]/g, '');
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/-moz-binding\s*:/gi, '')
      .replace(/behavior\s*:/gi, '')
      .replace(/@import/gi, '');
  }
  return cleaned.trim().replace(/"/g, '&quot;');
}

function findTagEnd(html: string, startIndex: number): number {
  let quote: '"' | "'" | null = null;
  for (let i = startIndex; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

function sanitizeTagAttributes(rawAttrs: string): string {
  const kept: string[] = [];
  let i = 0;
  const len = rawAttrs.length;

  while (i < len) {
    while (i < len && (/[\s/]/.test(rawAttrs[i]))) {
      i += 1;
    }
    if (i >= len) break;

    const nameStart = i;
    while (i < len && !/[\s=/>]/.test(rawAttrs[i])) {
      i += 1;
    }
    const rawName = rawAttrs.slice(nameStart, i);
    const lowerName = rawName.toLowerCase();
    if (!lowerName) {
      i += 1;
      continue;
    }

    while (i < len && /\s/.test(rawAttrs[i])) {
      i += 1;
    }

    let hasValue = false;
    let rawValue = '';
    if (i < len && rawAttrs[i] === '=') {
      hasValue = true;
      i += 1;
      while (i < len && /\s/.test(rawAttrs[i])) {
        i += 1;
      }
      if (i < len && (rawAttrs[i] === '"' || rawAttrs[i] === "'" || rawAttrs[i] === '`')) {
        const quoteChar = rawAttrs[i];
        i += 1;
        const valStart = i;
        while (i < len && rawAttrs[i] !== quoteChar) {
          i += 1;
        }
        rawValue = rawAttrs.slice(valStart, i);
        if (i < len && rawAttrs[i] === quoteChar) i += 1;
      } else {
        const valStart = i;
        while (i < len && !/[\s>]/.test(rawAttrs[i])) {
          i += 1;
        }
        rawValue = rawAttrs.slice(valStart, i);
      }
    }

    if (lowerName.startsWith('on') || lowerName === 'srcdoc') {
      continue;
    }

    if (!hasValue) {
      kept.push(rawName);
      continue;
    }

    if (URL_ATTRIBUTES.has(lowerName)) {
      const safeUrl = sanitizeUrlAttr(lowerName, decodeHtmlAttrEntities(rawValue));
      if (safeUrl !== null) {
        kept.push(`${rawName}="${safeUrl}"`);
      }
    } else if (lowerName === 'srcset') {
      const safeSrcset = sanitizeSrcsetAttr(decodeHtmlAttrEntities(rawValue));
      if (safeSrcset !== null) {
        kept.push(`${rawName}="${safeSrcset}"`);
      }
    } else if (lowerName === 'style') {
      const safeStyle = sanitizeInlineStyleAttr(rawValue);
      if (safeStyle) {
        kept.push(`${rawName}="${safeStyle}"`);
      }
    } else {
      kept.push(`${rawName}="${escapeHtml(decodeHtmlAttrEntities(rawValue))}"`);
    }
  }

  return kept.join(' ');
}

function sanitizeCustomHtmlPass(input: string): string {
  let out = '';
  let i = 0;

  while (i < input.length) {
    if (input[i] !== '<') {
      const nextLt = input.indexOf('<', i);
      if (nextLt === -1) {
        out += input.slice(i);
        break;
      }
      out += input.slice(i, nextLt);
      i = nextLt;
      continue;
    }

    if (input.startsWith('<!--', i)) {
      const commentEnd = input.indexOf('-->', i + 4);
      if (commentEnd === -1) {
        break;
      }
      i = commentEnd + 3;
      continue;
    }

    const nextChar = input[i + 1];
    if (!nextChar || !/[a-zA-Z!/]/.test(nextChar)) {
      out += '<';
      i += 1;
      continue;
    }

    const tagEnd = findTagEnd(input, i + 1);
    if (tagEnd === -1) {
      break;
    }

    const inner = input.slice(i + 1, tagEnd).trim();
    const isClosing = inner.startsWith('/');
    const body = isClosing ? inner.slice(1).trim() : inner;
    const tagMatch = body.match(/^([a-zA-Z][a-zA-Z0-9:-]*)/);

    if (!tagMatch) {
      i = tagEnd + 1;
      continue;
    }

    const tagName = tagMatch[1];
    const lowerTag = tagName.toLowerCase();

    if (DANGEROUS_CONTAINER_TAGS.has(lowerTag)) {
      if (isClosing) {
        i = tagEnd + 1;
        continue;
      }
      const closeRe = new RegExp(`<\\/${lowerTag}(?:\\s[^>]*)?>`, 'i');
      const rest = input.slice(tagEnd + 1);
      const closeMatch = closeRe.exec(rest);
      if (!closeMatch) {
        break;
      }
      i = tagEnd + 1 + closeMatch.index + closeMatch[0].length;
      continue;
    }

    if (DANGEROUS_VOID_TAGS.has(lowerTag)) {
      i = tagEnd + 1;
      continue;
    }

    if (lowerTag === 'style') {
      if (isClosing) {
        i = tagEnd + 1;
        continue;
      }
      const closeStyle = /<\/style(?:\s[^>]*)?>/i.exec(input.slice(tagEnd + 1));
      if (!closeStyle) {
        break;
      }
      const rawCss = input.slice(tagEnd + 1, tagEnd + 1 + closeStyle.index);
      const safeCss = sanitizeCustomCss(rawCss);
      if (safeCss) {
        out += `<style>${safeCss}</style>`;
      }
      i = tagEnd + 1 + closeStyle.index + closeStyle[0].length;
      continue;
    }

    if (isClosing) {
      out += `</${tagName}>`;
      i = tagEnd + 1;
      continue;
    }

    const selfClosing =
      body.endsWith('/') &&
      (body.length === tagName.length + 1 || /[\s"']\/$/.test(body));
    const attrSlice = body.slice(tagName.length, selfClosing ? -1 : undefined);
    const safeAttrs = sanitizeTagAttributes(attrSlice);
    out += `<${tagName}${safeAttrs ? ` ${safeAttrs}` : ''}${selfClosing ? ' /' : ''}>`;
    i = tagEnd + 1;
  }

  return out;
}

export function sanitizeCustomHtml(rawHtml: unknown): string {
  let cleaned = String(rawHtml ?? '').replace(/\u0000/g, '');
  for (let pass = 0; pass < 5; pass += 1) {
    const next = sanitizeCustomHtmlPass(cleaned);
    if (next === cleaned) return next;
    cleaned = next;
  }
  return cleaned;
}

export function buildPreheaderHtml(preheaderText: unknown): string {
  const trimmed = String(preheaderText ?? '').trim();
  if (!trimmed) return '';
  return `<div id="pm-preheader" style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;"><span id="pm-preheader-text">${escapeHtml(trimmed)}</span><span style="display:none;">&#847;&zwnj;&nbsp;&#8199;&#65279;&#847;&zwnj;&nbsp;</span></div>`;
}

const styleObjectToString = (styles: Record<string, string> | undefined): string => {
  return Object.entries(styles || {})
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${sanitizeCssValue(key.replace(/([A-Z])/g, '-$1').toLowerCase())}: ${sanitizeCssValue(value)}`
    )
    .join('; ');
};

const formatMultilineHtml = (text: unknown): string =>
  escapeHtml(text || '').replace(/\n/g, '<br>');

const SOCIAL_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  instagram: '#E1306C',
  linkedin: '#0077B5',
  youtube: '#FF0000',
  pinterest: '#BD081C',
  tiktok: '#111827',
  snapchat: '#D97706',
  github: '#24292F',
  discord: '#5865F2',
  reddit: '#FF4500',
  twitch: '#9146FF',
  whatsapp: '#25D366',
  telegram: '#0088CC',
  website: '#4F46E5',
};

const renderBlockInnerHtml = (block: TemplateBlock, theme: EmailTheme): string => {
  const styles = block.styles || {};
  const content = block.content || {};
  const attrs = `data-pm-block="${escapeHtml(block.id)}" data-pm-type="${escapeHtml(block.type)}"`;

  switch (block.type as BlockType) {
    case 'header': {
      const styleStr = styleObjectToString({
        fontFamily: theme.fontFamily,
        ...styles,
      });
      return `<div ${attrs} style="${styleStr}">${formatMultilineHtml(content.text || 'Header')}</div>`;
    }

    case 'text': {
      const styleStr = styleObjectToString({
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        ...styles,
      });
      return `<div ${attrs} style="${styleStr}">${formatMultilineHtml(content.text || '')}</div>`;
    }

    case 'button': {
      const align = sanitizeCssValue(styles.textAlign || 'center');
      const btnStyles: Record<string, string> = {
        backgroundColor: theme.primaryColor,
        color: '#ffffff',
        padding: '12px 24px',
        textDecoration: 'none',
        borderRadius: '6px',
        display: 'inline-block',
        fontWeight: '600',
        fontFamily: theme.fontFamily,
        ...styles,
      };
      delete btnStyles.textAlign;
      const href = sanitizeEmailUrl(content.url || '#');
      return `<div ${attrs} style="text-align: ${align}; padding: 12px 20px;"><a href="${href}" style="${styleObjectToString(btnStyles)}">${escapeHtml(content.text || 'Click Here')}</a></div>`;
    }

    case 'image': {
      const align = sanitizeCssValue(styles.textAlign || 'center');
      const imgStyles = styleObjectToString({
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        margin: align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0',
        ...styles,
      });
      const src = sanitizeEmailUrl(content.src || 'https://via.placeholder.com/600x260?text=Email+Image');
      const alt = escapeHtml(content.alt || 'Image');
      return `<div ${attrs} style="padding: 8px 20px; text-align: ${align};"><img src="${src}" alt="${alt}" style="${imgStyles}" /></div>`;
    }

    case 'spacer': {
      const height = sanitizeCssValue(content.height || '24px');
      return `<div ${attrs} style="height: ${height}; line-height: ${height}; font-size: 1px;">&nbsp;</div>`;
    }

    case 'divider': {
      const color = sanitizeCssValue(content.color || '#e5e7eb');
      const thickness = sanitizeCssValue(content.thickness || '1px');
      return `<div ${attrs} style="padding: 12px 20px;"><hr style="border: 0; border-top: ${thickness} solid ${color}; margin: 0;" /></div>`;
    }

    case 'quote': {
      const styleStr = styleObjectToString({
        borderLeft: `4px solid ${theme.primaryColor}`,
        padding: '12px 20px',
        margin: '12px 20px',
        backgroundColor: '#f9fafb',
        fontStyle: 'italic',
        fontFamily: theme.fontFamily,
        ...styles,
      });
      const author = content.quoteAuthor || content.citation || '';
      const authorHtml = author
        ? `<div style="margin-top: 8px; font-style: normal; font-size: 13px; font-weight: 600; color: #6b7280;">— ${escapeHtml(author)}</div>`
        : '';
      return `<blockquote ${attrs} style="${styleStr}"><p style="margin: 0;">${formatMultilineHtml(content.text || '')}</p>${authorHtml}</blockquote>`;
    }

    case 'list': {
      const tag = content.listType === 'ordered' ? 'ol' : 'ul';
      const styleStr = styleObjectToString({
        padding: '12px 20px 12px 40px',
        margin: '0',
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        ...styles,
      });
      const items = (content.items || [])
        .map((item) => `<li style="margin-bottom: 6px;">${escapeHtml(item)}</li>`)
        .join('');
      return `<${tag} ${attrs} style="${styleStr}">${items}</${tag}>`;
    }

    case 'social': {
      const links = (content.socialLinks || [])
        .map((link) => {
          const platform = String(link?.platform || 'website').trim() || 'website';
          const bg = SOCIAL_COLORS[platform.toLowerCase()] || theme.primaryColor;
          const label = escapeHtml(platform.charAt(0).toUpperCase() + platform.slice(1));
          const href = sanitizeEmailUrl(link?.url);
          return `<a href="${href}" style="display: inline-block; margin: 4px 6px; padding: 8px 14px; border-radius: 6px; background-color: ${bg}; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; font-family: ${sanitizeCssValue(theme.fontFamily)};">${label}</a>`;
        })
        .join('');
      return `<div ${attrs} style="padding: 16px 20px; text-align: center;">${links}</div>`;
    }

    case 'video': {
      const watchUrl = sanitizeEmailUrl(getWatchableVideoUrl(content.videoUrl));
      const title = escapeHtml(content.title || 'Watch Video');
      return `<div ${attrs} style="padding: 16px 20px; text-align: center; background-color: #18181b; color: #ffffff; border-radius: 8px; margin: 12px 20px;"><p style="margin: 0 0 12px 0; font-weight: 600; font-size: 16px; font-family: ${sanitizeCssValue(theme.fontFamily)};">${title}</p><a href="${watchUrl}" style="display: inline-block; padding: 10px 20px; background-color: ${sanitizeCssValue(theme.primaryColor)}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">&#9654; Watch Video</a></div>`;
    }

    case 'card': {
      const bg = sanitizeCssValue(content.backgroundColor || '#ffffff');
      const border = sanitizeCssValue(content.borderColor || '#e5e7eb');
      const pad = sanitizeCssValue(content.padding || '20px');
      return `<div ${attrs} style="margin: 12px 20px; padding: ${pad}; background-color: ${bg}; border: 1px solid ${border}; border-radius: 8px; font-family: ${sanitizeCssValue(theme.fontFamily)};"><h3 style="margin: 0 0 8px 0; font-size: 18px; color: ${sanitizeCssValue(theme.textColor)};">${escapeHtml(content.title || 'Card Title')}</h3><p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">${formatMultilineHtml(content.description || '')}</p></div>`;
    }

    case 'section': {
      const bg = sanitizeCssValue(content.backgroundColor || '#f9fafb');
      const pad = sanitizeCssValue(content.padding || '24px');
      return `<div ${attrs} style="padding: ${pad}; background-color: ${bg}; text-align: center; font-family: ${sanitizeCssValue(theme.fontFamily)};"><h2 style="margin: 0; font-size: 20px; color: ${sanitizeCssValue(theme.textColor)};">${escapeHtml(content.title || 'Section Title')}</h2></div>`;
    }

    case 'grid-1-column':
    case 'grid-2-column':
    case 'grid-3-column': {
      const cols = content.columns?.length ? content.columns : [[]];
      const colWidth = `${Math.floor(100 / Math.max(cols.length, 1))}%`;
      const cells = cols
        .map((colBlocks, colIdx) => {
          const inner = (colBlocks || [])
            .map((child) => renderBlockInnerHtml(child, theme))
            .join('');
          return `<td data-pm-col="${colIdx}" width="${colWidth}" valign="top" style="vertical-align: top; padding: 8px;">${inner}</td>`;
        })
        .join('');
      return `<table ${attrs} role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;"><tr>${cells}</tr></table>`;
    }

    case 'custom-html': {
      const safeHtml = sanitizeCustomHtml(content.html || '');
      return `<div ${attrs}>${safeHtml}</div>`;
    }

    default:
      return `<div ${attrs}></div>`;
  }
};

export function compileBlocksToHtml(
  blocks: TemplateBlock[] = [],
  theme: EmailTheme = DEFAULT_EMAIL_THEME,
  customCss = '',
  preheader = ''
): string {
  const safeTheme: EmailTheme = { ...DEFAULT_EMAIL_THEME, ...theme };
  const safeContentWidth = Math.max(
    320,
    Math.min(1200, Number.parseInt(String(safeTheme.contentWidth), 10) || 600)
  );
  const bodyBlocksHtml = (blocks || [])
    .filter(Boolean)
    .map((block) => renderBlockInnerHtml(block, safeTheme))
    .join('\n          ');
  const safeCss = sanitizeCustomCss(customCss);
  const styleBlock = safeCss ? `\n  <style>\n${safeCss}\n  </style>` : '';
  const preheaderNode = buildPreheaderHtml(preheader);
  const preheaderBlock = preheaderNode ? `\n  ${preheaderNode}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />${styleBlock}
</head>
<body style="margin: 0; padding: 0; background-color: ${sanitizeCssValue(safeTheme.canvasBg)}; font-family: ${sanitizeCssValue(safeTheme.fontFamily)}; color: ${sanitizeCssValue(safeTheme.textColor)};">${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: ${sanitizeCssValue(safeTheme.canvasBg)};">
    <tr>
      <td align="center" style="padding: ${sanitizeCssValue(safeTheme.paddingY)} 16px;">
        <table role="presentation" width="${safeContentWidth}" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: ${safeContentWidth}px; background-color: ${sanitizeCssValue(safeTheme.contentBg)}; border-radius: ${sanitizeCssValue(safeTheme.borderRadius)}; overflow: hidden;">
          <tr>
            <td data-pm-canvas="true" style="padding: 0;">
          ${bodyBlocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function extractVariablesFromText(text: unknown, subject: unknown = ''): string[] {
  const variableRegex = /\{\{([^{}]+)\}\}/g;
  const eachRegex = /\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}/g;
  const found = new Set<string>(['senderName']);

  const collect = (input: unknown) => {
    const str = String(input ?? '');
    for (const eachMatch of str.matchAll(eachRegex)) {
      if (eachMatch[1]) {
        found.add(eachMatch[1].trim());
      }
    }
    const matches = str.match(variableRegex) || [];
    for (const match of matches) {
      const name = match.replace(/\{\{|\}\}/g, '').trim();
      if (
        name &&
        !name.startsWith('#') &&
        !name.startsWith('/') &&
        !name.startsWith('this.') &&
        name !== 'this' &&
        name !== 'else'
      ) {
        found.add(name);
      }
    }
  };

  collect(text);
  collect(subject);
  return Array.from(found);
}

export function renderPreviewHtml(
  html: string,
  sampleData: Record<string, string>,
  useSampleData: boolean,
  darkMode: boolean
): string {
  let rendered = html;

  if (useSampleData) {
    rendered = rendered.replace(/\{\{([^{}]+)\}\}/g, (full, rawKey: string) => {
      const key = rawKey.trim();
      if (key.startsWith('#') || key.startsWith('/') || key === 'else') {
        return full;
      }
      const val = sampleData[key];
      return val !== undefined && val !== '' ? escapeHtml(val) : full;
    });
  }

  if (darkMode) {
    const darkStyle = `<style>
      html, body { background-color: #09090b !important; color: #f4f4f5 !important; }
      table[style*="background-color: #FFFFFF"],
      table[style*="background-color: #ffffff"],
      td[data-pm-canvas="true"] {
        background-color: #18181b !important;
        color: #f4f4f5 !important;
      }
    </style>`;
    rendered = rendered.includes('</head>')
      ? rendered.replace('</head>', `${darkStyle}\n</head>`)
      : `${darkStyle}${rendered}`;
  }

  return rendered;
}
