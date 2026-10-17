import { RequireAuth, useTenant } from '@rentflow/api';
import { BackButton, LoadingState, TenantShell } from '@rentflow/ui';

/** Logged-in frame: phone-first column + bottom tabs. */
export function PortalLayout() {
  const session = useTenant();
  return (
    <RequireAuth session={session} loginPath="/login" fallback={<LoadingState className="min-h-screen" />}>
      <TenantShell />
    </RequireAuth>
  );
}

/** Tenant-portal card for a section whose API isn't built yet. */
export function SoonCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5">
      <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
      <p className="m-0 text-sm text-muted">{children ?? 'Coming soon.'}</p>
    </section>
  );
}

/** A portal page with its title and a Back button (previous page, else `back`, default home). */
export function PortalPage({ title, back = '/', children }: { title: string; back?: string | false; children: React.ReactNode }) {
  return (
    <>
      <header className="flex flex-col gap-1 px-5 pb-2 pt-4">
        {back !== false && <BackButton fallback={back} />}
        <h1 className="m-0 font-display text-[26px] font-bold">{title}</h1>
      </header>
      <div className="flex flex-col gap-4 px-4 pt-3">{children}</div>
    </>
  );
}
