import { nanoid } from 'nanoid';
import { DEFAULT_EMAIL_THEME, SectionPreset, StarterTemplate, TemplateBlock } from './types';

const cloneBlockWithFreshIds = (block: TemplateBlock): TemplateBlock => ({
  ...block,
  id: `${block.type || 'block'}-${nanoid(6)}`,
  content: {
    ...(block.content || {}),
    ...(Array.isArray(block?.content?.columns)
      ? {
          columns: block.content.columns.map((col) =>
            (col || []).filter(Boolean).map((child) => cloneBlockWithFreshIds(child))
          ),
        }
      : {}),
  },
  styles: { ...(block.styles || {}) },
});

export const cloneBlocks = (blocks: TemplateBlock[] = []): TemplateBlock[] =>
  (blocks || []).filter(Boolean).map(cloneBlockWithFreshIds);

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    category: 'Minimal',
    description: 'Start fresh with a clean header, body copy, and call-to-action.',
    subject: 'Hello {{name}}',
    theme: { ...DEFAULT_EMAIL_THEME },
    blocks: [
      {
        id: 'header-1',
        type: 'header',
        content: { text: 'Your Headline Here' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          text: 'Hi {{name}},\n\nStart writing your message here. Click any block to edit its content, styles, or switch to Split Mode to inspect the live HTML.',
        },
        styles: {
          padding: '24px',
          color: '#18181B',
          fontSize: '16px',
          lineHeight: '1.6',
        },
      },
      {
        id: 'button-1',
        type: 'button',
        content: { text: 'Get Started', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: '600',
        },
      },
    ],
  },
  {
    id: 'welcome-onboarding',
    name: 'Welcome Onboarding',
    category: 'Lifecycle',
    description: 'Warm welcome hero, 2-column quick tips, and primary CTA.',
    subject: 'Welcome to {{companyName}}, {{name}}!',
    theme: {
      ...DEFAULT_EMAIL_THEME,
      canvasBg: '#EEF2FF',
      primaryColor: '#4F46E5',
    },
    blocks: [
      {
        id: 'welcome-header',
        type: 'header',
        content: { text: 'Welcome aboard, {{name}}' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '36px 24px',
          textAlign: 'center',
          fontSize: '28px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'welcome-intro',
        type: 'text',
        content: {
          text: 'We are thrilled to have you with us. Here are two quick ways to get the most out of your workspace today.',
        },
        styles: {
          padding: '24px 24px 12px',
          color: '#27272A',
          fontSize: '16px',
          lineHeight: '1.6',
        },
      },
      {
        id: 'welcome-grid',
        type: 'grid-2-column',
        content: {
          columns: [
            [
              {
                id: 'welcome-card-1',
                type: 'card',
                content: {
                  title: '1. Customize Brand',
                  description: 'Set your colors, typography, and sender identity in minutes.',
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  padding: '16px',
                },
                styles: {},
              },
            ],
            [
              {
                id: 'welcome-card-2',
                type: 'card',
                content: {
                  title: '2. Launch Campaign',
                  description: 'Preview on desktop & mobile, then schedule or send right away.',
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  padding: '16px',
                },
                styles: {},
              },
            ],
          ],
        },
        styles: {},
      },
      {
        id: 'welcome-cta',
        type: 'button',
        content: { text: 'Open Your Workspace', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '14px 32px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: '600',
        },
      },
      {
        id: 'welcome-footer',
        type: 'text',
        content: {
          text: 'Sent by {{senderName}} · Unsubscribe anytime: {{unsubscribeUrl}}',
        },
        styles: {
          padding: '20px 24px',
          color: '#71717A',
          fontSize: '12px',
          textAlign: 'center',
          borderTop: '1px solid #E4E4E7',
        },
      },
    ],
  },
  {
    id: 'newsletter-digest',
    name: 'Newsletter Digest',
    category: 'Editorial',
    description: 'Clean editorial digest with featured quote, highlights list, and social links.',
    subject: 'This Week in Review — {{editionTitle}}',
    theme: {
      ...DEFAULT_EMAIL_THEME,
      canvasBg: '#F4F4F5',
      primaryColor: '#0F172A',
    },
    blocks: [
      {
        id: 'news-header',
        type: 'header',
        content: { text: 'Weekly Dispatch' },
        styles: {
          backgroundColor: '#0F172A',
          color: '#ffffff',
          padding: '32px 24px',
          textAlign: 'left',
          fontSize: '26px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'news-intro',
        type: 'text',
        content: {
          text: 'Hello {{name}},\n\nHere are the top stories, product updates, and insights curated for you this week.',
        },
        styles: {
          padding: '24px 24px 8px',
          color: '#18181B',
          fontSize: '16px',
          lineHeight: '1.6',
        },
      },
      {
        id: 'news-quote',
        type: 'quote',
        content: {
          text: 'Design is not just what it looks like and feels like. Design is how it works.',
          quoteAuthor: 'Editorial Note',
        },
        styles: {
          borderLeft: '4px solid #0F172A',
          backgroundColor: '#F8FAFC',
        },
      },
      {
        id: 'news-list',
        type: 'list',
        content: {
          listType: 'unordered',
          items: [
            'New Studio release: live Visual & Code editing',
            'Deliverability checklist for higher inbox placement',
            'Upcoming community Q&A this Thursday',
          ],
        },
        styles: {
          color: '#27272A',
          fontSize: '15px',
          lineHeight: '1.6',
        },
      },
      {
        id: 'news-cta',
        type: 'button',
        content: { text: 'Read Full Issue', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#0F172A',
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: '6px',
          textAlign: 'center',
        },
      },
      {
        id: 'news-social',
        type: 'social',
        content: {
          socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com', icon: 'twitter' },
            { platform: 'linkedin', url: 'https://linkedin.com', icon: 'linkedin' },
            { platform: 'github', url: 'https://github.com', icon: 'github' },
          ],
        },
        styles: {},
      },
      {
        id: 'news-footer',
        type: 'text',
        content: {
          text: 'You are receiving this because you subscribed to {{senderName}}.\nUnsubscribe: {{unsubscribeUrl}}',
        },
        styles: {
          padding: '16px 24px 24px',
          color: '#71717A',
          fontSize: '12px',
          textAlign: 'center',
        },
      },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Marketing',
    description: 'High-impact announcement banner, feature card, and bold CTA.',
    subject: 'Introducing {{productName}}',
    theme: {
      ...DEFAULT_EMAIL_THEME,
      canvasBg: '#FAF5FF',
      primaryColor: '#7C3AED',
    },
    blocks: [
      {
        id: 'launch-header',
        type: 'header',
        content: { text: 'Introducing {{productName}}' },
        styles: {
          backgroundColor: '#7C3AED',
          color: '#ffffff',
          padding: '40px 24px',
          textAlign: 'center',
          fontSize: '30px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'launch-card',
        type: 'card',
        content: {
          title: 'Built for Speed & Craft',
          description:
            'Faster workflows, responsive layouts out of the box, and seamless team collaboration.',
          backgroundColor: '#F5F3FF',
          borderColor: '#DDD6FE',
          padding: '20px',
        },
        styles: {},
      },
      {
        id: 'launch-cta',
        type: 'button',
        content: { text: 'Explore What’s New', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#7C3AED',
          color: '#ffffff',
          padding: '14px 32px',
          borderRadius: '9999px',
          textAlign: 'center',
          fontWeight: '600',
        },
      },
      {
        id: 'launch-footer',
        type: 'text',
        content: {
          text: '{{senderName}} · Manage preferences: {{unsubscribeUrl}}',
        },
        styles: {
          padding: '20px 24px',
          color: '#71717A',
          fontSize: '12px',
          textAlign: 'center',
        },
      },
    ],
  },
  {
    id: 'order-receipt',
    name: 'Order Receipt',
    category: 'Transactional',
    description: 'Crisp confirmation header, order summary card, and support link.',
    subject: 'Receipt for your order #{{orderId}}',
    theme: {
      ...DEFAULT_EMAIL_THEME,
      canvasBg: '#F4F4F5',
      primaryColor: '#059669',
    },
    blocks: [
      {
        id: 'receipt-header',
        type: 'header',
        content: { text: 'Payment Confirmed' },
        styles: {
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'receipt-text',
        type: 'text',
        content: {
          text: 'Hi {{name}},\n\nThank you for your purchase! Your order #{{orderId}} has been confirmed.',
        },
        styles: {
          padding: '24px 24px 12px',
          color: '#18181B',
          fontSize: '16px',
          lineHeight: '1.5',
        },
      },
      {
        id: 'receipt-card',
        type: 'card',
        content: {
          title: 'Order #{{orderId}} — {{amount}}',
          description: 'Status: Paid · Receipt sent to {{email}}',
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          padding: '18px',
        },
        styles: {},
      },
      {
        id: 'receipt-cta',
        type: 'button',
        content: { text: 'View Invoice', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '12px 26px',
          borderRadius: '8px',
          textAlign: 'center',
        },
      },
    ],
  },
];

export const SECTION_PRESETS: SectionPreset[] = [
  {
    id: 'hero-banner',
    name: 'Hero Banner + CTA',
    category: 'Hero',
    description: 'Bold headline, intro paragraph, and centered CTA button.',
    blocks: [
      {
        id: 'preset-hero-h',
        type: 'header',
        content: { text: 'Big Announcement Headline' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: '26px',
          fontWeight: 'bold',
        },
      },
      {
        id: 'preset-hero-t',
        type: 'text',
        content: {
          text: 'Share your main value proposition in one or two crisp sentences that invite readers to take action.',
        },
        styles: {
          padding: '20px 24px 8px',
          color: '#27272A',
          fontSize: '16px',
          textAlign: 'center',
        },
      },
      {
        id: 'preset-hero-b',
        type: 'button',
        content: { text: 'Learn More', url: '{{actionLink}}' },
        styles: {
          backgroundColor: '#4F46E5',
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: '8px',
          textAlign: 'center',
        },
      },
    ],
  },
  {
    id: 'two-col-features',
    name: '2-Column Feature Cards',
    category: 'Layout',
    description: 'Side-by-side feature cards that stack cleanly on mobile.',
    blocks: [
      {
        id: 'preset-2col',
        type: 'grid-2-column',
        content: {
          columns: [
            [
              {
                id: 'preset-2col-c1',
                type: 'card',
                content: {
                  title: 'Feature One',
                  description: 'Describe the first benefit clearly and concisely.',
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  padding: '16px',
                },
                styles: {},
              },
            ],
            [
              {
                id: 'preset-2col-c2',
                type: 'card',
                content: {
                  title: 'Feature Two',
                  description: 'Describe the second benefit clearly and concisely.',
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  padding: '16px',
                },
                styles: {},
              },
            ],
          ],
        },
        styles: {},
      },
    ],
  },
  {
    id: 'testimonial-callout',
    name: 'Testimonial Callout',
    category: 'Social Proof',
    description: 'Styled quote block with author attribution.',
    blocks: [
      {
        id: 'preset-quote',
        type: 'quote',
        content: {
          text: '“This email studio cut our campaign production time in half while keeping every email pixel-perfect.”',
          quoteAuthor: 'Alex Rivera, Growth Lead',
        },
        styles: {
          backgroundColor: '#F8FAFC',
          borderLeft: '4px solid #4F46E5',
        },
      },
    ],
  },
  {
    id: 'compliance-footer',
    name: 'Compliance Footer',
    category: 'Footer',
    description: 'Divider + social links + unsubscribe link ({{unsubscribeUrl}}).',
    blocks: [
      {
        id: 'preset-footer-div',
        type: 'divider',
        content: { color: '#E4E4E7', thickness: '1px' },
        styles: {},
      },
      {
        id: 'preset-footer-soc',
        type: 'social',
        content: {
          socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com', icon: 'twitter' },
            { platform: 'linkedin', url: 'https://linkedin.com', icon: 'linkedin' },
            { platform: 'website', url: 'https://example.com', icon: 'website' },
          ],
        },
        styles: {},
      },
      {
        id: 'preset-footer-txt',
        type: 'text',
        content: {
          text: 'Sent with care by {{senderName}}.\nNo longer want these emails? Unsubscribe: {{unsubscribeUrl}}',
        },
        styles: {
          padding: '8px 24px 24px',
          color: '#71717A',
          fontSize: '12px',
          textAlign: 'center',
        },
      },
    ],
  },
];
