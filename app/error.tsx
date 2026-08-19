"use client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mobile-canvas flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 text-white">
      <div className="w-full rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-3 text-2xl font-black">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/55">The game UI hit an unexpected error. Your backend wallet and bets remain authoritative.</p>
        {error.digest && <p className="mt-3 text-[10px] font-semibold text-white/35">Reference: {error.digest}</p>}
        <button type="button" onClick={reset} className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-900">Reload game</button>
      </div>
    </main>
  );
}
