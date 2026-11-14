import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import EmailHistory, { IEmailHistory } from '@/models/EmailHistory';
import EmailTemplate from '@/models/EmailTemplate';
import { getTemplateById } from '@/lib/email-templates';
import mongoose from 'mongoose';

interface EmailHistoryDoc extends IEmailHistory {
  _id: mongoose.Types.ObjectId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid email ID format' }, { status: 400 });
    }

    const email = await EmailHistory.findById(id).lean();

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const typedEmail = email as unknown as EmailHistoryDoc;

    if (typedEmail.userId.toString() !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let templateName = 'Unknown Template';
    const predefined = getTemplateById(typedEmail.templateId);
    if (predefined) {
      templateName = predefined.name;
    } else if (mongoose.Types.ObjectId.isValid(typedEmail.templateId)) {
      const dbTemplate = await EmailTemplate.findById(typedEmail.templateId)
        .select('name')
        .lean<{ name?: string } | null>();
      if (dbTemplate?.name) {
        templateName = dbTemplate.name;
      }
    }

    const formattedEmail = {
      id: typedEmail._id.toString(),
      subject: typedEmail.subject,
      recipients: typedEmail.recipients,
      recipient: typedEmail.recipients[0] || '',
      templateId: typedEmail.templateId,
      templateName,
      template: templateName,
      sentDate: typedEmail.sentAt.toISOString(),
      status: typedEmail.status,
      errorMessage: typedEmail.errorMessage,
      content: typedEmail.content,
    };

    return NextResponse.json({ email: formattedEmail });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching email details:', error);
    return NextResponse.json(
      { error: `Failed to fetch email details: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid email ID format' }, { status: 400 });
    }

    const deleted = await EmailHistory.findOneAndDelete({ _id: id, userId: user.id });

    if (!deleted) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Email deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting email history:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
