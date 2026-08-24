export default function GameSelectionLoading() {
  return (
    <main
      className="mobile-canvas game-select-page safe-top safe-bottom"
      role="status"
      aria-live="polite"
      aria-label="Loading games"
    >
      <section className="game-select">
        <header className="game-select__topbar" aria-hidden="true">
          <div className="game-select__identity">
            <div className="selection-skeleton game-select__brand-skeleton" />
            <div className="game-select__identity-skeleton">
              <div className="selection-skeleton" />
              <div className="selection-skeleton" />
            </div>
          </div>
          <div className="selection-skeleton game-select__live-skeleton" />
        </header>

        <div className="game-select__hero-skeleton" aria-hidden="true">
          <div className="selection-skeleton" />
          <div className="selection-skeleton" />
          <div className="selection-skeleton" />
        </div>

        <div className="selection-skeleton game-select__intro-skeleton" aria-hidden="true" />

        <div className="game-select__section-heading" aria-hidden="true">
          <div className="selection-skeleton game-select__section-title-skeleton" />
          <div className="selection-skeleton game-select__section-meta-skeleton" />
        </div>

        <div className="game-select__cards" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="selection-skeleton game-select__card-skeleton"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>

        <div className="selection-skeleton game-select__footnote-skeleton" aria-hidden="true" />
      </section>

      <span className="sr-only">Loading available games.</span>
    </main>
  );
}
