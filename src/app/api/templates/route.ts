import { NextResponse } from 'next/server';
import { getTemplates, getTemplateById } from '@/lib/email-templates';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If an ID is provided, return that specific template
    if (id) {
      const template = getTemplateById(id);
      
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ template });
    }
    
    // Otherwise return all templates
    const templates = getTemplates();
    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
} 