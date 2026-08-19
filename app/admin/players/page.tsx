"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowRight,
  CircleDollarSign,
  Coins,
  History,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserRoundSearch,
  WalletCards,
} from "lucide-react";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import {
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusPill,
} from "@/components/admin/admin-ui";
import { adminClient } from "@/lib/admin-client";
import { formatAdminAmount, formatUtc, humanizeAdminValue } from "@/lib/admin-display";
import type { AdminPlayerBet, AdminWalletLedger } from "@/types/admin";

function signedAmount(value: string) {
  try {
    const amount = BigInt(value);
    return `${amount > 0n ? "+" : ""}${formatAdminAmount(amount)}`;
  } catch {
    return value;
  }
}

function amountTone(value: string) {
  try {
    const amount = BigInt(value);
    return amount > 0n ? "is-credit" : amount < 0n ? "is-debit" : "";
  } catch {
    return "";
  }
}

function EmptySection({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="admin-player-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function LedgerTable({ rows }: { rows: AdminWalletLedger[] }) {
  if (!rows.length) {
    return <EmptySection icon={<History />} title="No ledger entries" description="No wallet movements exist in the returned history." />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Created (UTC)</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance movement</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>{formatUtc(entry.created_at)}<span className="admin-table-sub admin-mono-cell">{entry.id}</span></td>
              <td><StatusPill status={entry.type} /></td>
              <td><strong className={`admin-ledger-amount ${amountTone(entry.amount)}`}>{signedAmount(entry.amount)}</strong></td>
              <td>{formatAdminAmount(entry.balance_before)} <ArrowRight className="admin-inline-arrow" /> {formatAdminAmount(entry.balance_after)}</td>
              <td>
                <strong>{entry.reference_type ? humanizeAdminValue(entry.reference_type) : "—"}</strong>
                <span className="admin-table-sub admin-mono-cell">{entry.reference_id || "No reference ID"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BetTable({ rows, emptyTitle, emptyDescription }: { rows: AdminPlayerBet[]; emptyTitle: string; emptyDescription: string }) {
  if (!rows.length) {
    return <EmptySection icon={<ReceiptText />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Accepted (UTC)</th>
            <th>Round</th>
            <th>Option</th>
            <th>Stake</th>
            <th>Outcome</th>
            <th>Payout / refund</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((bet) => (
            <tr key={bet.id}>
              <td>{formatUtc(bet.accepted_at)}<span className="admin-table-sub admin-mono-cell">{bet.id}</span></td>
              <td><Link className="admin-table-link" href={`/admin/rounds/${bet.round_id}`}>Inspect round <ArrowRight /></Link></td>
              <td><strong>{bet.option.name}</strong><span className="admin-table-sub">{bet.option.code}</span></td>
              <td><strong>{formatAdminAmount(bet.amount)}</strong></td>
              <td>{bet.settlement ? <StatusPill status={bet.settlement.outcome} /> : <StatusPill status="pending" />}</td>
              <td>
                <strong>{bet.settlement ? formatAdminAmount(bet.settlement.payout_amount) : "—"}</strong>
                <span className="admin-table-sub">{bet.settlement ? formatUtc(bet.settlement.settled_at) : "Awaiting settlement"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUserId = searchParams.get("user_id")?.trim() || "";
  const [input, setInput] = useState(initialUserId);
  const [userId, setUserId] = useState(initialUserId);
  const query = useQuery({
    queryKey: ["admin", "player", userId],
    queryFn: () => adminClient.player(userId),
    enabled: Boolean(userId),
    retry: false,
  });

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exactId = input.trim();
    if (!exactId) return;
    router.replace(`/admin/players?user_id=${encodeURIComponent(exactId)}`);
    if (exactId === userId) void query.refetch();
    else setUserId(exactId);
  }

  const player = query.data;
  const payoutBets = player?.bets.filter((bet) => bet.settlement?.outcome === "win") ?? [];
  const refundBets = player?.bets.filter((bet) => bet.settlement?.outcome === "refunded") ?? [];
  const payoutLedger = player?.ledger.filter((entry) => entry.type === "win_credit") ?? [];
  const refundLedger = player?.ledger.filter((entry) => entry.type === "bet_refund") ?? [];
  const notFound = query.isError && /not found/i.test((query.error as Error).message);

  return (
    <>
      <PageHeader
        eyebrow="Platform / player investigation"
        title="Exact player workspace"
        description="Inspect one player ID at a time across wallet, ledger, accepted bets, settled payouts, and refunds. No fuzzy search or player directory is exposed."
      />

      <div className="admin-callout admin-player-lookup-note">
        <ShieldCheck />
        <div>
          <strong>Exact-ID access only</strong>
          <p>The operations API is called only after an operator submits a complete player ID. Searches are auditable and do not enumerate users.</p>
        </div>
      </div>

      <form className="admin-search-bar admin-player-search" onSubmit={submitLookup}>
        <Search />
        <input
          aria-label="Exact player ID"
          autoComplete="off"
          maxLength={128}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter exact player ID"
          required
        />
        <button className="admin-primary-button" type="submit" disabled={query.isFetching}>
          {query.isFetching ? <Loader2 className="admin-spin" /> : <UserRoundSearch />}
          Look up player
        </button>
      </form>

      {query.isLoading ? (
        <LoadingState label="Loading player wallet and activity…" />
      ) : notFound ? (
        <section className="admin-empty-page admin-empty-page--compact">
          <div className="admin-empty-page__icon"><UserRoundSearch /></div>
          <h2>No wallet found for this exact ID</h2>
          <p><span className="admin-mono-cell">{userId}</span> does not have a wallet record. Check the identifier and submit again.</p>
        </section>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : player ? (
        <>
          <section className="admin-player-wallet-card">
            <div className="admin-player-wallet-card__icon"><WalletCards /></div>
            <div className="admin-player-wallet-card__identity">
              <span className="admin-eyebrow">Player ID</span>
              <h2>{player.user_id}</h2>
              <small className="admin-mono-cell">Wallet {player.wallet.id}</small>
            </div>
            <div className="admin-player-wallet-card__balance">
              <span>Available balance</span>
              <strong>{player.wallet.currency.symbol ? `${player.wallet.currency.symbol} ` : ""}{formatAdminAmount(player.wallet.balance)}</strong>
              <small>{player.wallet.currency.name} · {player.wallet.currency.code} · Version {player.wallet.version}</small>
            </div>
            <div className="admin-player-wallet-card__updated">
              <span>Wallet updated</span>
              <strong>{formatUtc(player.wallet.updated_at)}</strong>
              <StatusPill status={player.wallet.currency.is_active ? "currency active" : "currency inactive"} />
            </div>
          </section>

          <div className="admin-metric-grid">
            <MetricCard label="Accepted bets" value={player.totals.bet_count.toLocaleString()} hint="All-time Greedy count" />
            <MetricCard label="Accepted stake" value={formatAdminAmount(player.totals.total_bet_amount)} hint="Before any refunds" />
            <MetricCard label="Payout total" value={formatAdminAmount(player.totals.total_payout)} hint="Authoritative user payout records" tone="is-green" />
            <MetricCard label="Refund total" value={formatAdminAmount(player.totals.total_refunded)} hint="Authoritative user refund records" tone="is-amber" />
          </div>

          <Tabs.Root className="admin-player-tabs" defaultValue="ledger">
            <Tabs.List className="admin-player-tabs__list" aria-label="Player investigation sections">
              <Tabs.Trigger value="ledger"><History /> Ledger <span>{player.ledger.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="bets"><ReceiptText /> Bets <span>{player.bets.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="payouts"><Trophy /> Payouts <span>{payoutLedger.length}</span></Tabs.Trigger>
              <Tabs.Trigger value="refunds"><RotateCcw /> Refunds <span>{refundLedger.length}</span></Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content className="admin-panel admin-player-tab-panel" value="ledger">
              <div className="admin-player-section-heading">
                <div><span className="admin-eyebrow">Wallet accounting</span><h2>Latest ledger entries</h2></div>
                <span>Up to 100 returned by the server</span>
              </div>
              <LedgerTable rows={player.ledger} />
            </Tabs.Content>

            <Tabs.Content className="admin-panel admin-player-tab-panel" value="bets">
              <div className="admin-player-section-heading">
                <div><span className="admin-eyebrow">Greedy activity</span><h2>Latest accepted bets</h2></div>
                <span>Up to 100 returned by the server</span>
              </div>
              <BetTable rows={player.bets} emptyTitle="No accepted bets" emptyDescription="This player has no Greedy bet activity in the returned history." />
            </Tabs.Content>

            <Tabs.Content className="admin-panel admin-player-tab-panel" value="payouts">
              <div className="admin-player-section-heading">
                <div><span className="admin-eyebrow">Winning settlements</span><h2>Payout visibility</h2></div>
                <strong className="admin-player-section-total"><Coins /> {formatAdminAmount(player.totals.total_payout)} total</strong>
              </div>
              <div className="admin-callout">
                <CircleDollarSign />
                <div><strong>Authoritative total, itemized accounting view</strong><p>The total comes from user payout records. Ledger credits and winning bets below are limited to the latest 100 records returned in each activity feed.</p></div>
              </div>
              <div className="admin-player-refund-summary">
                <div><span>Winning ledger credits</span><strong>{payoutLedger.length.toLocaleString()}</strong></div>
                <div><span>Winning bets in latest activity</span><strong>{payoutBets.length.toLocaleString()}</strong></div>
              </div>
              {payoutLedger.length > 0 && (
                <>
                  <h3 className="admin-player-subheading">Wallet payout credits</h3>
                  <LedgerTable rows={payoutLedger} />
                </>
              )}
              <h3 className="admin-player-subheading">Winning bet settlements</h3>
              <BetTable rows={payoutBets} emptyTitle="No winning settlements" emptyDescription="No winning bet is present in the latest activity returned for this player." />
            </Tabs.Content>

            <Tabs.Content className="admin-panel admin-player-tab-panel" value="refunds">
              <div className="admin-player-section-heading">
                <div><span className="admin-eyebrow">Cancelled-round recovery</span><h2>Refund visibility</h2></div>
                <strong className="admin-player-section-total"><RotateCcw /> {formatAdminAmount(player.totals.total_refunded)} total</strong>
              </div>
              <div className="admin-player-refund-summary">
                <div><span>Refund ledger credits</span><strong>{refundLedger.length.toLocaleString()}</strong></div>
                <div><span>Refunded bets in latest activity</span><strong>{refundBets.length.toLocaleString()}</strong></div>
              </div>
              {refundLedger.length > 0 && (
                <>
                  <h3 className="admin-player-subheading">Wallet refund credits</h3>
                  <LedgerTable rows={refundLedger} />
                </>
              )}
              <h3 className="admin-player-subheading">Refunded bet settlements</h3>
              <BetTable rows={refundBets} emptyTitle="No refunded bets" emptyDescription="No refunded bet is present in the latest activity returned for this player." />
            </Tabs.Content>
          </Tabs.Root>
        </>
      ) : (
        <section className="admin-empty-page admin-empty-page--compact">
          <div className="admin-empty-page__icon"><ShieldCheck /></div>
          <h2>Enter an exact player ID</h2>
          <p>The wallet and activity workspace remains empty until an operator performs an explicit lookup.</p>
        </section>
      )}
    </>
  );
}

export default function AdminPlayersPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening player workspace…" />}>
      <PlayerWorkspace />
    </Suspense>
  );
}
