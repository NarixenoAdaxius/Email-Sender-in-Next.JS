"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FlaskConical, LayoutTemplate, Mail } from "lucide-react";
import EmailSender from "@/components/dashboard/EmailSender";
import EmailTester from "@/components/dashboard/EmailTester";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface DashboardContentProps {
  isDevelopment: boolean;
}

const VALID_DASHBOARD_TABS = ["templates", "test-email"] as const;
type DashboardTab = (typeof VALID_DASHBOARD_TABS)[number];

function isDashboardTab(value: unknown): value is DashboardTab {
  return (
    typeof value === "string" &&
    (VALID_DASHBOARD_TABS as readonly string[]).includes(value)
  );
}

export default function DashboardContent({ isDevelopment }: DashboardContentProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [activeTab, setActiveTab] = useState<DashboardTab>("templates");

  useEffect(() => {
    const handleTabRequest = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (!detail || typeof detail !== "object" || Array.isArray(detail)) return;
      const requestedTab = (detail as { tab?: unknown }).tab;
      if (isDashboardTab(requestedTab)) {
        setActiveTab(requestedTab);
      }
    };

    window.addEventListener("palettemail:dashboard-tab", handleTabRequest);
    return () => {
      window.removeEventListener("palettemail:dashboard-tab", handleTabRequest);
    };
  }, []);

  return (
    <motion.section
      id="dashboard-composer"
      aria-label="Email Composer"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: "spring", bounce: 0, duration: 0.3, delay: 0.08 }
      }
      className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (isDashboardTab(value)) {
            setActiveTab(value);
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Email Composer
              </h2>
              <p className="text-sm text-muted-foreground">
                Create and send responsive emails using PaletteMail templates.
              </p>
            </div>
          </div>

          <TabsList aria-label="Workspace mode" className="min-h-11 sm:min-h-9">
            <TabsTrigger value="templates" className="min-h-9 sm:min-h-8">
              <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="test-email" className="min-h-9 sm:min-h-8">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              Test Email
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* Keep the Templates tab panel mounted across tab switches because @/components/ui/tabs unmounts inactive TabsContent panels */}
          <div
            role="tabpanel"
            data-state={activeTab === "templates" ? "active" : "inactive"}
            hidden={activeTab !== "templates"}
            className={
              activeTab !== "templates"
                ? "hidden"
                : "mt-0 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            }
          >
            <EmailSender />
          </div>

          <TabsContent value="test-email" className="mt-0">
            {isDevelopment ? (
              <div className="[&>div]:border-t-0 [&>div]:pt-0">
                <EmailTester
                  isOpen={true}
                  onToggle={() => setActiveTab("templates")}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/85 p-6 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Development SMTP Sandbox
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The standalone SMTP test endpoint is disabled in production environments. To verify live delivery, select a template in the Templates tab and send a message to your own email address.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveTab("templates")}
                      className="min-h-11 sm:min-h-9 bg-[#4F46E5] text-white hover:bg-[#4338CA] active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
                    >
                      Go to Templates
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </motion.section>
  );
}
