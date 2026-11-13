import { useState } from "react";
import { useMovementTotals } from "../movements/hooks";
import { browserTimeZone } from "../shared/dateRange";
import { useLatestSnapshot } from "../snapshots/hooks";
import { BalanceCard } from "./BalanceCard";
import { BalanceHistoryCard } from "./BalanceHistoryCard";
import { chartPlacement, type ChartPlacement } from "./chartPlacement";
import { HoldingsCard } from "./HoldingsCard";
import { LabelQueue } from "./LabelQueue";
import { dashboardQueries } from "./queries";
import { RecentMovements } from "./RecentMovements";
import { SpendingCard } from "./SpendingCard";

/**
 * The dashboard, in direction C of the design. The left column is wider and holds the label queue, then spending and
 * holdings. The right column holds the balance, its chart over time, and the recent movements. Once the label count says
 * there's nothing left to label, the chart moves to the left column, below the pair, at the column's full width; it stays
 * under Balance while the count loads or while movements are still to label. A move after the count's first load fades
 * the chart in at its new spot. Below 768px the sections form one column, in the order the design gives (see the .dash
 * rules in app.css).
 */
export function DashboardPage() {
  // Taken once, so the query keys hold while the page is open. A sync refreshes the data, not the dates.
  const [now] = useState(() => new Date());
  const [timeZone] = useState(browserTimeZone);
  // With no snapshot yet, the Balance card asks for a sync, and there's no history to chart, so the chart isn't shown.
  const latest = useLatestSnapshot();
  // The label queue's count, from the same query it reads, so the cache is shared and nothing extra is requested.
  const count = useMovementTotals(dashboardQueries(now, timeZone).labelCount);
  const placement = chartPlacement(count);

  // The first placement the count settles on appears as it is; only a later move, after a save refetches the count, fades
  // the chart in at its new spot. An unloaded count leaves the chart on the right without animating.
  const [settled, setSettled] = useState<ChartPlacement | null>(null);
  const [animate, setAnimate] = useState(false);
  if (count.data !== undefined && settled !== placement) {
    setSettled(placement);
    setAnimate(settled !== null);
  }

  const history = latest.data !== null && (
    <section
      key={placement}
      className={animate ? "dash__history dash__history--enter" : "dash__history"}
    >
      <BalanceHistoryCard now={now} timeZone={timeZone} />
    </section>
  );

  return (
    <div className="dash">
      <div className="dash__main">
        <section className="dash__queue">
          <LabelQueue now={now} timeZone={timeZone} />
        </section>
        <div className="dash__pair">
          <section className="dash__card dash__spending">
            <SpendingCard now={now} timeZone={timeZone} />
          </section>
          <section className="dash__card dash__holdings">
            <HoldingsCard />
          </section>
        </div>
        {placement === "main" && history}
      </div>
      <div className="dash__side">
        <section className="dash__balance">
          <BalanceCard now={now} timeZone={timeZone} />
        </section>
        {placement === "side" && history}
        <section className="dash__recent">
          <RecentMovements now={now} timeZone={timeZone} />
        </section>
      </div>
    </div>
  );
}
