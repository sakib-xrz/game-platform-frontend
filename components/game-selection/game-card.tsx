import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

export type GameCardProps = {
  title: string;
  subtitle: string;
  href?: string;
  active?: boolean;
  accent: string;
  art: string[];
};

export function GameCard({ title, subtitle, href, active = false, accent, art }: GameCardProps) {
  const content = (
    <div
      className="arcade-card-glow relative min-h-[176px] overflow-hidden rounded-[30px] border border-white/45 p-5"
      style={{ background: accent }}
    >
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

      <div className="relative z-10 flex h-full items-stretch justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-white/80">
              {active ? <Sparkles size={14} /> : <LockKeyhole size={13} />}
              {active ? "Live now" : "Coming soon"}
            </div>
            <h2 className="text-[28px] font-black leading-none tracking-[-.04em] text-white">{title}</h2>
            <p className="mt-2 max-w-[190px] text-sm font-semibold leading-5 text-white/80">{subtitle}</p>
          </div>

          <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg shadow-black/10">
            {active ? "Play now" : "Locked"}
            {active && <ArrowRight size={16} strokeWidth={3} />}
          </div>
        </div>

        <div className="relative grid w-[116px] shrink-0 place-items-center">
          <div className="absolute h-[104px] w-[104px] rounded-full border-[8px] border-white/25 bg-white/15" />
          <div className="absolute h-[70px] w-[70px] rounded-full border border-white/40 bg-white/15 backdrop-blur-sm" />
          {art.slice(0, 4).map((icon, index) => {
            const positions = ["top-0 left-[43px]", "right-0 top-[44px]", "bottom-0 left-[43px]", "left-0 top-[44px]"];
            return (
              <span
                key={`${icon}-${index}`}
                className={`absolute ${positions[index]} grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white text-lg shadow-md`}
              >
                {icon}
              </span>
            );
          })}
          <span className="relative z-10 text-4xl">🎯</span>
        </div>
      </div>
    </div>
  );

  return active && href ? (
    <Link href={href} aria-label={`Open ${title}`} className="block active:scale-[.99] transition-transform">
      {content}
    </Link>
  ) : (
    <div aria-disabled="true" className="opacity-70 grayscale-[.12]">{content}</div>
  );
}
