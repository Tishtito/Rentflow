import { useEffect, useRef, useState } from 'react';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { isNative, platform } from './platform';

/** Minimal typing for Google Identity Services (https://accounts.google.com/gsi/client). */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; use_fedcm_for_prompt?: boolean }): void;
      renderButton(el: HTMLElement, options: Record<string, string | number>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let gisLoading: Promise<GoogleIdentity> | null = null;

/** Loads Google Identity Services once, on demand (only pages with the button pay for it). */
function loadGis(): Promise<GoogleIdentity> {
  gisLoading ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in failed to load.')));
    script.onerror = () => {
      gisLoading = null;
      reject(new Error("Couldn't reach Google. Check your connection."));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

let nativeReady: Promise<void> | null = null;

export interface GoogleClientIds {
  /** OAuth "Web application" client ID; also what the Android app asks for. */
  web: string;
  /** OAuth iOS client ID (iOS app only). */
  ios?: string;
}

/**
 * "Continue with Google" as the design's round button. Gives `onCredential` a Google **ID token**
 * (JWT) for POST /api/{admin,portal}/auth/google[/token]; the backend verifies it.
 *  - Browser / PWA: Google Identity Services' own round icon button (Google's branding rules).
 *  - Android / iOS app: native Google sign-in (@capgo/capacitor-social-login); a web view popup is
 *    blocked by Google.
 * Renders nothing when no client ID is configured.
 */
export function GoogleSignInButton({
  clientIds,
  onCredential,
  onError,
  disabled,
}: {
  clientIds: GoogleClientIds | null;
  onCredential: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const webRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  // Latest callbacks without re-initialising Google on every render.
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  const native = isNative();
  const webClientId = clientIds?.web;

  useEffect(() => {
    if (!webClientId || native || !webRef.current) return;
    let cancelled = false;
    loadGis()
      .then((google) => {
        if (cancelled || !webRef.current) return;
        google.accounts.id.initialize({
          client_id: webClientId,
          ux_mode: 'popup',
          callback: (r) => handlers.current.onCredential(r.credential),
        });
        google.accounts.id.renderButton(webRef.current, { type: 'icon', shape: 'circle', theme: 'outline', size: 'large' });
      })
      .catch((e: Error) => handlers.current.onError?.(e.message));
    return () => {
      cancelled = true;
    };
  }, [webClientId, native]);

  if (!clientIds?.web) return null;

  if (!native) {
    return <div ref={webRef} className={disabled ? 'pointer-events-none opacity-60' : undefined} />;
  }

  const signIn = async () => {
    setBusy(true);
    try {
      nativeReady ??= SocialLogin.initialize({
        google: { webClientId: clientIds.web, iOSClientId: clientIds.ios, iOSServerClientId: clientIds.web, mode: 'online' },
      });
      await nativeReady;
      const { result } = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
      const idToken = 'idToken' in result ? result.idToken : null;
      if (idToken) handlers.current.onCredential(idToken);
      else handlers.current.onError?.('Google sign-in did not return an account. Please try again.');
    } catch (e) {
      // Closing the Google sheet is not an error worth showing.
      const message = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(message)) handlers.current.onError?.(platform() === 'ios' && !clientIds.ios ? 'Google sign-in is not set up for iOS yet.' : 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void signIn()}
      disabled={disabled || busy}
      aria-label="Continue with Google"
      className="grid h-[44px] w-[44px] place-items-center rounded-full border-0 bg-white transition hover:scale-110 disabled:opacity-60 motion-reduce:hover:scale-100"
    >
      <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
        {/* Google "G" in Google's brand colours (required by their branding guidelines). */}
        <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
      </svg>
    </button>
  );
}
