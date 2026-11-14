import { BlockContent, BlockType, TemplateBlock } from './types';

const NAMED_HEX_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  navy: '#000080',
  teal: '#008080',
  indigo: '#4f46e5',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  fuchsia: '#ff00ff',
  rebeccapurple: '#663399',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  whitesmoke: '#f5f5f5',
};

/**
 * Normalizes CSS colors (named colors, 3-digit hex, rgb/rgba) into valid 6-digit #rrggbb
 * format required by native <input type="color"> controls.
 */
export function normalizeHexColor(value: string | undefined | null, fallback = '#000000'): string {
  if (!value) return fallback;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent' || trimmed === 'inherit' || trimmed === 'currentcolor') {
    return fallback;
  }

  if (NAMED_HEX_COLORS[trimmed]) {
    return NAMED_HEX_COLORS[trimmed];
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^#[0-9a-f]{8}$/i.test(trimmed)) {
    return trimmed.slice(0, 7);
  }

  if (/^#[0-9a-f]{3,4}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgbMatch) {
    const toHex = (n: string) =>
      Math.max(0, Math.min(255, Number.parseInt(n, 10)))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return fallback;
}

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

export const isSafeImageSrc = (rawSrc: unknown): boolean => {
  const trimmed = String(rawSrc ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;
  if (trimmed.startsWith('/')) return true;
  const lower = trimmed.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://');
};

export const sanitizeEmailUrl = (rawUrl: unknown): string => {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '';
  }
  if (trimmed.startsWith('{{') || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return escapeHtml(trimmed);
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return escapeHtml(trimmed);
  }
  return '#';
};

/**
 * Converts embed video URLs (YouTube/Vimeo) to watchable landing URLs for email CTA links.
 */
export function getWatchableVideoUrl(rawUrl: string | undefined): string {
  const url = (rawUrl || '').trim();
  if (!url) return '#';
  if (url.includes('{{')) return url;

  const ytEmbedMatch = url.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (ytEmbedMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${ytEmbedMatch[1]}`;
  }

  const vimeoEmbedMatch = url.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (vimeoEmbedMatch?.[1]) {
    return `https://vimeo.com/${vimeoEmbedMatch[1]}`;
  }

  return url;
}

// Default blocks for new templates
export const defaultBlocks: TemplateBlock[] = [
  {
    id: 'header-1',
    type: 'header',
    content: {
      text: 'Hello, {{name}}!',
    } as BlockContent,
    styles: {
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      padding: '24px 20px',
      textAlign: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
    },
  },
  {
    id: 'text-1',
    type: 'text',
    content: {
      text: 'This is a sample email template. You can edit it to suit your needs.\n\nFeel free to add your content here.',
    } as BlockContent,
    styles: {
      padding: '20px',
      color: '#333333',
      fontSize: '16px',
      lineHeight: '1.5',
      fontFamily: 'Arial, sans-serif',
    },
  },
  {
    id: 'button-1',
    type: 'button',
    content: {
      text: 'Click Here',
      url: '{{actionLink}}',
    } as BlockContent,
    styles: {
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      padding: '12px 24px',
      textDecoration: 'none',
      borderRadius: '6px',
      display: 'inline-block',
      margin: '16px 0',
      fontSize: '16px',
      fontWeight: 'bold',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
    },
  },
  {
    id: 'text-2',
    type: 'text',
    content: {
      text: 'Best regards,\n{{senderName}}',
    } as BlockContent,
    styles: {
      padding: '20px',
      borderTop: '1px solid #eeeeee',
      marginTop: '20px',
      color: '#333333',
      fontSize: '16px',
      lineHeight: '1.5',
      fontFamily: 'Arial, sans-serif',
    },
  },
];

// Helper to convert style objects to inline CSS string
const styleObjectToString = (styles: Record<string, string>): string => {
  return Object.entries(styles || {})
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${sanitizeCssValue(key.replace(/([A-Z])/g, '-$1').toLowerCase())}: ${sanitizeCssValue(value)}`
    )
    .join('; ');
};

// Get default content based on block type
export const getDefaultContentForType = (type: BlockType): BlockContent => {
  switch (type) {
    case 'header':
      return { text: 'New Header' };
    case 'text':
      return { text: 'New text block' };
    case 'button':
      return { text: 'Button', url: '#' };
    case 'image':
      return { src: '', alt: 'Image' };
    case 'spacer':
      return { height: '20px' };
    case 'divider':
      return { color: '#e5e7eb', thickness: '1px' };
    case 'grid-1-column':
      return { columns: [[]] };
    case 'grid-2-column':
      return { columns: [[], []] };
    case 'grid-3-column':
      return { columns: [[], [], []] };
    case 'quote':
      return { text: 'This is a quote', quoteAuthor: 'Author Name' };
    case 'list':
      return { items: ['Item 1', 'Item 2', 'Item 3'], listType: 'unordered' };
    case 'social':
      return {
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com', icon: 'facebook' },
          { platform: 'twitter', url: 'https://twitter.com', icon: 'twitter' },
          { platform: 'instagram', url: 'https://instagram.com', icon: 'instagram' },
        ],
      };
    case 'video':
      return { title: 'Watch our latest video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
    case 'card':
      return {
        title: 'Card Title',
        description: 'Card description goes here',
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        padding: '16px',
      };
    case 'section':
      return {
        title: 'Section Title',
        backgroundColor: '#f9fafb',
        padding: '24px',
      };
    case 'custom-html':
      return {
        html: '<div style="padding: 16px; text-align: center; color: #374151;">\n  <p style="margin: 0;">Custom HTML block</p>\n</div>',
      };
    default:
      return { text: '' };
  }
};

// Get default styles based on block type
export const getDefaultStylesForType = (type: BlockType): Record<string, string> => {
  switch (type) {
    case 'header':
      return {
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        padding: '24px 20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
      };
    case 'text':
      return {
        padding: '20px',
        color: '#333333',
        fontSize: '16px',
        lineHeight: '1.5',
        fontFamily: 'Arial, sans-serif',
      };
    case 'button':
      return {
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        padding: '12px 24px',
        textDecoration: 'none',
        borderRadius: '6px',
        display: 'inline-block',
        fontSize: '16px',
        margin: '16px 0',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
      };
    case 'image':
      return {
        maxWidth: '100%',
        height: 'auto',
      };
    case 'grid-1-column':
    case 'grid-2-column':
    case 'grid-3-column':
      return {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '0 auto',
      };
    case 'quote':
      return {
        padding: '20px',
        margin: '20px 0',
        borderLeft: '4px solid #4f46e5',
        fontStyle: 'italic',
        color: '#555555',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
      };
    case 'list':
      return {
        padding: '10px 20px 10px 36px',
        margin: '10px 0',
        color: '#333333',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.6',
      };
    case 'social':
      return {
        padding: '20px',
        textAlign: 'center',
        margin: '16px 0',
      };
    case 'video':
      return {
        width: '100%',
        maxWidth: '600px',
        margin: '16px auto',
      };
    case 'card':
      return {
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#374151',
        maxWidth: '100%',
        display: 'block',
      };
    case 'section':
      return {
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#374151',
        textAlign: 'center',
        maxWidth: '100%',
        display: 'block',
      };
    case 'custom-html':
      return {
        padding: '0px',
      };
    default:
      return {};
  }
};

// Extract variables from template blocks (and optionally subject)
export const extractVariables = (blocks: TemplateBlock[], subject?: string): string[] => {
  const variables = new Set<string>();

  // Always include senderName
  variables.add('senderName');

  const variableRegex = /\{\{([^{}]+)\}\}/g;
  const eachRegex = /\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}/g;

  const collectFromText = (text: string) => {
    for (const eachMatch of text.matchAll(eachRegex)) {
      if (eachMatch[1]) {
        variables.add(eachMatch[1].trim());
      }
    }

    const matches = text.match(variableRegex) || [];
    matches.forEach((match) => {
      const variable = match.replace(/\{\{|\}\}/g, '').trim();
      if (
        variable &&
        !variable.startsWith('#') &&
        !variable.startsWith('/') &&
        !variable.startsWith('this.') &&
        variable !== 'this' &&
        variable !== 'else'
      ) {
        variables.add(variable);
      }
    });
  };

  if (subject) {
    collectFromText(subject);
  }

  blocks.forEach((block) => {
    const blockContent = JSON.stringify(block.content || {});
    collectFromText(blockContent);
  });

  return Array.from(variables);
};

const getSocialBrandMeta = (platform: string): { label: string; color: string; badge: string } => {
  switch (platform) {
    case 'facebook':
      return { label: 'Facebook', color: '#1877F2', badge: 'f' };
    case 'twitter':
      return { label: 'Twitter', color: '#1DA1F2', badge: 'X' };
    case 'instagram':
      return { label: 'Instagram', color: '#E1306C', badge: 'IG' };
    case 'linkedin':
      return { label: 'LinkedIn', color: '#0077B5', badge: 'in' };
    case 'youtube':
      return { label: 'YouTube', color: '#FF0000', badge: '▶' };
    case 'pinterest':
      return { label: 'Pinterest', color: '#BD081C', badge: 'P' };
    case 'tiktok':
      return { label: 'TikTok', color: '#111827', badge: 'TT' };
    case 'snapchat':
      return { label: 'Snapchat', color: '#D97706', badge: 'SC' };
    case 'github':
      return { label: 'GitHub', color: '#24292F', badge: 'GH' };
    case 'discord':
      return { label: 'Discord', color: '#5865F2', badge: 'DC' };
    case 'reddit':
      return { label: 'Reddit', color: '#FF4500', badge: 'R' };
    case 'twitch':
      return { label: 'Twitch', color: '#9146FF', badge: 'TV' };
    case 'whatsapp':
      return { label: 'WhatsApp', color: '#16A34A', badge: 'WA' };
    case 'telegram':
      return { label: 'Telegram', color: '#0088CC', badge: 'TG' };
    default:
      return { label: 'Website', color: '#4F46E5', badge: '↗' };
  }
};

// Render a single nested block (used inside grid columns)
const renderColumnBlockHtml = (colBlock: TemplateBlock): string => {
  switch (colBlock.type) {
    case 'header':
      return `<div style="${styleObjectToString(colBlock.styles)}">
        <h3 style="margin: 0; font-size: inherit; font-weight: inherit; color: inherit;">${escapeHtml(colBlock.content.text || '')}</h3>
      </div>`;

    case 'text':
      return `<div style="${styleObjectToString(colBlock.styles)}">
        ${escapeHtml(colBlock.content.text || '').replace(/\n/g, '<br>')}
      </div>`;

    case 'button':
      return `<div style="text-align: center; padding: 5px;">
        <a href="${sanitizeEmailUrl(colBlock.content.url)}" style="${styleObjectToString(colBlock.styles)}">
          ${escapeHtml(colBlock.content.text || 'Button')}
        </a>
      </div>`;

    case 'image': {
      const safeSrc = sanitizeEmailUrl(colBlock.content.src);
      if (!safeSrc || safeSrc === '#') return '';
      return `<div style="text-align: center; padding: 5px;">
        <img src="${safeSrc}" alt="${escapeHtml(colBlock.content.alt || '')}" style="max-width: 100%; ${styleObjectToString(colBlock.styles)}" />
      </div>`;
    }

    case 'spacer':
      return `<div style="height: ${sanitizeCssValue(colBlock.content.height || '20px')};"></div>`;

    case 'divider':
      return `<div style="padding: 10px 0;">
        <hr style="border: none; border-top: ${sanitizeCssValue(colBlock.content.thickness || '1px')} solid ${sanitizeCssValue(colBlock.content.color || '#e0e0e0')}; margin: 0;" />
      </div>`;

    case 'card':
      return `<div style="padding: ${sanitizeCssValue(colBlock.content.padding || '16px')}; background-color: ${sanitizeCssValue(colBlock.content.backgroundColor || '#ffffff')}; border: 1px solid ${sanitizeCssValue(colBlock.content.borderColor || '#e5e7eb')}; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); margin: 10px 0; width: 100%; box-sizing: border-box; display: block; ${styleObjectToString(colBlock.styles)}">
        ${colBlock.content.title ? `<h3 style="font-size: 18px; font-weight: bold; margin: 0 0 8px 0;">${escapeHtml(colBlock.content.title)}</h3>` : ''}
        ${colBlock.content.description ? `<p style="color: #4b5563; margin: 0;">${escapeHtml(colBlock.content.description)}</p>` : ''}
      </div>`;

    default:
      return `<div style="padding: 5px;">${escapeHtml(colBlock.content.text || '')}</div>`;
  }
};

// Generate email-client-safe HTML for template
export const generateHtml = (blocks: TemplateBlock[]): string => {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">`;

  blocks.forEach((block) => {
    switch (block.type) {
      case 'header':
        html += `
    <div style="${styleObjectToString(block.styles)}">
      <h1 style="margin: 0; font-size: inherit; font-weight: inherit; color: inherit;">${escapeHtml(block.content.text || '')}</h1>
    </div>`;
        break;

      case 'text':
        html += `
    <div style="${styleObjectToString(block.styles)}">
      ${escapeHtml(block.content.text || '').replace(/\n/g, '<br>')}
    </div>`;
        break;

      case 'button':
        html += `
    <div style="text-align: center; padding: 10px;">
      <a href="${sanitizeEmailUrl(block.content.url)}" style="${styleObjectToString(block.styles)}">
        ${escapeHtml(block.content.text || '')}
      </a>
    </div>`;
        break;

      case 'image': {
        const safeSrc = sanitizeEmailUrl(block.content.src);
        if (safeSrc && safeSrc !== '#') {
          html += `
    <div style="text-align: center; padding: 10px;">
      <img src="${safeSrc}" alt="${escapeHtml(block.content.alt || '')}" style="${styleObjectToString(block.styles)}" />
    </div>`;
        }
        break;
      }

      case 'spacer':
        html += `
    <div style="height: ${sanitizeCssValue(block.content.height || '20px')};"></div>`;
        break;

      case 'divider':
        html += `
    <div style="padding: 10px 0;">
      <hr style="border: none; border-top: ${sanitizeCssValue(block.content.thickness || '1px')} solid ${sanitizeCssValue(block.content.color || '#e0e0e0')}; margin: 0;" />
    </div>`;
        break;

      case 'grid-1-column':
      case 'grid-2-column':
      case 'grid-3-column': {
        const columnCount = block.type === 'grid-1-column' ? 1 : block.type === 'grid-2-column' ? 2 : 3;
        const columns = block.content.columns || Array(columnCount).fill([]);

        html += `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${styleObjectToString(block.styles)}">
      <tbody>
        <tr>`;

        for (let i = 0; i < columnCount; i++) {
          const width = 100 / columnCount;
          html += `
          <td width="${width}%" style="padding: 10px; vertical-align: top;">`;

          if (columns[i] && columns[i].length > 0) {
            columns[i].forEach((colBlock: TemplateBlock) => {
              html += renderColumnBlockHtml(colBlock);
            });
          } else {
            html += `<div style="text-align: center; padding: 10px; color: #9ca3af;">&nbsp;</div>`;
          }

          html += `
          </td>`;
        }

        html += `
        </tr>
      </tbody>
    </table>`;
        break;
      }

      case 'quote': {
        const author = block.content.quoteAuthor ?? block.content.citation;
        html += `
    <blockquote style="${styleObjectToString(block.styles)}">
      ${escapeHtml(block.content.text || '').replace(/\n/g, '<br>')}
      ${author ? `<footer style="margin-top: 10px; font-style: normal; font-weight: bold;">— ${escapeHtml(author)}</footer>` : ''}
    </blockquote>`;
        break;
      }

      case 'list': {
        const items = block.content.items || [];
        const tag = block.content.listType === 'ordered' ? 'ol' : 'ul';
        const listStyleType = block.content.listType === 'ordered' ? 'decimal' : 'disc';
        html += `
    <${tag} style="list-style-type: ${listStyleType}; ${styleObjectToString(block.styles)}">`;
        items.forEach((item) => {
          html += `<li>${escapeHtml(item)}</li>`;
        });
        html += `</${tag}>`;
        break;
      }

      case 'social': {
        const socialLinks = block.content.socialLinks || [];
        html += `
    <div style="${styleObjectToString(block.styles)}">`;
        socialLinks.forEach((link) => {
          const meta = getSocialBrandMeta(link.platform);
          html += `
      <a href="${sanitizeEmailUrl(link.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 4px 6px; padding: 8px 14px; border-radius: 9999px; background-color: #f9fafb; border: 1px solid #e5e7eb; color: #111827; font-family: Arial, sans-serif; font-size: 13px; font-weight: 600; text-decoration: none; line-height: 1.2;">
        <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${meta.color}; color: #ffffff; font-size: 11px; font-weight: bold; text-align: center; margin-right: 6px; vertical-align: middle;">${meta.badge}</span>
        <span style="vertical-align: middle;">${meta.label}</span>
      </a>`;
        });
        html += `
    </div>`;
        break;
      }

      case 'video': {
        const watchUrl = sanitizeEmailUrl(getWatchableVideoUrl(block.content.videoUrl));
        const videoTitle = escapeHtml(block.content.title || 'Video Presentation');
        html += `
    <div style="padding: 16px 20px; ${styleObjectToString(block.styles)}">
      <div style="background-color: #111827; border-radius: 8px; padding: 28px 20px; text-align: center; border: 1px solid #1f2937;">
        <p style="margin: 0 0 14px 0; color: #f9fafb; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold;">${videoTitle}</p>
        <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none;">
          Watch Video &#9654;
        </a>
      </div>
    </div>`;
        break;
      }

      case 'card':
        html += `
    <div style="padding: ${sanitizeCssValue(block.content.padding || '16px')}; background-color: ${sanitizeCssValue(block.content.backgroundColor || '#ffffff')}; border: 1px solid ${sanitizeCssValue(block.content.borderColor || '#e5e7eb')}; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); margin: 10px 0; width: 100%; box-sizing: border-box; display: block; ${styleObjectToString(block.styles)}">
      ${block.content.title ? `<h3 style="font-size: 18px; font-weight: bold; margin: 0 0 8px 0;">${escapeHtml(block.content.title)}</h3>` : ''}
      ${block.content.description ? `<p style="color: #4b5563; margin: 0;">${escapeHtml(block.content.description)}</p>` : ''}
    </div>`;
        break;

      case 'section':
        html += `
    <div style="padding: ${sanitizeCssValue(block.content.padding || '24px')}; background-color: ${sanitizeCssValue(block.content.backgroundColor || '#f9fafb')}; margin: 10px 0; width: 100%; box-sizing: border-box; display: block; ${styleObjectToString(block.styles)}">
      ${block.content.title ? `<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 12px 0; text-align: center;">${escapeHtml(block.content.title)}</h2>` : ''}
      <div style="min-height: 24px;"></div>
    </div>`;
        break;

      default:
        html += `<div>Unsupported block type: ${escapeHtml(block.type)}</div>`;
    }
  });

  html += `
  </div>
</body>
</html>`;

  return html;
};
