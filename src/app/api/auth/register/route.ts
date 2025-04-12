import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/utils/validation';

export async function POST(request: Request) {
  console.log('Register API route called');
  
  try {
    // Connect to DB
    try {
      console.log('Connecting to database...');
      await connectDB();
      console.log('Database connection successful');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: dbError.message 
        },
        { status: 500 }
      );
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed:', { email: body.email, name: body.name });
    } catch (parseError) {
      console.error('Request parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body - could not parse JSON' },
        { status: 400 }
      );
    }
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          issues: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const { name, email, password } = validationResult.data;
    
    // Check if user already exists
    console.log('Checking if user already exists...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists');
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create new user
    let user;
    try {
      console.log('Creating new user...');
      user = await User.create({
        name,
        email,
        password, // Password will be hashed by the User model's pre-save hook
      });
      console.log('User created successfully with ID:', user._id);
    } catch (createError: any) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { 
          error: 'Failed to create user', 
          details: createError.message 
        },
        { status: 500 }
      );
    }
    
    // Generate token
    console.log('Generating token...');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('User data for token:', { id: user._id, name: user.name, email: user.email });
    
    const token = generateToken(user);
    console.log('Token generated successfully, length:', token.length);
    
    // Create response
    const response = NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        }
      }, 
      { status: 201 }
    );
    
    // Set auth cookie
    console.log('Setting auth cookie...');
    setAuthCookie(response, token);
    console.log('Auth cookie set');
    
    // Log all cookies for debugging
    console.log('Response cookies:', Object.fromEntries(response.cookies.getAll().map(c => [c.name, 'hidden-value'])));
    
    console.log('Registration successful, returning response');
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        error: 'Registration failed', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 