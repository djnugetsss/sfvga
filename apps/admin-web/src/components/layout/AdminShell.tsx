'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasCapability, adminAccessLabel, type Capability } from '@/lib/permissions';
import { notifyMemberAppClosed } from '@/lib/adminAppReturn';
import { AdminNotifications } from '@/components/notifications/AdminNotifications';
import { fetchAdminRoles } from '@/hooks/useAdminRoles';

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  capability?: Capability;
  icon: 'home' | 'calendar' | 'megaphone' | 'members' | 'roles';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', capability: 'dashboard', icon: 'home' },
  { href: '/events', label: 'Events', capability: 'events', icon: 'calendar' },
  {
    href: '/announcements',
    label: 'Announcements',
    shortLabel: 'News',
    capability: 'announcements',
    icon: 'megaphone',
  },
  { href: '/members', label: 'Members', capability: 'members', icon: 'members' },
  { href: '/roles', label: 'Access', capability: 'roles', icon: 'roles' },
];

function NavIcon({ name }: { name: NavItem['icon'] }) {
  const paths: Record<NavItem['icon'], React.ReactNode> = {
    home: <path d="M3 10.7 12 3l9 7.7V21h-6v-6H9v6H3V10.7Z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    megaphone: (
      <>
        <path d="m3 11 14-6v14L3 13v-2Z" />
        <path d="M7 15v4a2 2 0 0 0 2 2h2v-4" />
      </>
    ),
    members: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M17 14a7 7 0 0 1 5 7" />
      </>
    ),
    roles: (
      <>
        <path d="M12 3 4 7v5c0 5 3.4 8 8 10 4.6-2 8-5 8-10V7l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/**
 * Authenticated admin shell with a permission-filtered bottom navigation on all screen sizes.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { firebaseUser, userProfile, access, signOut } = useAdminAuth();

  useEffect(() => {
    if (!access?.isSuperAdmin) return;
    void queryClient.prefetchQuery({
      queryKey: ['admin', 'organizationRoles'],
      queryFn: fetchAdminRoles,
      staleTime: 5 * 60_000,
    });
  }, [access?.isSuperAdmin, queryClient]);

  const handleSignOut = async () => {
    await signOut();
    if (!notifyMemberAppClosed()) {
      router.replace('/session');
    }
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.capability || hasCapability(access, item.capability),
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-border bg-canvas/95 px-4 backdrop-blur md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
            SF
          </div>
          <div>
            <p className="font-editorial text-base font-bold text-ink sm:text-lg">
              SFVGA Administration
            </p>
            <p className="text-xs font-medium text-muted">Access: {adminAccessLabel(access)}</p>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-4">
          <AdminNotifications />
          <span className="hidden text-sm text-muted lg:inline">
            {userProfile?.displayName || firebaseUser?.phoneNumber || 'Admin'}
          </span>
          <button
            onClick={() => void handleSignOut()}
            className="min-h-11 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-brand shadow-sm hover:bg-brandSoft sm:px-4 sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8 lg:pt-4">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex min-h-[74px] items-center justify-around border-t border-border bg-canvas/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(68,48,38,0.035)] backdrop-blur"
        aria-label="Admin navigation"
      >
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`flex min-h-[74px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[13px] font-semibold ${
                active ? 'text-accentStrong' : 'text-muted'
              }`}
            >
              <span className={active ? 'rounded-full bg-accentSoft px-4 py-1.5' : 'px-4 py-1.5'}>
                <NavIcon name={item.icon} />
              </span>
              {item.shortLabel ? (
                <>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
