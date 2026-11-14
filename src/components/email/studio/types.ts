import type { BlockContent, BlockType, TemplateBlock } from '../visual-builder/types';

export type { BlockContent, BlockType, TemplateBlock };

export type StudioMode = 'visual' | 'split' | 'code';
export type ViewportMode = 'desktop' | 'mobile';
export type LeftRailTab = 'blocks' | 'sections' | 'templates' | 'theme' | 'variables';

export interface EmailTheme {
  canvasBg: string;
  contentBg: string;
  contentWidth: number;
  primaryColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  paddingY: string;
}

export const DEFAULT_EMAIL_THEME: EmailTheme = {
  canvasBg: '#F4F4F5',
  contentBg: '#FFFFFF',
  contentWidth: 600,
  primaryColor: '#4F46E5',
  textColor: '#18181B',
  fontFamily: 'Arial, Helvetica, sans-serif',
  borderRadius: '12px',
  paddingY: '32px',
};

export interface StudioTemplateState {
  id?: string;
  name: string;
  description: string;
  subject: string;
  blocks: TemplateBlock[];
  theme: EmailTheme;
  customCss: string;
  html: string;
  variables: string[];
  isPublic: boolean;
}

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  theme: EmailTheme;
  blocks: TemplateBlock[];
}

export interface SectionPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  blocks: TemplateBlock[];
}
