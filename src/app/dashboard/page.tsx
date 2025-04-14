import Link from "next/link";
import EmailSender from "@/components/dashboard/EmailSender";
import { Metadata } from "next";
import { EnvelopeIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { User } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard | Email Sender",
  description: "Send emails using templates",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your emails and templates
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <DashboardCard 
          title="Send Email"
          description="Send emails using predefined or custom templates"
          icon={<EnvelopeIcon className="h-8 w-8 text-primary" />}
        >
          <EmailSender />
        </DashboardCard>
        
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
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function DashboardCard({ title, description, icon, children }: DashboardCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center">
          {icon}
          <div className="ml-4">
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
} 