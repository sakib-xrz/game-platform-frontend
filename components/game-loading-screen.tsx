type GameLoadingScreenProps = {
  game: "greedy" | "teen-patti";
};

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
        <header className="greedy-loader-toolbar">
          {Array.from({ length: 4 }, (_, index) => (
            <i key={index} />
          ))}
          <strong>GREEDY</strong>
        </header>

        <div className="greedy-loader-orbit">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} />
          ))}
          <span>
            <b className="game-loader__spinner" />
            <small>Joining round</small>
          </span>
        </div>

        <div className="greedy-loader-console">
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </section>
      <section className="greedy-loader-dashboard" aria-hidden="true">
        <i />
        <span />
        <span />
      </section>
      <span className="sr-only">Loading Greedy and syncing the live round.</span>
    </main>
  );
}
