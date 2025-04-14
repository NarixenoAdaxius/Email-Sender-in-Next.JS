"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
}

export default function Navigation() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  
  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        // User is not logged in, but we don't show an error
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUser();
  }, []);
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "Success", 
          description: 'Logged out successfully'
        });
        setUser(null);
        router.push('/login');
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: 'Failed to logout',
        variant: "destructive"
      });
    }
  };
  
  // Navigation links based on auth state
  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/dashboard/templates', label: 'Email Templates' },
      ]
    : [
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Register' },
      ];
  
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-primary">
            Email Sender
          </Link>
          
          <div className="hidden md:ml-10 md:flex md:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  pathname === link.href
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:border-b-2 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="hidden md:flex md:items-center">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-2 rounded-full text-sm focus:outline-none"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full object-cover" 
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-gray-700">{user.name}</span>
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="block border-b border-gray-100 px-4 py-2 text-sm text-gray-700">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-gray-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Register
              </Link>
            </div>
          )}
        </div>
        
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {/* Menu icon */}
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 text-base font-medium ${
                  pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {user && (
              <>
                <Link
                  href="/dashboard/profile"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 