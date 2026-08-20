import Image from "next/image";

type GameLoadingScreenProps = {
  game: "greedy" | "teen-patti";
};

const GREEDY_LOADER_ART = [
  { src: "/assets/greedy/falcon.png", name: "Falcon" },
  { src: "/assets/greedy/tiger.png", name: "Tiger" },
  { src: "/assets/greedy/crown.png", name: "Crown" },
  { src: "/assets/greedy/diamond.png", name: "Diamond" },
  { src: "/assets/greedy/panda.png", name: "Panda" },
  { src: "/assets/greedy/shark.png", name: "Shark" },
  { src: "/assets/greedy/dragon.png", name: "Dragon" },
  { src: "/assets/greedy/lion.png", name: "Lion" },
] as const;

export function GameLoadingScreen({ game }: GameLoadingScreenProps) {
  if (game === "teen-patti") {
    return (
      <main
        className="mobile-canvas greedy-shell tp-shell game-loader game-loader--teen-patti"
        role="status"
        aria-live="polite"
        aria-label="Loading Teen Patti"
      >
        <section className="tp-loader-table" aria-hidden="true">
          <header className="tp-loader-topbar">
            <span className="tp-loader-topbar__back">‹</span>
            <strong>TeenPatti</strong>
            <span className="tp-loader-topbar__badge" />
          </header>

          <div className="tp-loader-rail">
            <span className="tp-loader-player" />
            <div className="tp-loader-seats">
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="tp-loader-controls">
              {Array.from({ length: 3 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>

          <div className="game-loader__message">
            <span className="game-loader__spinner" />
            <div>
              <strong>Preparing the table</strong>
              <small>Syncing the live round…</small>
            </div>
          </div>

          <div className="tp-loader-decks">
            {["green", "blue", "pink"].map((tone) => (
              <div className={`tp-loader-deck tp-loader-deck--${tone}`} key={tone}>
                <span className="tp-loader-throne" />
                <span className="tp-loader-cabinet">
                  <i />
                  <b />
                  <em />
                </span>
              </div>
            ))}
          </div>

          <div className="tp-loader-console">
            <span />
            <div>
              {Array.from({ length: 4 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <b />
          </div>
        </section>
        <span className="sr-only">Loading Teen Patti and syncing the live round.</span>
      </main>
    );
  }

  return (
    <main
      className="mobile-canvas greedy-shell greedy-fullscreen game-dot-bg game-loader game-loader--greedy"
      role="status"
      aria-live="polite"
      aria-label="Loading Greedy"
    >
      <section className="greedy-loader-machine" aria-hidden="true">
        <span className="greedy-loader-machine__sun" />
        <header className="greedy-loader-toolbar">
          <div className="greedy-loader-toolbar__controls">
            {Array.from({ length: 3 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          <strong><i /> LIVE TABLE</strong>
        </header>

        <div className="greedy-loader-orbit">
          <span className="greedy-loader-orbit__track" />
          {GREEDY_LOADER_ART.map((option, index) => (
            <span className={`greedy-loader-option greedy-loader-option--${index + 1}`} key={option.src}>
              <i />
              <Image
                src={option.src}
                alt=""
                width={68}
                height={68}
                sizes="68px"
                draggable={false}
              />
            </span>
          ))}
          <span className="greedy-loader-hub">
            <Image
              src="/assets/greedy/center-platter.png"
              alt=""
              fill
              sizes="124px"
              priority
              draggable={false}
            />
            <b className="game-loader__spinner" />
          </span>
        </div>

        <div className="greedy-loader-message">
          <strong>Warming up the wheel</strong>
          <span><i /><i /><i /></span>
          <small>Syncing the live round</small>
        </div>

        <div className="greedy-loader-console">
          <span className="greedy-loader-console__label" />
          <div>
            {[10, 50, 100, 500, 1000].map((chip, index) => (
              <i key={chip} style={{ "--loader-delay": `${index * 90}ms` } as React.CSSProperties}>
                <b>{chip === 1000 ? "1K" : chip}</b>
              </i>
            ))}
          </div>
        </div>
      </section>
      <section className="greedy-loader-dashboard" aria-hidden="true">
        <div className="greedy-loader-dashboard__top">
          <i />
          <span><b /> <b /></span>
          <em />
        </div>
        <div className="greedy-loader-dashboard__history">
          <span />
          <div>
            {GREEDY_LOADER_ART.slice(0, 5).map((option, index) => (
              <i key={option.src} style={{ "--loader-delay": `${index * 80}ms` } as React.CSSProperties} />
            ))}
          </div>
        </div>
        <div className="greedy-loader-dashboard__footer">
          <i />
          <span><b /><b /></span>
          <em />
        </div>
      </section>
      <span className="sr-only">Loading Greedy and syncing the live round.</span>
    </main>
  );
}
