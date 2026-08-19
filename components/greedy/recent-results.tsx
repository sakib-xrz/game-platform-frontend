import { OptionArtwork } from "@/lib/option-art";
import type { RecentRound } from "@/types/greedy";

export function RecentResults({ history }: { history: RecentRound[] }) {
  const visible = history.filter((item) => item.result?.winning_option).slice(0, 9);

  return (
    <section className="dashboard-results" aria-label="Recent results">
      <strong className="dashboard-results__label">Result</strong>
      <div className="dashboard-results__list">
        {visible.length ? visible.map((item, index) => {
          const option = item.result!.winning_option;
          return (
            <div
              key={item.id}
              title={`Round ${item.round_number}: ${option.name}`}
              className="dashboard-result-icon"
            >
              {index === 0 && <span>New</span>}
              <OptionArtwork
                imageUrl={option.image_url}
                code={option.code}
                name={option.name}
                className="dashboard-result-icon__art"
              />
            </div>
          );
        }) : (
          <span className="dashboard-results__empty">Results will appear after the first draw</span>
        )}
      </div>
    </section>
  );
}
