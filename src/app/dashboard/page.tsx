import Link from "next/link";
import { Metadata } from "next";
import { EnvelopeIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { User, BarChart } from "lucide-react";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | PaletteMail",
  description: "Create and send beautiful emails with PaletteMail",
};

// Determine if we're in development environment
const isDevelopment = process.env.NODE_ENV === 'development';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Link href="/templates" className="group">
          <div className="border rounded-lg p-6 h-full hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-xl font-semibold mb-3 group-hover:text-primary">Email Templates</h2>
            <p className="text-gray-600 mb-4">Create and manage your email templates</p>
            <span className="text-primary font-medium">Manage Templates →</span>
          </div>
        </Link>
        
        <Link href="/contacts" className="group">
          <div className="border rounded-lg p-6 h-full hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-xl font-semibold mb-3 group-hover:text-primary">Contact Lists</h2>
            <p className="text-gray-600 mb-4">Organize your contacts and recipient lists</p>
            <span className="text-primary font-medium">Manage Contacts →</span>
          </div>
        </Link>
        
        <Link href="/history" className="group">
          <div className="border rounded-lg p-6 h-full hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-xl font-semibold mb-3 group-hover:text-primary">Email History</h2>
            <p className="text-gray-600 mb-4">View your sent emails and delivery status</p>
            <span className="text-primary font-medium">View History →</span>
          </div>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <Link href="/profile" className="group">
          <div className="border rounded-lg p-6 h-full hover:border-primary hover:shadow-md transition-all">
            <h2 className="text-xl font-semibold mb-3 group-hover:text-primary">Account Settings</h2>
            <p className="text-gray-600 mb-4">Manage your profile and preferences</p>
            <span className="text-primary font-medium">View Settings →</span>
          </div>
        </Link>
      </div>
      
      <DashboardContent isDevelopment={process.env.NODE_ENV === 'development'} />
    </div>
  );
} 