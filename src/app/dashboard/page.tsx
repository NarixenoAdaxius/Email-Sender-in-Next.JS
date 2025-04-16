import Link from "next/link";
import { Metadata } from "next";
import { EnvelopeIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { User } from "lucide-react";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | PaletteMail",
  description: "Create and send beautiful emails with PaletteMail",
};

// Determine if we're in development environment
const isDevelopment = process.env.NODE_ENV === 'development';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your emails and templates
        </p>
      </div>
      
      <DashboardContent isDevelopment={isDevelopment} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Link
          href="/dashboard/templates"
          className="flex items-center gap-3 p-6 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 rounded-full p-3 bg-primary/10">
            <PlusCircleIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Manage Templates</h3>
            <p className="text-sm text-gray-500">Create and edit email templates</p>
          </div>
        </Link>
        
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 p-6 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 rounded-full p-3 bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Profile Settings</h3>
            <p className="text-sm text-gray-500">Manage your account settings</p>
          </div>
        </Link>
      </div>
    </div>
  );
} 