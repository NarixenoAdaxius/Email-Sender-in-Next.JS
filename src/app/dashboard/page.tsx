import EmailSender from "@/components/dashboard/EmailSender";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Email Sender",
  description: "Send emails using templates",
};

export default function DashboardPage() {
  return <EmailSender />;
} 