export default function GameSelectionLoading() {
  return (
    <main
      className="mobile-canvas game-select-page safe-top safe-bottom text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading games"
    >
      <span className="game-select-page__glow game-select-page__glow--one" aria-hidden="true" />
      <span className="game-select-page__glow game-select-page__glow--two" aria-hidden="true" />

      <section className="game-select">
        <div className="game-select__header">
          <div className="selection-skeleton game-select__brand-skeleton" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="selection-skeleton h-3 w-32 rounded-full" />
            <div className="selection-skeleton mt-4 h-10 w-56 max-w-full rounded-2xl" />
          </div>
        </div>

        <div className="selection-skeleton game-select__intro-skeleton" aria-hidden="true" />

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
