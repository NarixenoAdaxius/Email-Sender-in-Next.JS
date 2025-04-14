import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, getTemplateById } from '@/lib/email-templates';
import EmailTemplate from '@/models/EmailTemplate';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import { EmailTemplate as PredefinedTemplate } from '@/lib/email-templates';

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const includeDefault = url.searchParams.get('includeDefault') !== 'false';
    const currentUser = getUserFromRequest(request);
    
    await dbConnect();
    
    // If an ID is provided, return that specific template
    if (id) {
      // First check predefined templates
      if (includeDefault) {
        const predefinedTemplate = getTemplateById(id);
        if (predefinedTemplate) {
          return NextResponse.json({ template: predefinedTemplate });
        }
      }
      
      // Then check custom templates
      const customTemplate = await EmailTemplate.findById(id);
      if (!customTemplate) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      
      // Check if user has access to this template
      if (
        !customTemplate.isPublic && 
        (!currentUser || customTemplate.userId.toString() !== currentUser.id)
      ) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ 
        template: normalizeTemplate(customTemplate.toObject ? customTemplate.toObject() : customTemplate) 
      });
    }
    
    // Otherwise return all accessible templates
    let templates: Array<PredefinedTemplate | any> = [];
    
    // Add predefined templates
    if (includeDefault) {
      templates = [...getTemplates()];
    }
    
    // Add custom templates
    const customTemplatesQuery = currentUser 
      ? { $or: [{ isPublic: true }, { userId: currentUser.id }] }
      : { isPublic: true };
      
    const customTemplates = await EmailTemplate.find(customTemplatesQuery);
    
    // Combine both types of templates and normalize IDs
    const normalizedCustomTemplates = customTemplates.map(doc => 
      normalizeTemplate(doc.toObject ? doc.toObject() : doc)
    );
    
    templates = [...templates, ...normalizedCustomTemplates];
    
    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    const data = await request.json();
    
    const template = new EmailTemplate({
      ...data,
      userId: currentUser.id,
    });
    
    const savedTemplate = await template.save();
    
    return NextResponse.json({ 
      message: 'Template created successfully',
      template: normalizeTemplate(savedTemplate.toObject ? savedTemplate.toObject() : savedTemplate)
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
} 