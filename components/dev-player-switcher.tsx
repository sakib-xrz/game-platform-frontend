"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DEV_PLAYER_PRESETS,
  getPlayerUserId,
  isDevPlayerIdentityEnabled,
  setPlayerUserId,
} from "@/lib/player-identity";
import { resetGameSocket } from "@/lib/socket";

type DevPlayerSwitcherProps = {
  /** `panel` on the selection screen; `compact` on live game screens. */
  variant?: "panel" | "compact";
};

export function DevPlayerSwitcher({ variant = "panel" }: DevPlayerSwitcherProps) {
  const enabled = isDevPlayerIdentityEnabled();
  const [currentId, setCurrentId] = useState("");
  const [customId, setCustomId] = useState("");
  const [open, setOpen] = useState(variant === "panel");

  useEffect(() => {
    if (!enabled) return;
    const id = getPlayerUserId();
    setCurrentId(id);
    setCustomId(id);
    if (id) {
      // Keep `?user=` visible so multi-tab testing is shareable by URL.
      setPlayerUserId(id);
    }
  }, [enabled]);

  if (!enabled) return null;

  function applyUser(nextRaw: string) {
    const next = setPlayerUserId(nextRaw);
    if (!next) return;
    resetGameSocket();
    setCurrentId(next);
    setCustomId(next);
    // Soft reload so game hooks remount against the new wallet/identity.
    window.location.reload();
  }

  function onCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyUser(customId);
  }

  if (variant === "compact") {
    return (
      <div className={`dev-player-switcher dev-player-switcher--compact ${open ? "is-open" : ""}`}>
        <button
          type="button"
          className="dev-player-switcher__badge"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`Dev player ${currentId || "unset"}. Toggle player picker.`}
        >
          <span>DEV</span>
          <strong>{currentId || "no user"}</strong>
        </button>

        {open ? (
          <div className="dev-player-switcher__flyout" role="dialog" aria-label="Switch test player">
            <p className="dev-player-switcher__hint">Multi-player test identity</p>
            <div className="dev-player-switcher__presets">
              {DEV_PLAYER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`dev-player-switcher__preset ${preset === currentId ? "is-active" : ""}`}
                  onClick={() => applyUser(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <form className="dev-player-switcher__custom" onSubmit={onCustomSubmit}>
              <input
                value={customId}
                onChange={(event) => setCustomId(event.target.value)}
                placeholder="custom user id"
                aria-label="Custom player user id"
                maxLength={128}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit">Apply</button>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="dev-player-switcher dev-player-switcher--panel" aria-label="Dev multi-player test">
      <header className="dev-player-switcher__head">
        <span className="dev-player-switcher__tag">DEV ONLY</span>
        <div>
          <strong>Test player</strong>
          <small>Open other tabs with a different id to simulate the mobile app.</small>
        </div>
      </header>

      <p className="dev-player-switcher__current">
        Active <code>{currentId || "unset"}</code>
      </p>

      <div className="dev-player-switcher__presets">
        {DEV_PLAYER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`dev-player-switcher__preset ${preset === currentId ? "is-active" : ""}`}
            onClick={() => applyUser(preset)}
          >
            {preset}
          </button>
        ))}
      </div>

      <form className="dev-player-switcher__custom" onSubmit={onCustomSubmit}>
        <input
          value={customId}
          onChange={(event) => setCustomId(event.target.value)}
          placeholder="custom user id (e.g. player-1)"
          aria-label="Custom player user id"
          maxLength={128}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit">Apply</button>
      </form>
    </section>
  );
}
