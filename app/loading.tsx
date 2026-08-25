export default function GameSelectionLoading() {
  return (
    <main
      className="mobile-canvas game-select-page safe-top safe-bottom"
      role="status"
      aria-live="polite"
      aria-label="Loading games"
    >
      <section className="game-select">
        <div className="game-select__cards" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="selection-skeleton game-select__card-skeleton"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>
      </section>

      <span className="sr-only">Loading available games.</span>
    </main>
  );
}
