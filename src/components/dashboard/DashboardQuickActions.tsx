"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Mail,
  Sparkles,
  Users,
  Calendar,
  Inbox,
  Settings,
  ArrowRight,
  CheckCircle2,
  Circle,
  X,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_DISMISSED_KEY = "palettemail:onboarding:dismissed";
const ONBOARDING_STEPS_KEY = "palettemail:onboarding:steps";
const DASHBOARD_TAB_EVENT = "palettemail:dashboard-tab";
const VALID_DASHBOARD_TABS = ["templates", "test-email"] as const;

type DashboardTab = (typeof VALID_DASHBOARD_TABS)[number];
type OnboardingStepId = "studio" | "contacts" | "test";

function isDashboardTab(value: unknown): value is DashboardTab {
  return (
    typeof value === "string" &&
    (VALID_DASHBOARD_TABS as readonly string[]).includes(value)
  );
}

interface QuickActionItem {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    href: "/dashboard/templates",
    title: "Email Templates",
    description: "Create, organize, and reuse responsive email templates.",
    cta: "Manage Templates",
    icon: Mail,
  },
  {
    href: "/dashboard/templates/new",
    title: "New Studio Template",
    description: "Design block-based and HTML layouts in Email Studio.",
    cta: "Open Email Studio",
    icon: Sparkles,
  },
  {
    href: "/dashboard/contacts",
    title: "Contact Lists",
    description: "Organize recipients, companies, and audience tags in one place.",
    cta: "Manage Contacts",
    icon: Users,
  },
  {
    href: "/dashboard/schedule",
    title: "Email Scheduling",
    description: "Queue one-time or recurring sends for the right moment.",
    cta: "Manage Schedule",
    icon: Calendar,
  },
  {
    href: "/dashboard/history",
    title: "Email History",
    description: "Inspect sent messages, delivery status, and content previews.",
    cta: "View History",
    icon: Inbox,
  },
  {
    href: "/dashboard/profile",
    title: "Account Settings",
    description: "Update your profile, security preferences, and notifications.",
    cta: "View Settings",
    icon: Settings,
  },
];

export default function DashboardQuickActions() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [hydrated, setHydrated] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<OnboardingStepId, boolean>>({
    studio: false,
    contacts: false,
    test: false,
  });

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
      setIsDismissed(dismissed);

      const savedSteps = localStorage.getItem(ONBOARDING_STEPS_KEY);
      if (savedSteps) {
        const parsed: unknown = JSON.parse(savedSteps);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const record = parsed as Record<string, unknown>;
          setCompletedSteps({
            studio: Boolean(record.studio),
            contacts: Boolean(record.contacts),
            test: Boolean(record.test),
          });
        }
      }
    } catch {
      setIsDismissed(false);
    } finally {
      setHydrated(true);
    }
  }, []);

  const persistSteps = (next: Record<OnboardingStepId, boolean>) => {
    try {
      localStorage.setItem(ONBOARDING_STEPS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const markStepCompleted = (step: OnboardingStepId, value = true) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [step]: value };
      persistSteps(next);
      return next;
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    } catch {
      // Ignore storage errors
    }
  };

  const switchDashboardTab = (tab: DashboardTab) => {
    if (!isDashboardTab(tab)) return;
    window.dispatchEvent(
      new CustomEvent<{ tab: DashboardTab }>(DASHBOARD_TAB_EVENT, {
        detail: { tab },
      })
    );
    const composer = document.getElementById("dashboard-composer");
    if (composer) {
      composer.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <div className="mb-8 space-y-6">
      <AnimatePresence initial={false}>
        {hydrated && !isDismissed && (
          <motion.section
            aria-label="Getting started checklist"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { type: "spring", duration: 0.3, bounce: 0 }
            }
            className="rounded-2xl border border-border/60 bg-background/85 p-5 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    First-Run Checklist
                  </span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {completedCount} of 3 completed
                  </span>
                </div>
                <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Get your workspace ready to send
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Complete these three quick steps to design templates, organize contacts, and verify delivery.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                aria-label="Dismiss onboarding checklist"
                title="Dismiss checklist"
                className="min-h-11 min-w-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground sm:min-h-9 sm:min-w-9 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <ol className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {/* Step 1 */}
              <li
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${
                  completedSteps.studio
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/70 bg-card/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => markStepCompleted("studio", !completedSteps.studio)}
                    aria-label={
                      completedSteps.studio
                        ? "Mark template step incomplete"
                        : "Mark template step complete"
                    }
                    className="mt-0.5 inline-flex min-h-11 min-w-11 -m-2.5 items-center justify-center rounded-full text-muted-foreground hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-indigo-400 sm:min-h-8 sm:min-w-8 sm:-m-1"
                  >
                    {completedSteps.studio ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Step 1</span>
                    <p
                      className={`mt-0.5 text-sm font-medium ${
                        completedSteps.studio ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      Design or customize a template in Email Studio
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <Link
                    href="/dashboard/templates/new"
                    onClick={() => markStepCompleted("studio", true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#4338CA] active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Open Studio
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      markStepCompleted("studio", true);
                      switchDashboardTab("templates");
                    }}
                    className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                  >
                    Templates tab
                  </button>
                </div>
              </li>

              {/* Step 2 */}
              <li
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${
                  completedSteps.contacts
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/70 bg-card/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => markStepCompleted("contacts", !completedSteps.contacts)}
                    aria-label={
                      completedSteps.contacts
                        ? "Mark contacts step incomplete"
                        : "Mark contacts step complete"
                    }
                    className="mt-0.5 inline-flex min-h-11 min-w-11 -m-2.5 items-center justify-center rounded-full text-muted-foreground hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-indigo-400 sm:min-h-8 sm:min-w-8 sm:-m-1"
                  >
                    {completedSteps.contacts ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Step 2</span>
                    <p
                      className={`mt-0.5 text-sm font-medium ${
                        completedSteps.contacts ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      Import or add your contacts
                    </p>
                  </div>
                </div>
                <div className="pl-8">
                  <Link
                    href="/dashboard/contacts"
                    onClick={() => markStepCompleted("contacts", true)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:border-indigo-500/40 hover:text-indigo-600 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-indigo-400 sm:min-h-8"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Go to Contacts
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>

              {/* Step 3 */}
              <li
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${
                  completedSteps.test
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/70 bg-card/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => markStepCompleted("test", !completedSteps.test)}
                    aria-label={
                      completedSteps.test
                        ? "Mark SMTP test step incomplete"
                        : "Mark SMTP test step complete"
                    }
                    className="mt-0.5 inline-flex min-h-11 min-w-11 -m-2.5 items-center justify-center rounded-full text-muted-foreground hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-indigo-400 sm:min-h-8 sm:min-w-8 sm:-m-1"
                  >
                    {completedSteps.test ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Step 3</span>
                    <p
                      className={`mt-0.5 text-sm font-medium ${
                        completedSteps.test ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      Send a test email to verify your SMTP setup
                    </p>
                  </div>
                </div>
                <div className="pl-8">
                  <button
                    type="button"
                    onClick={() => {
                      markStepCompleted("test", true);
                      switchDashboardTab("test-email");
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:border-indigo-500/40 hover:text-indigo-600 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-indigo-400 sm:min-h-8"
                  >
                    <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                    Open Test Email
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            </ol>
          </motion.section>
        )}
      </AnimatePresence>

      <section aria-label="Workspace quick actions">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.12 }
                    : {
                        type: "spring",
                        bounce: 0,
                        duration: 0.3,
                        delay: index * 0.03,
                      }
                }
              >
                <Link
                  href={item.href}
                  className="group flex h-full min-h-11 flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-colors duration-150 motion-reduce:transition-none hover:border-indigo-500/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none motion-reduce:transform-none group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground transition-colors duration-150 motion-reduce:transition-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {item.cta}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
