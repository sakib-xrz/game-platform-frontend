import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mobile-canvas flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 text-white">
      <div className="text-center">
        <div className="text-5xl">🎮</div>
        <h1 className="mt-3 text-2xl font-black">Game not found</h1>
        <Link href="/" className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900">Choose a game</Link>
      </div>
    </main>
  );
}
