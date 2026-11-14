"use client";

import React, { useMemo, useState } from 'react';
import {
  AlignLeft,
  Braces,
  Code2,
  Columns,
  Copy,
  Grid,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Link as LinkIcon,
  List,
  Minus,
  Palette,
  Plus,
  Quote,
  Search,
  SeparatorHorizontal,
  Share2,
  Sparkles,
  Square,
  Type,
  Video,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { normalizeHexColor } from '../visual-builder/utils';
import { SECTION_PRESETS, STARTER_TEMPLATES } from './presets';
import {
  BlockType,
  EmailTheme,
  LeftRailTab,
  SectionPreset,
  StarterTemplate,
} from './types';

interface LeftRailProps {
  activeTab: LeftRailTab;
  onTabChange: (tab: LeftRailTab) => void;
  onAddBlock: (type: BlockType) => void;
  onInsertSection: (preset: SectionPreset) => void;
  onApplyStarter: (starter: StarterTemplate) => void;
  theme: EmailTheme;
  onThemeChange: (patch: Partial<EmailTheme>) => void;
  variables: string[];
  sampleData: Record<string, string>;
  onSampleDataChange: (key: string, value: string) => void;
}

const RAIL_TABS: { id: LeftRailTab; label: string; icon: React.ReactNode; spanClass: string }[] = [
  { id: 'blocks', label: 'Blocks', icon: <Plus className="h-3.5 w-3.5 shrink-0" />, spanClass: 'col-span-2' },
  { id: 'sections', label: 'Sections', icon: <LayoutGrid className="h-3.5 w-3.5 shrink-0" />, spanClass: 'col-span-2' },
  { id: 'templates', label: 'Starters', icon: <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />, spanClass: 'col-span-2' },
  { id: 'theme', label: 'Theme', icon: <Palette className="h-3.5 w-3.5 shrink-0" />, spanClass: 'col-span-3' },
  { id: 'variables', label: 'Personalization', icon: <Braces className="h-3.5 w-3.5 shrink-0" />, spanClass: 'col-span-3' },
];

export function humanizeVarName(variable: string): string {
  const spaced = variable
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return variable;
  return spaced
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'id' || lower === 'url') return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const BLOCK_CATALOG: {
  category: string;
  items: { type: BlockType; label: string; icon: React.ReactNode }[];
}[] = [
  {
    category: 'Essentials',
    items: [
      { type: 'header', label: 'Header', icon: <Type className="h-4 w-4" /> },
      { type: 'text', label: 'Text', icon: <AlignLeft className="h-4 w-4" /> },
      { type: 'button', label: 'Button', icon: <LinkIcon className="h-4 w-4" /> },
      { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
    ],
  },
  {
    category: 'Structure',
    items: [
      { type: 'grid-1-column', label: '1 Column', icon: <Square className="h-4 w-4" /> },
      { type: 'grid-2-column', label: '2 Columns', icon: <Columns className="h-4 w-4" /> },
      { type: 'grid-3-column', label: '3 Columns', icon: <Grid className="h-4 w-4" /> },
      { type: 'section', label: 'Section', icon: <LayoutGrid className="h-4 w-4" /> },
      { type: 'card', label: 'Card', icon: <Square className="h-4 w-4" /> },
      { type: 'spacer', label: 'Spacer', icon: <Minus className="h-4 w-4" /> },
      { type: 'divider', label: 'Divider', icon: <SeparatorHorizontal className="h-4 w-4" /> },
    ],
  },
  {
    category: 'Rich & Code',
    items: [
      { type: 'quote', label: 'Quote', icon: <Quote className="h-4 w-4" /> },
      { type: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
      { type: 'social', label: 'Social', icon: <Share2 className="h-4 w-4" /> },
      { type: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
      { type: 'custom-html', label: 'Custom HTML', icon: <Code2 className="h-4 w-4" /> },
    ],
  },
];

const FONT_OPTIONS = [
  { label: 'Arial / Sans', value: 'Arial, Helvetica, sans-serif' },
  { label: 'System UI', value: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  { label: 'Georgia / Serif', value: 'Georgia, Times New Roman, serif' },
  { label: 'Monospace', value: 'SFMono-Regular, Consolas, monospace' },
];

export function LeftRail({
  activeTab,
  onTabChange,
  onAddBlock,
  onInsertSection,
  onApplyStarter,
  theme,
  onThemeChange,
  variables,
  sampleData,
  onSampleDataChange,
}: LeftRailProps) {
  const [search, setSearch] = useState('');

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BLOCK_CATALOG;
    return BLOCK_CATALOG.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [search]);

  const copyVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    toast.info(`Copied ${token}`, { autoClose: 1600 });
  };

  return (
    <aside className="flex h-full w-full flex-col border-b border-border bg-card/70 lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0">
      {/* Rail Tabs */}
      <div
        role="tablist"
        aria-label="Studio tools"
        className="grid grid-cols-6 gap-1 border-b border-border bg-muted/40 p-1.5"
      >
        {RAIL_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`studio-rail-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`studio-rail-panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none lg:min-h-8',
                tab.spanClass,
                active
                  ? 'bg-background text-foreground shadow-xs ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Rail Content */}
      <div className="flex-1 overflow-y-auto p-3.5 pb-24 lg:pb-3.5">
        <div
          role="tabpanel"
          id="studio-rail-panel-blocks"
          aria-labelledby="studio-rail-tab-blocks"
          hidden={activeTab !== 'blocks'}
          className={cn('space-y-4', activeTab !== 'blocks' && 'hidden')}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-2.5 h-3.5 w-3.5 text-muted-foreground lg:top-2.5" />
            <Input
              aria-label="Search blocks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocks..."
              className="min-h-11 pl-8 text-xs lg:min-h-0 lg:h-8"
            />
          </div>

          {filteredCatalog.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAddBlock(item.type)}
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 py-2 text-left text-xs font-medium text-foreground transition-all hover:border-[#4F46E5]/50 hover:bg-muted/40 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none lg:min-h-0"
                  >
                    <span className="text-[#4F46E5] dark:text-[#818CF8]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          role="tabpanel"
          id="studio-rail-panel-sections"
          aria-labelledby="studio-rail-tab-sections"
          hidden={activeTab !== 'sections'}
          className={cn('space-y-2.5', activeTab !== 'sections' && 'hidden')}
        >
          <p className="text-xs text-muted-foreground">
            Drop pre-built multi-block sections directly onto your email canvas.
          </p>
          {SECTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onInsertSection(preset)}
              className="w-full min-h-11 rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-[#4F46E5]/50 hover:shadow-xs active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {preset.category}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {preset.description}
              </p>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="studio-rail-panel-templates"
          aria-labelledby="studio-rail-tab-templates"
          hidden={activeTab !== 'templates'}
          className={cn('space-y-2.5', activeTab !== 'templates' && 'hidden')}
        >
          <p className="text-xs text-muted-foreground">
            Start from a curated layout. Applying a starter replaces the current canvas.
          </p>
          {STARTER_TEMPLATES.map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => onApplyStarter(starter)}
              className="w-full min-h-11 rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-[#4F46E5]/50 hover:shadow-xs active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                  {starter.name}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {starter.category}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {starter.description}
              </p>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="studio-rail-panel-theme"
          aria-labelledby="studio-rail-tab-theme"
          hidden={activeTab !== 'theme'}
          className={cn('space-y-4', activeTab !== 'theme' && 'hidden')}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Canvas Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Canvas background color"
                value={normalizeHexColor(theme.canvasBg, '#F4F4F5')}
                onChange={(e) => onThemeChange({ canvasBg: e.target.value })}
                className="h-11 w-11 cursor-pointer rounded border border-input bg-background p-0.5 lg:h-8 lg:w-10"
              />
              <Input
                aria-label="Canvas background hex color"
                value={theme.canvasBg}
                onChange={(e) => onThemeChange({ canvasBg: e.target.value })}
                className="min-h-11 font-mono text-xs lg:min-h-0 lg:h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Email Card Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Email card background color"
                value={normalizeHexColor(theme.contentBg, '#FFFFFF')}
                onChange={(e) => onThemeChange({ contentBg: e.target.value })}
                className="h-11 w-11 cursor-pointer rounded border border-input bg-background p-0.5 lg:h-8 lg:w-10"
              />
              <Input
                aria-label="Email card background hex color"
                value={theme.contentBg}
                onChange={(e) => onThemeChange({ contentBg: e.target.value })}
                className="min-h-11 font-mono text-xs lg:min-h-0 lg:h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Primary Accent</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Primary accent color"
                value={normalizeHexColor(theme.primaryColor, '#4F46E5')}
                onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
                className="h-11 w-11 cursor-pointer rounded border border-input bg-background p-0.5 lg:h-8 lg:w-10"
              />
              <Input
                aria-label="Primary accent hex color"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
                className="min-h-11 font-mono text-xs lg:min-h-0 lg:h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-content-width" className="text-xs text-foreground">
                Container Width
              </Label>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {theme.contentWidth}px
              </span>
            </div>
            <input
              id="theme-content-width"
              type="range"
              aria-label="Container width in pixels"
              min={480}
              max={720}
              step={20}
              value={theme.contentWidth}
              onChange={(e) => onThemeChange({ contentWidth: Number(e.target.value) })}
              className="min-h-11 w-full accent-[#4F46E5] lg:min-h-0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-font" className="text-xs text-foreground">
              Default Font Stack
            </Label>
            <select
              id="theme-font"
              value={theme.fontFamily}
              onChange={(e) => onThemeChange({ fontFamily: e.target.value })}
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-0 lg:h-8"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-radius" className="text-xs text-foreground">
              Card Border Radius
            </Label>
            <Input
              id="theme-radius"
              value={theme.borderRadius}
              onChange={(e) => onThemeChange({ borderRadius: e.target.value })}
              placeholder="12px"
              className="min-h-11 font-mono text-xs lg:min-h-0 lg:h-8"
            />
          </div>
        </div>

        <div
          role="tabpanel"
          id="studio-rail-panel-variables"
          aria-labelledby="studio-rail-tab-variables"
          hidden={activeTab !== 'variables'}
          className={cn('space-y-3', activeTab !== 'variables' && 'hidden')}
        >
          <div className="rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
            Merge tags automatically fill in each recipient&apos;s details when you send. Click any{' '}
            <code className="font-mono text-foreground">{'{{token}}'}</code> to copy it, or set sample
            values for live preview.
          </div>
          <div className="space-y-2.5">
            {variables.map((variable) => {
              const label = humanizeVarName(variable);
              return (
                <div
                  key={variable}
                  className="space-y-2 rounded-lg border border-border bg-background p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <button
                      type="button"
                      onClick={() => copyVariable(variable)}
                      title={`Copy {{${variable}}}`}
                      className="inline-flex max-w-full min-h-11 items-center gap-1 truncate rounded-md bg-[#4F46E5]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#4F46E5] transition-transform duration-75 hover:bg-[#4F46E5]/20 active:scale-[0.97] motion-reduce:transform-none dark:text-[#818CF8] lg:min-h-0 lg:px-2 lg:py-0.5"
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{`{{${variable}}}`}</span>
                    </button>
                  </div>
                  <Input
                    aria-label={`Sample value for ${label}`}
                    value={sampleData[variable] || ''}
                    onChange={(e) => onSampleDataChange(variable, e.target.value)}
                    placeholder={`Sample ${label}...`}
                    className="min-h-11 text-xs lg:min-h-0 lg:h-8"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
