import { useEffect, useRef, useState } from 'react';

type GoogleIdentity = {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number; text: string; locale: string }) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let credentialHandler: ((credential: string) => void) | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Sign-In gagal dimuat. Periksa koneksi internet.'));
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      throw error;
    });
  }
  return scriptPromise;
}

interface Props {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  showDivider?: boolean;
}

export function GoogleSignInButton({ onCredential, text = 'continue_with', showDivider = true }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const [error, setError] = useState('');
  handler.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const currentHandler = (credential: string) => handler.current(credential);
    loadGoogleScript().then(() => {
      if (cancelled || !container.current || !window.google) return;
      credentialHandler = currentHandler;
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => credentialHandler?.(response.credential),
        });
        initializedClientId = clientId;
      }
      const width = Math.max(200, Math.min(400, container.current.clientWidth - 12));
      window.google.accounts.id.renderButton(container.current, {
        theme: 'outline', size: 'large', width, text, locale: 'id',
      });
    }).catch((err: Error) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
      if (credentialHandler === currentHandler) credentialHandler = null;
    };
  }, [text]);

  const action = text === 'signin_with' ? 'Masuk' : text === 'signup_with' ? 'Daftar' : 'Lanjutkan';
  return (
    <div className="mt-5">
      {showDivider && <div className="flex items-center gap-3 mb-4 text-xs font-bold text-gray-700">
        <span className="h-[2px] bg-gray-900 flex-1" /> ATAU <span className="h-[2px] bg-gray-900 flex-1" />
      </div>}
      <div className="rounded-neo border-3 border-gray-900 bg-neo-yellow p-1 shadow-neo-md transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover focus-within:ring-2 focus-within:ring-gray-900 focus-within:ring-offset-2">
        {clientId ? <div ref={container} className="flex justify-center min-h-[44px] w-full bg-white rounded-[4px]" /> : (
          <button type="button" disabled className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-[4px] bg-white px-4 text-sm font-bold text-gray-900 cursor-not-allowed">
            <img src="/google-g.png" alt="" className="h-5 w-5 shrink-0" />
            {action} dengan Google
          </button>
        )}
      </div>
      {!clientId && <p className="mt-2 text-center text-xs font-medium text-gray-500">Opsi Google belum tersedia saat ini.</p>}
      {error && <p className="text-xs text-neo-red font-bold mt-2" role="alert">{error}</p>}
    </div>
  );
}
