import { useState } from "react";
import { browserTimeZone } from "../shared/dateRange";
import { useLatestSnapshot } from "../snapshots/hooks";
import { BalanceCard } from "./BalanceCard";
import { BalanceHistoryCard } from "./BalanceHistoryCard";
import { HoldingsCard } from "./HoldingsCard";
import { LabelQueue } from "./LabelQueue";
import { RecentMovements } from "./RecentMovements";
import { SpendingCard } from "./SpendingCard";

/**
 * The dashboard, in direction C of the design. The left column is wider and holds the label queue, then spending and
 * holdings side by side. The right column holds the balance, its chart over time, and the recent movements. Below 768px the
 * sections form one column, in the order the design gives (see the .dash rules in app.css).
 */
export function DashboardPage() {
  // Taken once, so the query keys hold while the page is open. A sync refreshes the data, not the dates.
  const [now] = useState(() => new Date());
  const [timeZone] = useState(browserTimeZone);
  // With no snapshot yet, the Balance card asks for a sync, and there's no history to chart, so the chart isn't shown.
  const latest = useLatestSnapshot();

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
      </div>
      <div className="dash__side">
        <section className="dash__balance">
          <BalanceCard now={now} timeZone={timeZone} />
        </section>
        {latest.data !== null && (
          <section className="dash__history">
            <BalanceHistoryCard now={now} timeZone={timeZone} />
          </section>
        )}
        <section className="dash__recent">
          <RecentMovements now={now} timeZone={timeZone} />
        </section>
      </div>
    </div>
  );
}
