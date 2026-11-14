import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

const MAX_CSS_LENGTH = 100_000;
const MAX_BLOCK_DEPTH = 4;

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const ALLOWED_BODY_STYLE_PROPS = new Set([
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'background-color',
  'background',
  'font-family',
  'color',
  'line-height',
  'font-size',
  'text-align',
  'width',
  'min-width',
  'max-width',
  '-webkit-text-size-adjust',
  '-ms-text-size-adjust',
]);

const URL_CONTENT_KEYS = new Set([
  'src',
  'url',
  'buttonUrl',
  'link',
  'href',
  'videoUrl',
  'imageUrl',
  'ctaUrl',
]);

const STYLE_CONTENT_KEYS = new Set([
  'height',
  'color',
  'thickness',
  'backgroundColor',
  'borderColor',
  'padding',
  'fontSize',
  'fontFamily',
  'textColor',
  'borderRadius',
  'width',
  'maxWidth',
  'margin',
  'lineHeight',
]);

const ALLOWED_TAGS = [
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'font',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'img',
  'ins',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  's',
  'section',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

function isSafeObjectKey(key: string): boolean {
  return !DANGEROUS_OBJECT_KEYS.has(key) && !key.startsWith('$');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function hasOnlyHttpUrls(cssValue: string): boolean {
  if (!/url\s*\(/i.test(cssValue)) {
    return true;
  }

  const openMatches = cssValue.match(/url\s*\(/gi) || [];
  const fullMatches = Array.from(cssValue.matchAll(/url\s*\(([^)]*)\)/gi));
  if (fullMatches.length === 0 || fullMatches.length !== openMatches.length) {
    return false;
  }

  return fullMatches.every((match) => {
    const rawInner = (match[1] || '').trim();
    const unquoted = rawInner.replace(/^(['"])(.*)\1$/, '$2').trim();
    return /^https?:\/\/[^\s"'<>()]+$/i.test(unquoted);
  });
}

function cleanInlineStyleValue(rawStyle: string): string {
  let cleanedStyle = stripControlChars(rawStyle);
  let prevStyle = '';
  while (cleanedStyle !== prevStyle) {
    prevStyle = cleanedStyle;
    cleanedStyle = cleanedStyle
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/expression\s*\([^)]*\)?/gi, '')
      .replace(/-moz-binding\s*:/gi, '')
      .replace(/behavior\s*:/gi, '')
      .replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:(?!image\/(?:png|jpe?g|gif|webp)))[^)]*\)?/gi, '');
  }
  return cleanedStyle.trim();
}

function isValidColorValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = stripControlChars(value).trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return true;
  if (/^[a-zA-Z]{1,32}$/.test(trimmed)) return true;
  if (
    /^rgba?\(\s*\d{1,3}%?(?:\s*,\s*\d{1,3}%?){2}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

function sanitizeBodyStyle(rawStyle: string | undefined): string {
  if (!rawStyle || typeof rawStyle !== 'string') return '';
  const cleanedRaw = stripControlChars(rawStyle).trim();
  if (!cleanedRaw || /[<>{}\\]/.test(cleanedRaw)) return '';

  const safeDeclarations: string[] = [];
  for (const decl of cleanedRaw.split(';')) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) continue;

    const prop = decl.slice(0, colonIndex).trim().toLowerCase();
    const rawVal = decl.slice(colonIndex + 1).trim();
    if (!prop || !rawVal || !ALLOWED_BODY_STYLE_PROPS.has(prop)) continue;
    if (rawVal.length > 500) continue;
    if (
      /[<>{}\\]/.test(rawVal) ||
      /expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior/i.test(rawVal)
    ) {
      continue;
    }
    if (!hasOnlyHttpUrls(rawVal)) {
      continue;
    }

    const safeVal = rawVal.replace(/"/g, "'");
    safeDeclarations.push(`${prop}: ${safeVal}`);
  }

  return safeDeclarations.join('; ');
}

function sanitizeBlockUrl(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return '';

  if (cleaned.startsWith('#')) {
    return /[<>"']/.test(cleaned) ? fallback : cleaned;
  }

  if (cleaned.startsWith('{{')) {
    if (/^(?:javascript|vbscript|data)\s*:/i.test(cleaned) || /[<>"']/.test(cleaned)) {
      return fallback;
    }
    return cleaned;
  }

  if (cleaned.startsWith('/') && !cleaned.startsWith('//') && !cleaned.startsWith('/\\')) {
    return /[<>"']/.test(cleaned) ? fallback : cleaned;
  }

  const lower = cleaned.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return cleaned;
  }

  return fallback;
}

function sanitizeBlockStyleValue(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== 'string') return null;

  const cleaned = stripControlChars(value).trim();
  if (!cleaned) return '';
  if (
    /[;{}<>]/.test(cleaned) ||
    /expression\s*\(|javascript\s*:|vbscript\s*:/i.test(cleaned)
  ) {
    return null;
  }
  if (!hasOnlyHttpUrls(cleaned)) {
    return null;
  }

  return cleaned;
}

function sanitizeNestedPlainObject(
  input: Record<string, unknown>,
  depth: number
): Record<string, unknown> {
  if (depth > MAX_BLOCK_DEPTH) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(input, key) || !isSafeObjectKey(key)) {
      continue;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        isPlainRecord(item) ? sanitizeNestedPlainObject(item, depth + 1) : item
      );
    } else if (isPlainRecord(value)) {
      out[key] = sanitizeNestedPlainObject(value, depth + 1);
    }
  }
  return out;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    '*': [
      'style',
      'class',
      'id',
      'title',
      'dir',
      'lang',
      'align',
      'valign',
      'bgcolor',
      'width',
      'height',
      'data-pm-block',
      'data-pm-type',
      'data-pm-col',
      'data-pm-canvas',
    ],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'border'],
    table: ['border', 'cellpadding', 'cellspacing', 'role'],
    td: ['colspan', 'rowspan', 'scope', 'headers'],
    th: ['colspan', 'rowspan', 'scope', 'headers'],
    font: ['color', 'face', 'size'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'title'],
  transformTags: {
    '*': (tagName, attribs) => {
      const nextAttribs = { ...attribs };
      if (nextAttribs.style) {
        nextAttribs.style = cleanInlineStyleValue(nextAttribs.style);
      }
      if (tagName === 'a' && nextAttribs.target === '_blank') {
        nextAttribs.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: nextAttribs };
    },
  },
};

export function sanitizeTemplateCss(css: unknown): string {
  if (typeof css !== 'string') return '';

  let cleaned = stripControlChars(css.slice(0, MAX_CSS_LENGTH));
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/<\s*\/\s*style(?:\s*\/?>)?/gi, '')
      .replace(/<!--|-->/g, '')
      .replace(/@\s*import\b[^;\r\n}]*(?:;|$)/gim, '')
      .replace(/@\s*import/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '');
  }

  return cleaned.slice(0, MAX_CSS_LENGTH).trim();
}

export function sanitizeTemplateBlocks(blocks: unknown, depth = 0): unknown {
  if (depth > MAX_BLOCK_DEPTH) return [];
  if (blocks === null) return null;
  if (!Array.isArray(blocks)) return [];

  const sanitizedBlocks: Record<string, unknown>[] = [];

  for (const block of blocks) {
    if (!isPlainRecord(block)) continue;

    const cleanBlock: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(block)) {
      if (!Object.prototype.hasOwnProperty.call(block, key) || !isSafeObjectKey(key)) {
        continue;
      }

      if (key === 'styles' && isPlainRecord(value)) {
        const cleanStyles: Record<string, string> = {};
        for (const [styleKey, styleValue] of Object.entries(value)) {
          if (
            !Object.prototype.hasOwnProperty.call(value, styleKey) ||
            !isSafeObjectKey(styleKey)
          ) {
            continue;
          }
          const sanitizedVal = sanitizeBlockStyleValue(styleValue);
          if (sanitizedVal !== null && sanitizedVal !== '') {
            cleanStyles[styleKey] = sanitizedVal;
          }
        }
        cleanBlock.styles = cleanStyles;
        continue;
      }

      if (key === 'content' && isPlainRecord(value)) {
        const cleanContent: Record<string, unknown> = {};
        for (const [contentKey, contentVal] of Object.entries(value)) {
          if (
            !Object.prototype.hasOwnProperty.call(value, contentKey) ||
            !isSafeObjectKey(contentKey)
          ) {
            continue;
          }

          if (contentKey === 'html' && typeof contentVal === 'string') {
            cleanContent.html = sanitizeTemplateHtml(contentVal);
            continue;
          }

          if (contentKey === 'columns' && Array.isArray(contentVal)) {
            cleanContent.columns = contentVal.map((col) =>
              sanitizeTemplateBlocks(col, depth + 1)
            );
            continue;
          }

          if (URL_CONTENT_KEYS.has(contentKey)) {
            const fallback =
              contentKey === 'src' ||
              contentKey === 'imageUrl' ||
              contentKey === 'videoUrl'
                ? ''
                : '#';
            cleanContent[contentKey] = sanitizeBlockUrl(contentVal, fallback);
            continue;
          }

          if (contentKey === 'socialLinks' && Array.isArray(contentVal)) {
            cleanContent.socialLinks = contentVal
              .filter(isPlainRecord)
              .map((link) => {
                const safeLink = sanitizeNestedPlainObject(link, depth + 1);
                if ('url' in safeLink) {
                  safeLink.url = sanitizeBlockUrl(safeLink.url, '#');
                }
                return safeLink;
              });
            continue;
          }

          if (STYLE_CONTENT_KEYS.has(contentKey)) {
            const sanitizedStyle = sanitizeBlockStyleValue(contentVal);
            if (sanitizedStyle !== null) {
              cleanContent[contentKey] = sanitizedStyle;
            }
            continue;
          }

          if (contentKey === 'items' && Array.isArray(contentVal)) {
            cleanContent.items = contentVal.filter(
              (item): item is string => typeof item === 'string'
            );
            continue;
          }

          if (isPlainRecord(contentVal)) {
            cleanContent[contentKey] = sanitizeNestedPlainObject(contentVal, depth + 1);
          } else if (Array.isArray(contentVal)) {
            cleanContent[contentKey] = contentVal.map((item) =>
              isPlainRecord(item) ? sanitizeNestedPlainObject(item, depth + 1) : item
            );
          } else {
            cleanContent[contentKey] = contentVal;
          }
        }
        cleanBlock.content = cleanContent;
        continue;
      }

      if (isPlainRecord(value)) {
        cleanBlock[key] = sanitizeNestedPlainObject(value, depth + 1);
      } else if (Array.isArray(value)) {
        cleanBlock[key] = value.map((item) =>
          isPlainRecord(item) ? sanitizeNestedPlainObject(item, depth + 1) : item
        );
      } else {
        cleanBlock[key] = value;
      }
    }

    sanitizedBlocks.push(cleanBlock);
  }

  return sanitizedBlocks;
}

export function sanitizeTemplateTheme(
  theme: unknown
): Record<string, string | number> | undefined {
  if (!isPlainRecord(theme)) return undefined;

  const sanitized: Record<string, string | number> = {};

  for (const colorKey of ['canvasBg', 'contentBg', 'primaryColor', 'textColor'] as const) {
    if (isValidColorValue(theme[colorKey])) {
      sanitized[colorKey] = stripControlChars(theme[colorKey] as string).trim();
    }
  }

  if (typeof theme.fontFamily === 'string') {
    const font = stripControlChars(theme.fontFamily).trim();
    if (
      font &&
      font.length <= 200 &&
      /^[a-zA-Z0-9\s,'"-]+$/.test(font) &&
      !/expression\s*\(|javascript\s*:|vbscript\s*:/i.test(font)
    ) {
      sanitized.fontFamily = font;
    }
  }

  if (theme.contentWidth !== undefined && theme.contentWidth !== null) {
    const rawWidth =
      typeof theme.contentWidth === 'number'
        ? theme.contentWidth
        : typeof theme.contentWidth === 'string'
          ? Number.parseInt(theme.contentWidth.trim(), 10)
          : Number.NaN;
    if (Number.isFinite(rawWidth) && rawWidth >= 200 && rawWidth <= 1600) {
      sanitized.contentWidth = Math.trunc(rawWidth);
    }
  }

  if (typeof theme.borderRadius === 'string') {
    const radius = stripControlChars(theme.borderRadius).trim();
    if (
      radius &&
      radius.length <= 40 &&
      /^\d+(?:\.\d+)?(?:px|rem|em|%)?(?:\s+\d+(?:\.\d+)?(?:px|rem|em|%)?){0,3}$/.test(
        radius
      )
    ) {
      sanitized.borderRadius = radius;
    }
  }

  if (typeof theme.paddingY === 'string') {
    const paddingY = stripControlChars(theme.paddingY).trim();
    if (
      paddingY &&
      paddingY.length <= 24 &&
      /^\d+(?:\.\d+)?(?:px|rem|em|%)?$/.test(paddingY)
    ) {
      sanitized.paddingY = paddingY;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Sanitizes user-authored email template HTML while preserving email-safe
 * inline styles, document <style> blocks, safe <body> styles, tables, images,
 * safe links, and Handlebars-style template syntax ({{variable}}, {{#each ...}}...{{/each}}).
 */
export function sanitizeTemplateHtml(html: string): string {
  if (typeof html !== 'string' || !html.trim()) {
    return '';
  }

  const strippedQuotes = html.replace(/"[^"]*"|'[^']*'/g, '""');
  const hasDocWrapper = /<\s*(?:!doctype|html|head|body)(?=[\s>/])/i.test(strippedQuotes);
  const hasBodyTag = /<\s*body(?=[\s>/])/i.test(strippedQuotes);

  const $ = cheerio.load(html);
  const sanitizedStyles = $('style')
    .map((_, el) => sanitizeTemplateCss($(el).html() || ''))
    .get()
    .filter(Boolean);

  const bodyParts: string[] = [];
  if (hasBodyTag) {
    const $body = $('body').first();
    const safeBodyStyle = sanitizeBodyStyle($body.attr('style'));
    if (safeBodyStyle) {
      bodyParts.push(`style="${safeBodyStyle}"`);
    }
    const rawBgColor = $body.attr('bgcolor');
    if (isValidColorValue(rawBgColor)) {
      bodyParts.push(`bgcolor="${stripControlChars(rawBgColor).trim()}"`);
    }
    const rawTextColor = $body.attr('text');
    if (isValidColorValue(rawTextColor)) {
      bodyParts.push(`text="${stripControlChars(rawTextColor).trim()}"`);
    }
  }

  const safeBodyAttr = bodyParts.length > 0 ? ` ${bodyParts.join(' ')}` : '';
  const sanitizedInner = sanitizeHtml(html, SANITIZE_OPTIONS);

  if (!sanitizedInner.trim()) {
    return '';
  }

  if (sanitizedStyles.length > 0 || safeBodyAttr.length > 0 || hasDocWrapper) {
    const styleBlock =
      sanitizedStyles.length > 0
        ? `<style>\n${sanitizedStyles.join('\n')}\n</style>\n`
        : '';
    return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n${styleBlock}</head>\n<body${safeBodyAttr}>\n${sanitizedInner.trim()}\n</body>\n</html>`;
  }

  return sanitizedInner;
}
