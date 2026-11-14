"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Trash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPinterest,
  FaTiktok,
  FaSnapchat,
  FaGithub,
  FaGlobe,
  FaDiscord,
  FaReddit,
  FaTwitch,
  FaWhatsapp,
  FaTelegram,
} from 'react-icons/fa';

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface SocialContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function SocialContentEditor({ block, onUpdateContent }: SocialContentEditorProps) {
  const socialLinks: SocialLink[] = block.content.socialLinks || [];

  const platformOptions = [
    { value: 'facebook', label: 'Facebook', icon: <FaFacebook className="h-5 w-5 text-[#1877F2]" /> },
    { value: 'twitter', label: 'Twitter', icon: <FaTwitter className="h-5 w-5 text-[#1DA1F2]" /> },
    { value: 'instagram', label: 'Instagram', icon: <FaInstagram className="h-5 w-5 text-[#E1306C]" /> },
    { value: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin className="h-5 w-5 text-[#0077B5]" /> },
    { value: 'youtube', label: 'YouTube', icon: <FaYoutube className="h-5 w-5 text-[#FF0000]" /> },
    { value: 'pinterest', label: 'Pinterest', icon: <FaPinterest className="h-5 w-5 text-[#BD081C]" /> },
    { value: 'tiktok', label: 'TikTok', icon: <FaTiktok className="h-5 w-5 text-foreground" /> },
    { value: 'snapchat', label: 'Snapchat', icon: <FaSnapchat className="h-5 w-5 text-[#EAB308]" /> },
    { value: 'github', label: 'GitHub', icon: <FaGithub className="h-5 w-5 text-foreground" /> },
    { value: 'discord', label: 'Discord', icon: <FaDiscord className="h-5 w-5 text-[#5865F2]" /> },
    { value: 'reddit', label: 'Reddit', icon: <FaReddit className="h-5 w-5 text-[#FF4500]" /> },
    { value: 'twitch', label: 'Twitch', icon: <FaTwitch className="h-5 w-5 text-[#9146FF]" /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <FaWhatsapp className="h-5 w-5 text-[#25D366]" /> },
    { value: 'telegram', label: 'Telegram', icon: <FaTelegram className="h-5 w-5 text-[#0088CC]" /> },
    { value: 'website', label: 'Website', icon: <FaGlobe className="h-5 w-5 text-[#4F46E5]" /> },
  ];

  const handleAddLink = () => {
    const newLinks = [...socialLinks, { platform: 'website', url: '', icon: 'website' }];
    onUpdateContent(block.id, { socialLinks: newLinks });
  };

  const handleUpdateLink = (index: number, field: string, value: string) => {
    const newLinks = [...socialLinks];
    newLinks[index] = {
      ...newLinks[index],
      [field]: value,
      ...(field === 'platform' ? { icon: value || 'website' } : {}),
    };
    onUpdateContent(block.id, { socialLinks: newLinks });
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = socialLinks.filter((_, i) => i !== index);
    onUpdateContent(block.id, { socialLinks: newLinks });
  };

  const getPlatformIconComponent = (platform: string) => {
    const option = platformOptions.find((opt) => opt.value === platform);
    return option ? option.icon : <FaGlobe className="h-5 w-5 text-[#4F46E5]" />;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <span className="block text-sm font-medium text-foreground">Social Links</span>

        <div className="flex flex-wrap justify-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          {socialLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add social links to see a preview</p>
          ) : (
            socialLinks.map((link, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-xs">
                  {getPlatformIconComponent(link.platform)}
                </div>
                <span className="mt-1 text-xs capitalize text-muted-foreground">{link.platform}</span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          {socialLinks.map((link: SocialLink, index: number) => {
            const platformId = `social-platform-${block.id}-${index}`;
            const urlId = `social-url-${block.id}-${index}`;

            return (
              <div
                key={index}
                className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-2 rounded-lg border border-border bg-card p-2"
              >
                <div className="flex shrink-0 items-center justify-center pl-1">
                  {getPlatformIconComponent(link.platform)}
                </div>

                <div className="relative">
                  <Label htmlFor={platformId} className="sr-only">
                    Social platform {index + 1}
                  </Label>
                  <select
                    id={platformId}
                    name={`socialPlatform_${index}`}
                    value={link.platform}
                    onChange={(e) => handleUpdateLink(index, 'platform', e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {platformOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
                </div>

                <div>
                  <Label htmlFor={urlId} className="sr-only">
                    Social URL {index + 1}
                  </Label>
                  <Input
                    id={urlId}
                    name={`socialUrl_${index}`}
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove social link ${index + 1}`}
                  onClick={() => handleRemoveLink(index)}
                  className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLink}
          className="mt-2 flex w-full items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Social Link
        </Button>
      </div>
    </div>
  );
}
