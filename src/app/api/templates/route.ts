import { NextRequest, NextResponse } from 'next/server';
import { getTemplates } from '@/lib/email-templates';
import EmailTemplate from '@/models/EmailTemplate';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  sanitizeTemplateBlocks,
  sanitizeTemplateCss,
  sanitizeTemplateHtml,
  sanitizeTemplateTheme,
} from '@/lib/sanitize-html';

interface TemplateResponseItem {
  id: string;
  _id?: string;
  name: string;
  description: string;
  subject: string;
  html?: string;
  content?: string;
  css?: string;
  customCss?: string;
  designMode?: string;
  variables: string[];
  predefined: boolean;
  isDefault?: boolean;
  isPublic?: boolean;
  isOwner?: boolean;
  userId?: string;
  blocks?: unknown;
  theme?: unknown;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const ALLOWED_DESIGN_MODES = new Set(['studio', 'visual', 'code', 'custom']);
const MAX_TEMPLATES_LIMIT = 200;

function inferDesignMode(params: {
  designMode?: unknown;
  blocks?: unknown;
  html?: string;
}): 'studio' | 'visual' | 'code' | 'custom' {
  if (typeof params.designMode === 'string' && ALLOWED_DESIGN_MODES.has(params.designMode)) {
    return params.designMode as 'studio' | 'visual' | 'code' | 'custom';
  }
  if (Array.isArray(params.blocks) && params.blocks.length > 0) {
    return 'studio';
  }
  if (
    typeof params.html === 'string' &&
    (params.html.includes('data-pm-canvas') || params.html.includes('data-pm-block'))
  ) {
    return 'studio';
  }
  return 'custom';
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePredefined = searchParams.get('includeDefault') !== 'false';
    const isSummary = searchParams.get('fields') === 'summary';
    const includeBlocks = !isSummary && searchParams.get('includeBlocks') === 'true';

    const allTemplates: TemplateResponseItem[] = [];
    if (includePredefined) {
      const predefinedTemplates = getTemplates().map((template) => {
        const { html, ...rest } = template;
        return {
          ...rest,
          ...(isSummary ? {} : { html, content: html }),
          css: '',
          customCss: '',
          predefined: true,
          isDefault: true,
          designMode: 'default',
        };
      });
      allTemplates.push(...predefinedTemplates);
    }

    const query = {
      $or: [
        { userId: user.id },
        { isPublic: true, userId: { $ne: user.id } },
      ],
    };

    const projection = isSummary
      ? '_id name description subject isPublic userId createdAt updatedAt variables designMode css'
      : includeBlocks
        ? '_id name description subject isPublic userId createdAt updatedAt variables designMode css html blocks theme'
        : '_id name description subject isPublic userId createdAt updatedAt variables designMode css html';

    const databaseTemplates = await EmailTemplate.find(query)
      .select(projection)
      .sort({ createdAt: -1 })
      .limit(MAX_TEMPLATES_LIMIT)
      .lean<
        Array<{
          _id: unknown;
          userId: unknown;
          name: string;
          description?: string;
          subject: string;
          html?: string;
          css?: string;
          variables?: string[];
          isPublic?: boolean;
          blocks?: unknown;
          theme?: unknown;
          designMode?: string;
          createdAt?: Date | string;
          updatedAt?: Date | string;
        }>
      >();

    const transformedDbTemplates: TemplateResponseItem[] = databaseTemplates.map((templateObj) => {
      const id = String(templateObj._id);
      const ownerId = String(templateObj.userId);
      const rawHtml = typeof templateObj.html === 'string' ? templateObj.html : '';
      const rawCss = typeof templateObj.css === 'string' ? templateObj.css : '';
      const resolvedDesignMode = inferDesignMode({
        designMode: templateObj.designMode,
        blocks: templateObj.blocks,
        html: rawHtml,
      });

      return {
        _id: id,
        id,
        userId: ownerId,
        name: templateObj.name,
        description: templateObj.description ?? '',
        subject: templateObj.subject,
        ...(isSummary ? {} : { html: rawHtml, content: rawHtml }),
        css: rawCss,
        customCss: rawCss,
        variables: Array.isArray(templateObj.variables) ? templateObj.variables : [],
        isPublic: Boolean(templateObj.isPublic),
        ...(includeBlocks ? { blocks: templateObj.blocks, theme: templateObj.theme ?? null } : {}),
        designMode: resolvedDesignMode,
        createdAt: templateObj.createdAt,
        updatedAt: templateObj.updatedAt,
        predefined: false,
        isDefault: false,
        isOwner: ownerId === user.id,
      };
    });

    allTemplates.push(...transformedDbTemplates);

    return NextResponse.json({ templates: allTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `templates-write:user:${currentUser.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;

    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const data = parsedBody as {
      name?: unknown;
      description?: unknown;
      subject?: unknown;
      html?: unknown;
      content?: unknown;
      css?: unknown;
      customCss?: unknown;
      designMode?: unknown;
      variables?: unknown;
      isPublic?: unknown;
      blocks?: unknown;
      theme?: unknown;
    };

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
    const htmlContent =
      typeof data.content === 'string' && data.content.length > 0
        ? data.content
        : typeof data.html === 'string'
          ? data.html
          : '';

    if (!name || !subject || !htmlContent.trim()) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML/content are required' },
        { status: 400 }
      );
    }

    const sanitizedHtml = sanitizeTemplateHtml(htmlContent);
    if (!sanitizedHtml.trim()) {
      return NextResponse.json(
        { error: 'Template HTML contains no valid content after sanitization' },
        { status: 400 }
      );
    }

    const rawCss =
      typeof data.css === 'string' && data.css.length > 0
        ? data.css
        : typeof data.customCss === 'string'
          ? data.customCss
          : '';

    const safeBlocks = Array.isArray(data.blocks) ? sanitizeTemplateBlocks(data.blocks) : null;
    const safeTheme = sanitizeTemplateTheme(data.theme) ?? null;
    const resolvedDesignMode = inferDesignMode({
      designMode: data.designMode,
      blocks: safeBlocks,
      html: sanitizedHtml,
    });

    await connectDB();

    const template = new EmailTemplate({
      name,
      description: typeof data.description === 'string' ? data.description.trim() : '',
      subject,
      html: sanitizedHtml,
      css: sanitizeTemplateCss(rawCss),
      variables: Array.isArray(data.variables)
        ? data.variables.filter((v): v is string => typeof v === 'string')
        : [],
      isPublic: Boolean(data.isPublic),
      blocks: safeBlocks,
      theme: safeTheme,
      designMode: resolvedDesignMode,
      userId: currentUser.id,
    });

    const savedTemplate = await template.save();
    const savedTemplateObj = savedTemplate.toObject();
    const id = savedTemplateObj._id.toString();
    const savedCss = typeof savedTemplateObj.css === 'string' ? savedTemplateObj.css : '';

    return NextResponse.json(
      {
        message: 'Template created successfully',
        template: {
          ...savedTemplateObj,
          _id: id,
          id,
          userId: savedTemplateObj.userId ? savedTemplateObj.userId.toString() : currentUser.id,
          html: savedTemplateObj.html,
          content: savedTemplateObj.html,
          css: savedCss,
          customCss: savedCss,
          designMode: savedTemplateObj.designMode ?? resolvedDesignMode,
          predefined: false,
          isDefault: false,
          isOwner: true,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
