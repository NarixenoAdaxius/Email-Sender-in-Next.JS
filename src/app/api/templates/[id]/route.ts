import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/email-templates';
import EmailTemplate from '@/models/EmailTemplate';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  sanitizeTemplateBlocks,
  sanitizeTemplateCss,
  sanitizeTemplateHtml,
  sanitizeTemplateTheme,
} from '@/lib/sanitize-html';

const ALLOWED_DESIGN_MODES = new Set(['studio', 'visual', 'code', 'custom']);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const predefinedTemplate = getTemplateById(id);
    if (predefinedTemplate) {
      return NextResponse.json({
        template: {
          ...predefinedTemplate,
          css: '',
          customCss: '',
          designMode: 'default',
          predefined: true,
          isDefault: true,
        },
      });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      const dbTemplate = await EmailTemplate.findById(id);

      if (!dbTemplate) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const isOwner = dbTemplate.userId.toString() === user.id;
      const isPublic = dbTemplate.isPublic === true;

      if (!isOwner && !isPublic) {
        return NextResponse.json(
          { error: 'You do not have access to this template' },
          { status: 403 }
        );
      }

      const templateObj = dbTemplate.toObject();
      const rawHtml = typeof templateObj.html === 'string' ? templateObj.html : '';
      const rawCss = typeof templateObj.css === 'string' ? templateObj.css : '';
      const resolvedDesignMode = inferDesignMode({
        designMode: templateObj.designMode,
        blocks: templateObj.blocks,
        html: rawHtml,
      });

      return NextResponse.json({
        template: {
          ...templateObj,
          _id: templateObj._id.toString(),
          id: templateObj._id.toString(),
          userId: templateObj.userId ? templateObj.userId.toString() : undefined,
          predefined: false,
          isDefault: false,
          isOwner,
          html: rawHtml,
          content: rawHtml,
          css: rawCss,
          customCss: rawCss,
          designMode: resolvedDesignMode,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

async function updateTemplateHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

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

    const body = parsedBody as {
      name?: unknown;
      description?: unknown;
      subject?: unknown;
      content?: unknown;
      html?: unknown;
      css?: unknown;
      customCss?: unknown;
      designMode?: unknown;
      variables?: unknown;
      isPublic?: unknown;
      blocks?: unknown;
      theme?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const htmlContent =
      typeof body.content === 'string' && body.content.length > 0
        ? body.content
        : typeof body.html === 'string'
          ? body.html
          : '';

    if (!name || !subject || !htmlContent.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.userId.toString() !== currentUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sanitizedHtml = sanitizeTemplateHtml(htmlContent);
    if (!sanitizedHtml.trim()) {
      return NextResponse.json(
        { error: 'Template HTML contains no valid content after sanitization' },
        { status: 400 }
      );
    }

    template.name = name;
    template.subject = subject;
    template.html = sanitizedHtml;

    if (body.description !== undefined) {
      template.description =
        typeof body.description === 'string' ? body.description.trim() : '';
    }
    if (body.css !== undefined || body.customCss !== undefined) {
      const rawCss =
        typeof body.css === 'string' && body.css.length > 0
          ? body.css
          : typeof body.customCss === 'string'
            ? body.customCss
            : '';
      template.css = sanitizeTemplateCss(rawCss);
    }
    if (body.variables !== undefined) {
      template.variables = Array.isArray(body.variables)
        ? body.variables.filter((v): v is string => typeof v === 'string')
        : [];
    }
    if (body.isPublic !== undefined) {
      template.isPublic = Boolean(body.isPublic);
    }
    if (body.blocks !== undefined) {
      template.blocks = sanitizeTemplateBlocks(body.blocks);
      template.markModified('blocks');
    }
    if (body.theme !== undefined) {
      template.theme = sanitizeTemplateTheme(body.theme) ?? null;
      template.markModified('theme');
    }
    if (typeof body.designMode === 'string' && ALLOWED_DESIGN_MODES.has(body.designMode)) {
      template.designMode = body.designMode as 'studio' | 'visual' | 'code' | 'custom';
    } else if (!template.designMode) {
      template.designMode = inferDesignMode({
        blocks: template.blocks,
        html: sanitizedHtml,
      });
    }

    await template.save();

    const updatedObj = template.toObject();
    const updatedId = updatedObj._id.toString();
    const updatedCss = typeof updatedObj.css === 'string' ? updatedObj.css : '';
    const resolvedDesignMode = inferDesignMode({
      designMode: updatedObj.designMode,
      blocks: updatedObj.blocks,
      html: updatedObj.html,
    });

    return NextResponse.json({
      message: 'Template updated',
      template: {
        ...updatedObj,
        _id: updatedId,
        id: updatedId,
        userId: updatedObj.userId ? updatedObj.userId.toString() : currentUser.id,
        html: updatedObj.html,
        content: updatedObj.html,
        css: updatedCss,
        customCss: updatedCss,
        designMode: resolvedDesignMode,
        predefined: false,
        isDefault: false,
        isOwner: true,
      },
    });
  } catch (error: unknown) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateTemplateHandler(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateTemplateHandler(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.userId.toString() !== currentUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await template.deleteOne();

    return NextResponse.json({ message: 'Template deleted' });
  } catch (error: unknown) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
