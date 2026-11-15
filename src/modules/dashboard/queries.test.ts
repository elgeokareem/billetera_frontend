import { describe, expect, it } from "vitest";
import { dashboardQueries } from "./queries";

const now = new Date(2026, 10, 15, 12, 30);
const queries = dashboardQueries(now, "America/Santiago");

describe("dashboardQueries", () => {
  it("leaves the flagged categories out of the Spending card's totals", () => {
    expect(queries.spending.counted_only).toBe("true");
    expect(queries.unconfirmedSpending.counted_only).toBe("true");
  });

  it("asks for every category's amount for the Categories page", () => {
    expect(queries.spendingAllCategories).not.toHaveProperty("counted_only");
    expect(queries.spendingAllCategories.group_by).toBe("category");
  });

  it("doesn't change the label queue, which filters by category instead", () => {
    expect(queries.labelCards).not.toHaveProperty("counted_only");
    expect(queries.labelCount).not.toHaveProperty("counted_only");
  });

  it("keeps the spending filter and the month of the dashboard on all three totals", () => {
    for (const query of [queries.spending, queries.spendingAllCategories]) {
      expect(query.kind).toBe("withdrawal,p2p,pay,card_spend");
      expect(query.direction).toBe("out");
      expect(query.status).toBe("completed");
      expect(query.from).toBe(queries.month.from);
      expect(query.to).toBe(queries.month.to);
      expect(query.tz).toBe("America/Santiago");
    }
  });
});
