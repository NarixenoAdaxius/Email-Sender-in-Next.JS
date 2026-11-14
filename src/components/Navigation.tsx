"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Bell,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationPanel } from "@/components/ui/NotificationPanel";
import OptimizedImage from "@/components/ui/optimized-image";
import { ThemeToggle } from "@/components/providers/ThemeProvider";

interface NavUser {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
}

const AUTH_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/profile", label: "Profile" },
];

const DRAWER_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Navigation() {
  const { toast } = useToast();
  const [user, setUser] = useState<NavUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pendingMenuFocusRef = useRef<"first" | "last" | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data?.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user on mount; subsequent updates happen via auth-state-changed and user-profile-updated events
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleAuthChange = () => {
      fetchUser();
    };
    window.addEventListener("auth-state-changed", handleAuthChange);
    return () =>
      window.removeEventListener("auth-state-changed", handleAuthChange);
  }, [fetchUser]);

  // Listen for profile updates (name and/or profile picture)
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        name?: string;
        profilePicture?: string | null;
      }>;
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(typeof customEvent.detail?.name === "string" &&
          customEvent.detail.name.trim()
            ? { name: customEvent.detail.name.trim() }
            : {}),
          ...(customEvent.detail?.profilePicture !== undefined
            ? { profilePicture: customEvent.detail.profilePicture }
            : {}),
        };
      });
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const handleSkipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target =
      document.getElementById("main-content") ??
      document.querySelector("main");
    if (target instanceof HTMLElement) {
      event.preventDefault();
      // Defensive fallback if a route ever mounts <main> without SSR tabIndex
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: false });
      target.scrollIntoView({ behavior: "auto" });
    }
  };

  const getProfileMenuItems = useCallback((): HTMLElement[] => {
    if (!profileMenuRef.current) return [];
    return Array.from(
      profileMenuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true"
    );
  }, []);

  const closeProfileDropdown = useCallback((restoreFocus = false) => {
    pendingMenuFocusRef.current = null;
    setIsProfileDropdownOpen(false);
    if (restoreFocus) {
      profileTriggerRef.current?.focus();
    }
  }, []);

  const getMobileDrawerFocusableElements = useCallback((): HTMLElement[] => {
    if (!mobileDrawerRef.current) return [];
    return Array.from(
      mobileDrawerRef.current.querySelectorAll<HTMLElement>(
        DRAWER_FOCUSABLE_SELECTOR
      )
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-hidden") !== "true"
    );
  }, []);

  const closeMobileMenu = useCallback((restoreFocus = false) => {
    setIsMenuOpen(false);
    if (restoreFocus) {
      mobileMenuButtonRef.current?.focus();
    }
  }, []);

  const handleProfileDropdownKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!isProfileDropdownOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        pendingMenuFocusRef.current = "first";
        setIsProfileDropdownOpen(true);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        pendingMenuFocusRef.current = "last";
        setIsProfileDropdownOpen(true);
      }
      return;
    }

    const items = getProfileMenuItems();
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex =
        currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[prevIndex]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [pathname]);

  // Close desktop profile dropdown on outside click, outside focus, or Escape (restoring trigger focus)
  useEffect(() => {
    if (!isProfileDropdownOpen) return;

    if (pendingMenuFocusRef.current) {
      const target = pendingMenuFocusRef.current;
      pendingMenuFocusRef.current = null;
      const items = getProfileMenuItems();
      if (target === "last") {
        items[items.length - 1]?.focus();
      } else {
        items[0]?.focus();
      }
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        closeProfileDropdown(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        closeProfileDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProfileDropdown(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileDropdownOpen, closeProfileDropdown, getProfileMenuItems]);

  // Move initial focus into mobile drawer, trap Tab/Shift+Tab, handle Escape, and lock body scroll
  useEffect(() => {
    if (!isMenuOpen) return;

    const initialFocusable = getMobileDrawerFocusableElements();
    if (initialFocusable.length > 0) {
      initialFocusable[0].focus({ preventScroll: true });
    } else {
      mobileDrawerRef.current?.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu(true);
        return;
      }

      if (event.key === "Tab") {
        const focusable = getMobileDrawerFocusableElements();
        if (focusable.length === 0) {
          event.preventDefault();
          mobileDrawerRef.current?.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const insideDrawer = Boolean(
          active && mobileDrawerRef.current?.contains(active)
        );

        if (event.shiftKey) {
          if (
            !insideDrawer ||
            active === first ||
            active === mobileDrawerRef.current
          ) {
            event.preventDefault();
            last.focus({ preventScroll: true });
          }
        } else if (!insideDrawer || active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, closeMobileMenu, getMobileDrawerFocusableElements]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Signed out",
          description: "Logged out successfully",
        });
        setUser(null);
        setIsProfileDropdownOpen(false);
        setIsMenuOpen(false);
        window.dispatchEvent(new Event("auth-state-changed"));
        router.push("/login");
        router.refresh();
      } else {
        throw new Error("Failed to logout");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const showGuestCtas =
    !user && (!isLoading || !pathname?.startsWith("/dashboard"));

  return (
    <>
      <a
        href="#main-content"
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 apple-glass">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        >
          {/* Left: Brand */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              className="flex items-center rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <OptimizedImage
                src="/logo.svg"
                alt="PaletteMail Logo"
                width={170}
                height={32}
                className="h-7 lg:h-8 w-auto dark:invert dark:hue-rotate-180 dark:brightness-125"
                priority
              />
            </Link>
          </div>

          {/* Center: Authenticated Navigation Links */}
          {user && (
            <div className="hidden md:flex flex-1 items-center justify-center min-w-0">
              <div className="flex items-center gap-0.5 lg:gap-1 rounded-full border border-border/60 bg-muted/50 p-1">
                {AUTH_LINKS.map((link) => {
                  const active = isRouteActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative inline-flex items-center whitespace-nowrap rounded-full px-2.5 lg:px-3.5 py-1.5 text-[13px] lg:text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        active
                          ? "text-[#4F46E5] dark:text-[#A5B4FC]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill"
                          transition={{
                            type: "spring",
                            duration: 0.32,
                            bounce: 0,
                          }}
                          className="absolute inset-0 rounded-full bg-background shadow-xs border border-border/70"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Side: Single-mount Theme Toggle & Notifications + Responsive Auth/Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {user && <NotificationPanel />}

            {/* Desktop User / Auth Controls */}
            <div className="hidden md:flex items-center gap-2.5">
              {user ? (
                <div
                  ref={profileDropdownRef}
                  onKeyDown={handleProfileDropdownKeyDown}
                  className="relative"
                >
                  <button
                    ref={profileTriggerRef}
                    type="button"
                    aria-expanded={isProfileDropdownOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    onClick={(event) => {
                      if (isProfileDropdownOpen) {
                        closeProfileDropdown(false);
                      } else {
                        pendingMenuFocusRef.current =
                          event.detail === 0 ? "first" : null;
                        setIsProfileDropdownOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-sm shadow-xs transition-[transform,background-color,border-color] duration-150 hover:bg-accent active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {user.profilePicture ? (
                      <OptimizedImage
                        src={user.profilePicture}
                        alt={user.name}
                        width={26}
                        height={26}
                        className="h-6.5 w-6.5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="hidden lg:inline max-w-[128px] truncate font-medium text-foreground">
                      {user.name}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                        isProfileDropdownOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        ref={profileMenuRef}
                        role="menu"
                        aria-label="Account menu"
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{
                          type: "spring",
                          duration: 0.24,
                          bounce: 0,
                        }}
                        style={{ transformOrigin: "top right" }}
                        className="absolute right-0 mt-2 w-60 rounded-2xl border border-border/80 bg-popover/95 text-popover-foreground backdrop-blur-xl backdrop-saturate-150 p-1.5 shadow-2xl z-50"
                      >
                        <div className="px-3 py-2.5 border-b border-border/60 mb-1">
                          <div className="text-sm font-semibold truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>

                        <Link
                          href="/dashboard/profile"
                          role="menuitem"
                          aria-current={
                            isRouteActive("/dashboard/profile") ? "page" : undefined
                          }
                          onClick={() => closeProfileDropdown(false)}
                          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                        >
                          <UserIcon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          Profile Settings
                        </Link>

                        <Link
                          href="/profile/notifications"
                          role="menuitem"
                          aria-current={
                            isRouteActive("/profile/notifications")
                              ? "page"
                              : undefined
                          }
                          onClick={() => closeProfileDropdown(false)}
                          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                        >
                          <Bell
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          All Notifications
                        </Link>

                        <div className="my-1 h-px bg-border/60" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors active:scale-[0.98] motion-reduce:transform-none cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            ) : showGuestCtas ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  aria-current={pathname === "/login" ? "page" : undefined}
                  className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-foreground/85 hover:bg-accent hover:text-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  aria-current={pathname === "/register" ? "page" : undefined}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.98] motion-reduce:transform-none"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
            )}
            </div>

            {/* Mobile Drawer Trigger */}
            <div className="flex items-center md:hidden">
              <button
              ref={mobileMenuButtonRef}
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-foreground/80 hover:bg-accent hover:text-foreground transition-[transform,background-color,color] duration-150 active:scale-[0.95] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              onClick={() =>
                isMenuOpen ? closeMobileMenu(true) : setIsMenuOpen(true)
              }
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation-drawer"
              aria-label={isMenuOpen ? "Close main menu" : "Open main menu"}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer & Translucent Scrim (removed from DOM when closed) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              key="mobile-nav-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => closeMobileMenu(true)}
              className="fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-xs md:hidden"
              aria-hidden="true"
            />
            <motion.aside
              ref={mobileDrawerRef}
              key="mobile-nav-drawer"
              id="mobile-navigation-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", duration: 0.34, bounce: 0 }}
              className="fixed top-16 bottom-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border/80 bg-card/95 text-card-foreground backdrop-blur-xl shadow-2xl md:hidden focus:outline-none"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={() => closeMobileMenu(true)}
                  aria-label="Close navigation menu"
                  className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {user && (
                  <div className="flex items-center gap-3 px-4 py-4 bg-muted/40">
                    {user.profilePicture ? (
                      <OptimizedImage
                        src={user.profilePicture}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-1">
                  {user ? (
                    AUTH_LINKS.map((link) => {
                      const active = isRouteActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => closeMobileMenu(false)}
                          className={`flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? "bg-primary/10 text-[#4F46E5] dark:bg-primary/20 dark:text-[#A5B4FC] font-semibold"
                              : "text-foreground/85 hover:bg-accent hover:text-foreground"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })
                  ) : (
                    <div className="space-y-2.5 p-1">
                      <Link
                        href="/login"
                        aria-current={pathname === "/login" ? "page" : undefined}
                        onClick={() => closeMobileMenu(false)}
                        className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        aria-current={
                          pathname === "/register" ? "page" : undefined
                        }
                        onClick={() => closeMobileMenu(false)}
                        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>

                {user && (
                  <div className="p-3 space-y-1.5">
                    <Link
                      href="/profile/notifications"
                      aria-current={
                        isRouteActive("/profile/notifications")
                          ? "page"
                          : undefined
                      }
                      onClick={() => closeMobileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground/85 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    >
                      <Bell
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      All Notifications
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors active:scale-[0.98] motion-reduce:transform-none cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
