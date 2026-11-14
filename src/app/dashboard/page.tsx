import type { Metadata } from "next";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | PaletteMail",
  description: "Compose, schedule, and manage your email campaigns with PaletteMail",
};

export default function DashboardPage() {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Email Workspace
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage templates, contacts, scheduled campaigns, and compose emails from one place.
        </p>
      </header>

      <DashboardQuickActions />

      <DashboardContent isDevelopment={isDevelopment} />
    </div>
  );
}
