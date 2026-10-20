import { RequireAuth, useTenant } from '@rentflow/api';
import { GlassCard, GlassLoading, PortalHeader, TenantShell, type AuthPhotos } from '@rentflow/ui';

/** Logged-in frame: phone-first glass column + floating tabs. */
export function PortalLayout() {
  const session = useTenant();
  return (
    <RequireAuth
      session={session}
      loginPath="/login"
      fallback={
        <div className="glass-bg px-5 pt-16">
          <GlassLoading />
        </div>
      }
    >
      <TenantShell />
    </RequireAuth>
  );
}

/** Behind the log in / invitation / forgot password cards (public/login/, Pexels licence). */
export const authPhotos: AuthPhotos = {
  portrait: { webp: '/login/login-portrait.webp', jpg: '/login/login-portrait.jpg' },
  landscape: { webp: '/login/login-landscape.webp', jpg: '/login/login-landscape.jpg' },
};

/** Tenant-portal card for a section whose API isn't built yet. */
export function SoonCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <GlassCard className="flex flex-col gap-1.5 p-5">
      <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
      <p className="m-0 text-sm text-glass-muted">{children ?? 'Coming soon.'}</p>
    </GlassCard>
  );
}

/**
 * A portal page: serif title (+ subtitle) and the content column. Tab roots have no Back;
 * detail pages pass `back` (previous page, else that path).
 */
export function PortalPage({
  title,
  subtitle,
  back,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PortalHeader title={title} subtitle={subtitle} back={back} />
      <div className="flex flex-col gap-3.5 px-5 pt-2">{children}</div>
    </>
  );
}
