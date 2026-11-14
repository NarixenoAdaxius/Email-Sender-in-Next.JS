import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { getDefaultStylesForType } from '../visual-builder/utils';
import { BlockContent, BlockType, TemplateBlock } from './types';

const VALID_BLOCK_TYPES = new Set<BlockType>([
  'header',
  'text',
  'image',
  'button',
  'spacer',
  'divider',
  'grid-1-column',
  'grid-2-column',
  'grid-3-column',
  'quote',
  'list',
  'social',
  'video',
  'card',
  'section',
  'custom-html',
]);

const cssPropToCamel = (prop: string): string =>
  prop.trim().replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

export function parseInlineStyleString(styleAttr: string | undefined): Record<string, string> {
  if (!styleAttr) return {};
  const result: Record<string, string> = {};
  for (const decl of styleAttr.split(';')) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const key = cssPropToCamel(decl.slice(0, colonIdx));
    const value = decl.slice(colonIdx + 1).trim();
    if (key && value) {
      result[key] = value;
    }
  }
  return result;
}

const BASIC_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodeHtmlEntities = (text: string): string =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower in BASIC_ENTITIES) {
      return BASIC_ENTITIES[lower];
    }
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
  });

const htmlBrToNewline = (html: string): string => {
  const withNewlines = String(html || '').replace(/<br\s*\/?>/gi, '\n');
  const stripped = withNewlines.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(stripped);
};

const parseElementToBlock = (
  $: cheerio.CheerioAPI,
  el: Element,
  existingMap: Map<string, TemplateBlock>,
  fallbackIndex: number
): TemplateBlock | null => {
  const $el = $(el);
  const blockId = $el.attr('data-pm-block');
  const rawType = $el.attr('data-pm-type') as BlockType | undefined;

  if (!blockId || !rawType || !VALID_BLOCK_TYPES.has(rawType)) {
    const outerHtml = $.html(el).trim();
    if (!outerHtml) return null;
    return {
      id: `custom-html-${fallbackIndex}-${Math.abs(hashString(outerHtml))}`,
      type: 'custom-html',
      content: { html: outerHtml },
      styles: { padding: '0px' },
    };
  }

  const prev = existingMap.get(blockId);
  const baseStyles = prev?.styles ? { ...prev.styles } : getDefaultStylesForType(rawType);
  const parsedStyles = parseInlineStyleString($el.attr('style'));

  switch (rawType) {
    case 'header':
    case 'text': {
      return {
        id: blockId,
        type: rawType,
        content: {
          ...(prev?.content || {}),
          text: htmlBrToNewline($el.html() || ''),
        },
        styles: { ...baseStyles, ...parsedStyles },
      };
    }

    case 'button': {
      const $a = $el.find('a').first();
      const aStyles = parseInlineStyleString($a.attr('style'));
      const wrapperAlign = parsedStyles.textAlign || baseStyles.textAlign || 'center';
      return {
        id: blockId,
        type: 'button',
        content: {
          ...(prev?.content || {}),
          text: ($a.text() || prev?.content?.text || 'Click Here').trim(),
          url: $a.attr('href') || prev?.content?.url || '#',
        },
        styles: { ...baseStyles, ...aStyles, textAlign: wrapperAlign },
      };
    }

    case 'image': {
      const $img = $el.find('img').first();
      const imgStyles = parseInlineStyleString($img.attr('style'));
      return {
        id: blockId,
        type: 'image',
        content: {
          ...(prev?.content || {}),
          src: $img.attr('src') || prev?.content?.src || '',
          alt: $img.attr('alt') ?? prev?.content?.alt ?? 'Image',
        },
        styles: {
          ...baseStyles,
          ...imgStyles,
          textAlign: parsedStyles.textAlign || baseStyles.textAlign || 'center',
        },
      };
    }

    case 'spacer': {
      return {
        id: blockId,
        type: 'spacer',
        content: {
          ...(prev?.content || {}),
          height: parsedStyles.height || prev?.content?.height || '24px',
        },
        styles: baseStyles,
      };
    }

    case 'divider': {
      const $hr = $el.find('hr').first();
      const hrStyles = parseInlineStyleString($hr.attr('style'));
      const borderTop = hrStyles.borderTop || '';
      const borderMatch = borderTop.match(/^(\S+)\s+\S+\s+(.+)$/);
      return {
        id: blockId,
        type: 'divider',
        content: {
          ...(prev?.content || {}),
          thickness: borderMatch?.[1] || prev?.content?.thickness || '1px',
          color: borderMatch?.[2] || prev?.content?.color || '#e5e7eb',
        },
        styles: baseStyles,
      };
    }

    case 'quote': {
      const $p = $el.find('p').first();
      const text = $p.length ? htmlBrToNewline($p.html() || '') : htmlBrToNewline($el.html() || '');
      const $authorDiv = $el.children('div').last();
      const authorText = $authorDiv.length
        ? $authorDiv.text().replace(/^—\s*/, '').trim()
        : prev?.content?.quoteAuthor || '';
      return {
        id: blockId,
        type: 'quote',
        content: {
          ...(prev?.content || {}),
          text,
          quoteAuthor: authorText,
        },
        styles: { ...baseStyles, ...parsedStyles },
      };
    }

    case 'list': {
      const tagName = el.tagName?.toLowerCase();
      const items = $el
        .find('li')
        .map((_, li) => $(li).text().trim())
        .get();
      return {
        id: blockId,
        type: 'list',
        content: {
          ...(prev?.content || {}),
          listType: tagName === 'ol' ? 'ordered' : 'unordered',
          items,
        },
        styles: { ...baseStyles, ...parsedStyles },
      };
    }

    case 'social': {
      const socialLinks = $el
        .find('a')
        .map((_, a) => {
          const $a = $(a);
          const label = $a.text().trim().toLowerCase() || 'website';
          return {
            platform: label,
            url: $a.attr('href') || '#',
            icon: label,
          };
        })
        .get();
      return {
        id: blockId,
        type: 'social',
        content: {
          ...(prev?.content || {}),
          socialLinks,
        },
        styles: baseStyles,
      };
    }

    case 'video': {
      const title = $el.find('p').first().text().trim() || prev?.content?.title || 'Watch Video';
      const videoUrl = $el.find('a').first().attr('href') || prev?.content?.videoUrl || '';
      return {
        id: blockId,
        type: 'video',
        content: {
          ...(prev?.content || {}),
          title,
          videoUrl,
        },
        styles: baseStyles,
      };
    }

    case 'card': {
      const title = $el.find('h3').first().text().trim() || prev?.content?.title || 'Card Title';
      const $desc = $el.find('p').first();
      const description = $desc.length
        ? htmlBrToNewline($desc.html() || '')
        : prev?.content?.description || '';
      return {
        id: blockId,
        type: 'card',
        content: {
          ...(prev?.content || {}),
          title,
          description,
          backgroundColor: parsedStyles.backgroundColor || prev?.content?.backgroundColor || '#ffffff',
          padding: parsedStyles.padding || prev?.content?.padding || '20px',
        },
        styles: baseStyles,
      };
    }

    case 'section': {
      const title = $el.find('h2').first().text().trim() || prev?.content?.title || 'Section Title';
      return {
        id: blockId,
        type: 'section',
        content: {
          ...(prev?.content || {}),
          title,
          backgroundColor: parsedStyles.backgroundColor || prev?.content?.backgroundColor || '#f9fafb',
          padding: parsedStyles.padding || prev?.content?.padding || '24px',
        },
        styles: baseStyles,
      };
    }

    case 'grid-1-column':
    case 'grid-2-column':
    case 'grid-3-column': {
      const colCount = rawType === 'grid-1-column' ? 1 : rawType === 'grid-2-column' ? 2 : 3;
      const columns: TemplateBlock[][] = Array.from({ length: colCount }, () => []);
      const directCells = $el
        .find('td[data-pm-col]')
        .filter((_, td) => $(td).closest('[data-pm-block]')[0] === el);
      directCells.each((colIdx, td) => {
        if (colIdx >= colCount) return;
        $(td)
          .children()
          .each((childIdx, childEl) => {
            const parsedChild = parseElementToBlock($, childEl, existingMap, childIdx);
            if (parsedChild) {
              columns[colIdx].push(parsedChild);
            }
          });
      });
      return {
        id: blockId,
        type: rawType,
        content: {
          ...(prev?.content || {}),
          columns,
        },
        styles: { ...baseStyles, ...parsedStyles },
      };
    }

    case 'custom-html': {
      return {
        id: blockId,
        type: 'custom-html',
        content: {
          html: $el.html() || '',
        } as BlockContent,
        styles: baseStyles,
      };
    }

    default:
      return prev ? { ...prev } : null;
  }
};

const flattenBlockMap = (blocks: TemplateBlock[] = []): Map<string, TemplateBlock> => {
  const map = new Map<string, TemplateBlock>();
  if (!Array.isArray(blocks)) return map;
  const walk = (list: TemplateBlock[]) => {
    for (const block of list || []) {
      if (!block || !block.id) continue;
      map.set(block.id, block);
      if (Array.isArray(block.content?.columns)) {
        for (const col of block.content.columns) {
          walk(col || []);
        }
      }
    }
  };
  walk(blocks);
  return map;
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export interface ParsedHtmlResult {
  blocks: TemplateBlock[];
  customCss: string;
  preheader: string;
}

/**
 * Parses HTML (either compiled by EmailStudio or hand-edited in Code Mode) back
 * into TemplateBlock[]. Unrecognized top-level HTML nodes become `custom-html`
 * blocks so raw markup is preserved across Visual <-> Code switches.
 */
export function parseHtmlToBlocks(
  html: string,
  existingBlocks: TemplateBlock[] = []
): ParsedHtmlResult {
  const trimmed = (html || '').trim();
  if (!trimmed) {
    return { blocks: [], customCss: '', preheader: '' };
  }

  const $ = cheerio.load(trimmed);
  const existingMap = flattenBlockMap(existingBlocks);

  const customCss = $('head style')
    .map((_, el) => $(el).html() || '')
    .get()
    .join('\n')
    .trim();

  const $preheader = $('#pm-preheader').first();
  const $preheaderText = $('#pm-preheader-text').first();
  const preheader = $preheaderText.length
    ? $preheaderText.text().trim()
    : $preheader.length
      ? $preheader
          .clone()
          .find('span[style*="display:none"], span[style*="display: none"]')
          .remove()
          .end()
          .text()
          .trim()
      : '';
  $('#pm-preheader').remove();

  const $canvas = $('[data-pm-canvas="true"]').first();
  if ($canvas.length > 0) {
    const blocks: TemplateBlock[] = [];
    $canvas.children().each((idx, el) => {
      const parsed = parseElementToBlock($, el, existingMap, idx);
      if (parsed) {
        blocks.push(parsed);
      }
    });
    return { blocks, customCss, preheader };
  }

  // Fallback for legacy / external HTML templates without data-pm-canvas:
  // preserve the body HTML as a first-class custom-html block rather than destroying it.
  const bodyHtml = $('body').length > 0 ? $('body').html() || trimmed : trimmed;
  return {
    blocks: [
      {
        id: `custom-html-root-${Math.abs(hashString(bodyHtml))}`,
        type: 'custom-html',
        content: { html: bodyHtml.trim() },
        styles: { padding: '0px' },
      },
    ],
    customCss,
    preheader,
  };
}
