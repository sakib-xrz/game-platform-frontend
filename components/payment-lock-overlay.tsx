export function PaymentLockOverlay() {
  return (
    <div
      className="payment-lock"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-lock-title"
      aria-describedby="payment-lock-copy"
    >
      <div className="payment-lock__ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="payment-lock__sparkles" aria-hidden="true">
        <i className="payment-lock__sparkle" />
        <i className="payment-lock__sparkle" />
        <i className="payment-lock__sparkle" />
        <i className="payment-lock__sparkle" />
        <i className="payment-lock__sparkle" />
      </div>

      <div className="payment-lock__panel">
        <p className="payment-lock__brand">Game Arcade</p>

        <div className="payment-lock__icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect
              x="14"
              y="28"
              width="36"
              height="28"
              rx="6"
              fill="url(#payment-lock-body)"
              stroke="#9a4f08"
              strokeWidth="2"
            />
            <path
              d="M22 28V20a10 10 0 0 1 20 0v8"
              stroke="#ffc83d"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="40" r="4" fill="#9a4f08" />
            <path d="M32 44v6" stroke="#9a4f08" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="payment-lock-body" x1="14" y1="28" x2="50" y2="56">
                <stop stopColor="#fff3a6" />
                <stop offset="0.45" stopColor="#ffc83d" />
                <stop offset="1" stopColor="#f3ae21" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 id="payment-lock-title" className="payment-lock__title">
          Payment required
        </h1>
        <p id="payment-lock-copy" className="payment-lock__copy">
          Complete the payment for unlock the game
        </p>
      </div>
    </div>
  );
}
