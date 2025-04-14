import { NextRequest, NextResponse } from 'next/server';
import EmailTemplate from '@/models/EmailTemplate';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';

// Helper function to normalize template objects
function normalizeTemplate(template: any) {
  if (!template) return null;
  
  // If it's a database template with _id, add an id property too
  if (template._id && !template.id) {
    return {
      ...template,
      id: template._id.toString()
    };
  }
  
  return template;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const currentUser = getUserFromRequest(request);
    
    await dbConnect();
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to this template
    if (
      !template.isPublic && 
      (!currentUser || template.userId.toString() !== currentUser.id)
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ 
      template: normalizeTemplate(template.toObject ? template.toObject() : template)
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update this template
    if (template.userId.toString() !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this template' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Update template
    Object.assign(template, data);
    const updatedTemplate = await template.save();
    
    return NextResponse.json({ 
      message: 'Template updated successfully',
      template: normalizeTemplate(updatedTemplate.toObject ? updatedTemplate.toObject() : updatedTemplate)
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete this template
    if (template.userId.toString() !== currentUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this template' },
        { status: 403 }
      );
    }
    
    await EmailTemplate.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      message: 'Template deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
} 