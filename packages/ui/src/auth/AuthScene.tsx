import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@rentflow/core';

/** The two sides of an auth screen, e.g. 'login' | 'signup' (admin) or 'login' | 'invite' (portal). */
export type AuthSides<M extends string> = Record<M, ReactNode>;

const SWAP_MS = 700;

/**
 * Auth screen frame from the design (rentflow-auth.html): dark leaf background, glass card, a Welcome
 * panel and a Form panel.
 *
 * Switching `mode` slides the two panels past each other (a glow sweeps across the seam) and swaps the
 * content halfway through: the old content fades out, then the new one comes in with a stagger
 * (wrap blocks in <AuthStagger>). The first input of the new form gets focus and screen readers hear
 * `announce`. Below `md` the panels stack and only the content swaps. Honours reduced motion.
 *
 * `flipped` modes put the form on the left (the design's "login" layout).
 */
export function AuthScene<M extends string>({
  mode,
  flipped,
  welcome,
  form,
  announce,
}: {
  mode: M;
  flipped: (mode: M) => boolean;
  welcome: AuthSides<M>;
  form: AuthSides<M>;
  announce?: (mode: M) => string;
}) {
  // `shown` lags `mode` by half the slide, so the old content can fade out first.
  const [shown, setShown] = useState(mode);
  const [leaving, setLeaving] = useState(false);
  const [sweep, setSweep] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (mode === shown) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLeaving(true);
    setSweep((n) => n + 1);
    const t = window.setTimeout(
      () => {
        setShown(mode);
        setLeaving(false);
        // Focus the first field of the new form, like the design.
        window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('input, a, button')?.focus({ preventScroll: true }));
      },
      reduce ? 200 : SWAP_MS * 0.45,
    );
    return () => window.clearTimeout(t);
    // `shown` is intentionally not a dependency: only a new `mode` starts a swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isFlipped = flipped(mode);
  const enter = flipped(shown) ? 'left' : 'right';

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-x-hidden bg-auth-night px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] font-auth text-white md:items-center md:p-6 [&_a:focus-visible]:outline-auth-mint [&_button:focus-visible]:outline-auth-mint">
      <AuthLeaves shifted={isFlipped} />
      <div className="fixed inset-0 bg-auth-night/45" aria-hidden="true" />

      <main
        className="relative z-[1] flex w-full max-w-[1100px] flex-col overflow-hidden rounded-[16px] border border-white/[.08] bg-auth-night/55 shadow-auth-card backdrop-blur-md md:block md:h-[620px]"
      >
        {/* Glow sweeping across the seam while the panels slide. */}
        {sweep > 0 && (
          <div
            key={sweep}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 z-[3] -ml-[70px] hidden h-full w-[140px] animate-auth-sweep bg-gradient-to-r from-transparent via-auth-mint/35 to-transparent opacity-0 md:block motion-reduce:hidden"
          />
        )}
        <p className="sr-only" aria-live="polite">
          {sweep > 0 && announce ? announce(mode) : ''}
        </p>

        <section
          className={cn(
            'relative flex min-h-[250px] w-full items-center bg-gradient-to-br from-auth-forest/55 to-auth-night/25 px-6 pb-7 pt-[84px]',
            'md:absolute md:left-0 md:top-0 md:h-full md:w-1/2 md:px-14 md:py-14 md:transition-transform md:duration-swap md:ease-swap motion-reduce:transition-none',
            isFlipped && 'md:translate-x-full',
          )}
        >
          <AuthLogo className="absolute left-6 top-7 md:left-14 md:top-9" />
          <SceneView leaving={leaving} enter={enter}>
            {welcome[shown]}
          </SceneView>
        </section>

        <section
          className={cn(
            'relative flex w-full items-center bg-auth-night/55 px-6 pb-8 pt-7',
            'md:absolute md:left-1/2 md:top-0 md:h-full md:w-1/2 md:px-14 md:py-12 md:transition-transform md:duration-swap md:ease-swap motion-reduce:transition-none',
            isFlipped && 'md:-translate-x-full',
          )}
        >
          <div ref={formRef} className="w-full">
            <SceneView leaving={leaving} enter={enter}>
              {form[shown]}
            </SceneView>
          </div>
        </section>
      </main>
    </div>
  );
}

function SceneView({ leaving, enter, children }: { leaving: boolean; enter: 'left' | 'right'; children: ReactNode }) {
  return (
    <div
      data-enter={enter}
      className={cn('group/scene flex w-full flex-col justify-center transition-opacity duration-300', leaving ? 'opacity-0' : 'opacity-100')}
    >
      {children}
    </div>
  );
}

/**
 * One block of an auth view that comes in with the stagger (pass `index` 0, 1, 2… top to bottom).
 * Slides in from the side on desktop, from below on phones, just fades with reduced motion.
 */
export function AuthStagger({ index = 0, className, children }: { index?: number; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'animate-auth-in-up motion-reduce:animate-auth-fade',
        'md:group-data-[enter=right]/scene:animate-auth-in-right md:group-data-[enter=left]/scene:animate-auth-in-left',
        'motion-reduce:md:group-data-[enter=right]/scene:animate-auth-fade motion-reduce:md:group-data-[enter=left]/scene:animate-auth-fade',
        className,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {children}
    </div>
  );
}

/** Rentflow mark from the auth design (house + flow line) and the name. */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn('z-[2] flex items-center gap-2.5 text-xl font-semibold', className)}>
      <svg viewBox="0 0 40 40" fill="none" width={34} height={34} aria-hidden="true">
        <path d="M6 19 20 7l14 12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" className="stroke-auth-mint" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M11 27c4-4 7 2 11-2s5-1 7-2" className="stroke-white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      Rentflow
    </div>
  );
}

/** The blurred leaves behind the card; drifts a little when the panels swap sides. */
function AuthLeaves({ shifted }: { shifted: boolean }) {
  const leaf = 'M100 190C40 160 10 100 30 30c40 10 90 40 110 90 10 30 0 60-40 70z';
  const vein = 'M100 190C80 130 60 80 30 30';
  return (
    <div
      aria-hidden="true"
      className={cn(
        'fixed -inset-[60px] z-0 transition-transform duration-1000 ease-swap motion-reduce:transition-none',
        'bg-[radial-gradient(ellipse_at_20%_30%,theme(colors.auth.leaf.DEFAULT)_0%,transparent_55%),radial-gradient(ellipse_at_80%_70%,theme(colors.auth.leaf.dark)_0%,transparent_50%),radial-gradient(ellipse_at_50%_100%,theme(colors.auth.deep)_0%,theme(colors.auth.night)_70%)]',
        shifted && '-translate-x-[30px]',
      )}
    >
      <svg className="absolute -left-10 -top-[60px] w-[520px] opacity-75 blur-[1.5px]" viewBox="0 0 200 200">
        <path className="fill-auth-leaf" d={leaf} />
        <path className="stroke-auth-leaf-vein" strokeWidth="2" fill="none" d={`${vein}M60 95l40-20M75 130l45-15M50 65l35-25`} />
      </svg>
      <svg className="absolute -right-20 -top-10 w-[560px] rotate-[160deg] opacity-75 blur-[1.5px]" viewBox="0 0 200 200">
        <path className="fill-auth-leaf-dark" d={leaf} />
        <path className="stroke-auth-leaf-vein" strokeWidth="2" fill="none" d={`${vein}M60 95l40-20M75 130l45-15`} />
      </svg>
      <svg className="absolute -bottom-[140px] left-[20%] w-[600px] -rotate-[25deg] opacity-75 blur-[1.5px]" viewBox="0 0 200 200">
        <path className="fill-auth-leaf-dark" d={leaf} />
      </svg>
      <svg className="absolute -bottom-[120px] right-[5%] w-[460px] rotate-[70deg] opacity-75 blur-[1.5px]" viewBox="0 0 200 200">
        <path className="fill-auth-leaf-light" d={leaf} />
        <path className="stroke-auth-leaf-vein" strokeWidth="2" fill="none" d={vein} />
      </svg>
      <svg className="absolute -top-[180px] left-[40%] w-[420px] rotate-[200deg] opacity-75 blur-[1.5px]" viewBox="0 0 200 200">
        <path className="fill-auth-deep" d={leaf} />
      </svg>
    </div>
  );
}
