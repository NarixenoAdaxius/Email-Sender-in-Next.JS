import Link from "next/link";
import { cookies } from "next/headers";
import OptimizedImage from "@/components/ui/optimized-image";
import {
  MotionFadeIn,
  MotionPreviewCard,
  MotionStaggerGrid,
  MotionStaggerItem,
} from "@/components/ui/motion";

const FEATURES = [
  {
    title: "Beautiful Templates",
    description:
      "Design emails with an intuitive drag-and-drop editor. Choose from a variety of blocks to create personalized, responsive emails.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    ),
  },
  {
    title: "Easy Customization",
    description:
      "Personalize every aspect of your emails with custom fonts, colors, images, and layouts. Code or No Code. No Problem.",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
  },
  {
    title: "Made by You",
    description:
      "Create emails that reflect your unique brand and style. Your emails, your way - with professional results every time.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
      />
    ),
  },
  {
    title: "Secure Authentication",
    description:
      "Protect your account with Palette Mail Authentication for an extra layer of security using two-factor authentication.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "Email Management",
    description:
      "Organize all your email templates in one place. Save, reuse, and update your designs whenever you need them.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    ),
  },
  {
    title: "Scheduled Sending",
    description:
      "Plan your email campaigns in advance. Schedule emails to be sent at the perfect time for your audience.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    ),
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("token");
  const hasAuthCookie = !!authToken;

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-indigo-500/6 dark:from-primary/14 dark:via-transparent dark:to-indigo-400/10" />
          <div className="absolute -top-24 right-0 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
          <div className="absolute bottom-0 left-1/4 h-[320px] w-[320px] rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <MotionFadeIn className="flex flex-col justify-center space-y-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-xs sm:text-sm font-medium text-[#4F46E5] dark:bg-primary/15 dark:text-[#A5B4FC] backdrop-blur-xs">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  Professional Email Solution
                </span>

                <h1 className="text-4xl font-bold tracking-[-0.025em] leading-[1.06] text-foreground sm:text-5xl md:text-6xl">
                  <span className="block">Create stunning</span>
                  <span className="block text-[#4F46E5] dark:text-[#818CF8]">
                    email designs
                  </span>
                  <span className="block">with Palette Mail</span>
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                  Craft beautiful, responsive emails in minutes with our
                  intuitive visual builder. Personalize your content, manage
                  your contacts, and authenticate your communications securely
                  with Palette Mail.
                </p>
              </div>

              {!hasAuthCookie ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-7 py-3.5 text-center text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-primary/90 hover:shadow-xl active:scale-[0.97]"
                  >
                    Start Creating For Free
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-card/85 backdrop-blur-sm px-7 py-3.5 text-center text-base font-medium text-foreground shadow-xs transition-[transform,background-color,border-color] duration-150 ease-out hover:bg-accent active:scale-[0.97]"
                  >
                    Log In to Your Account
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-7 py-3.5 text-center text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-primary/90 hover:shadow-xl active:scale-[0.97]"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/dashboard/templates/visual/new"
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-card/85 backdrop-blur-sm px-7 py-3.5 text-center text-base font-medium text-foreground shadow-xs transition-[transform,background-color,border-color] duration-150 ease-out hover:bg-accent active:scale-[0.97]"
                  >
                    Create New Template
                  </Link>
                </div>
              )}

              <div className="pt-1">
                <p className="inline-flex items-center text-sm text-muted-foreground">
                  <span className="mr-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  No credit card required
                </p>
              </div>
            </MotionFadeIn>

            {/* Interactive App Preview */}
            <MotionPreviewCard className="flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/25 via-indigo-400/15 to-transparent opacity-60 blur-2xl dark:opacity-50"
                />
                <div className="relative rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <OptimizedImage
                          src="/PaletteMail/Icon/pltmaild 32px.svg"
                          alt="PaletteMail Icon"
                          width={20}
                          height={31}
                          className="h-7 w-auto dark:hidden"
                          priority
                        />
                        <OptimizedImage
                          src="/PaletteMail/Icon/pltmailw 32px.svg"
                          alt="PaletteMail Icon"
                          width={20}
                          height={31}
                          className="hidden h-7 w-auto dark:block"
                          priority
                        />
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                          Email Builder
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5" aria-hidden="true">
                        <div className="h-3 w-3 rounded-full bg-rose-400/90" />
                        <div className="h-3 w-3 rounded-full bg-amber-400/90" />
                        <div className="h-3 w-3 rounded-full bg-emerald-400/90" />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/35 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">
                          Template Design
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-[#4F46E5] dark:text-[#A5B4FC]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                          </div>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-[#4F46E5] dark:text-[#A5B4FC]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs">
                        <div className="mb-4 flex h-7 w-24 items-center justify-center rounded-md bg-primary/15">
                          <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC]">
                            Header
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3.5 w-full rounded bg-muted" />
                          <div className="h-3.5 w-4/5 rounded bg-muted" />
                          <div className="h-3.5 w-5/6 rounded bg-muted" />
                        </div>
                        <div className="mt-5 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-7 w-7 text-muted-foreground/50"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                            />
                          </svg>
                        </div>
                        <div className="mt-5 flex justify-center">
                          <div className="flex h-8 w-28 items-center justify-center rounded-lg bg-primary shadow-xs">
                            <span className="text-xs font-medium text-primary-foreground">
                              Read More
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-muted-foreground">
                          Recipients
                        </span>
                        <div className="flex h-9 items-center rounded-lg border border-border/70 bg-muted/50 px-3">
                          <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-muted-foreground">
                          Subject
                        </span>
                        <div className="flex h-9 items-center rounded-lg border border-border/70 bg-muted/50 px-3">
                          <div className="h-3 w-20 rounded bg-muted-foreground/20" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <div className="flex h-9 w-28 items-center justify-center rounded-lg bg-primary shadow-xs">
                        <span className="text-xs font-semibold text-primary-foreground">
                          Send Email
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MotionPreviewCard>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionFadeIn className="text-center mb-14" y={10}>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              Everything you need to create amazing emails
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
              Palette Mail combines powerful features with simplicity to help
              you create and send beautiful emails.
            </p>
          </MotionFadeIn>

          <MotionStaggerGrid className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <MotionStaggerItem
                key={feature.title}
                className="group rounded-2xl border border-border/80 bg-card/85 p-7 shadow-xs transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-[#4F46E5] dark:bg-primary/20 dark:text-[#A5B4FC] transition-colors group-hover:bg-primary/15">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.6}
                    stroke="currentColor"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </MotionStaggerItem>
            ))}
          </MotionStaggerGrid>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-700/30 via-transparent to-indigo-400/20"
        />
        <div className="relative mx-auto max-w-7xl py-14 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between gap-8">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block mt-1 text-indigo-100/90">
              Create your first email template today.
            </span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <Link
              href={hasAuthCookie ? "/dashboard" : "/register"}
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-[#4F46E5] shadow-lg transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-indigo-50 hover:shadow-xl active:scale-[0.97]"
            >
              {hasAuthCookie ? "Go to Dashboard" : "Get Started for Free"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
