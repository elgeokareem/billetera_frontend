---
title: Movements Pie Chart
spec_type: tech
type: feature
status: draft
domain: Portfolio
issue: none
created: 2026-11-25
updated: 2026-11-25
sdd_version: 7.3.0
---

# Movements Pie Chart

## Problem

The movements chart (see [Movements Chart](../2026-11-14-movements-chart/SPEC.md)) only draws bars, so the filtered range has no single view of how its money splits by category — the viewer must add the stacked periods by eye. Two smaller things come with it: inside the panel's 44px `SegmentedControl` the labels sit off-center (Mantine's label is a `display: block` with a fixed small padding, so when `mih={44}` stretches the box the text stays pinned near the top), and the new chart-type switch needs its own look so it doesn't read as a second copy of the mode control.

The approved design is [mockup.html](./mockup.html) / [proposal.png](./proposal.png) in this folder (approved 2026-11-25; the mockup shows the intended look, not a pixel spec).

## Behaviour

**B1. Full-height labels inside the selectors.** Both `SegmentedControl`s of the panel — the existing Total / By category control and the new chart-type control (B2) — render their selected segment filling the control's height: `styles={{ control: { display: "flex" }, label: { display: "flex", alignItems: "center", justifyContent: "center", flex: 1 } }}`, keeping `mih={44}`. The reason is Mantine's structure: the moving indicator (`FloatingIndicator`) copies the active **label's** box, and the label is content-sized inside the stretched `control` flex item — so with only `mih={44}` on the root, the pill measures ~28px, sits top-aligned and leaves a gap below (measured 2026-11-25: label 36px but indicator 27.7px). With the label stretched to the control (`flex: 1`) the pill fills the 44px control and the text centers in it. The mode control itself stays where it is today: at the card's left, `w="fit-content"`, inside the `Collapse` above the chart body. Nothing about the control's placement changes.

**B2. Chart type toggle in the header.** A second `SegmentedControl`, `mih={44}`, with two options Bars / Pie (`movements.chart.bars` / `movements.chart.pie`) and `aria-label={t("movements.chart.chartType")}`. It sits in the header row, right of the title block and before the far-right Hide/Show button: the header's `Group justify="space-between"` keeps the Hide button on the right, and its left side becomes a `Group` of [title block, chart-type control] with `gap="md"`, wrapping on narrow screens. The control's selected segment uses the app accent so the two controls don't look alike: `styles={{ root: { "--sc-color": "var(--mantine-color-accent-6)", "--sc-label-color": "#16270C" } }}` (`#16270C` is `INK_ON_ACCENT` from `src/modules/shared/theme.ts` — import it, don't inline the literal). The B1 label styles apply here too. State: `chartType: "bars" | "pie"` in component state, default `"bars"`, **not saved** (same policy as the mode in B7 of Movements Chart).

**B3. Pie data.** The pie shows the same filters, range and direction as the bars. While `chartType === "pie"`, the grouped query is enabled (`enabled: shown && (mode === "category" || chartType === "pie")` — today only `mode === "category"` enables it), and its asset rows go through `chartRows(grouped.assets, direction, "category")` unchanged. The pie draws `rows.series` — largest category first, then Other categories, then no category last — as one cell per series: `{ name: label, value: Number(series.total), color, amount: series.total }`. `label` and `color` come from the same `labelOf` / palette mapping the bars use (`SEGMENT_COLORS` by index, `OTHER_CATEGORY_COLOR`, `NO_CATEGORY_COLOR`). `amount` carries the exact decimal string for the tooltip. `Number()` is for the slice size and the percent only; every displayed amount comes from `amount`.

**B4. Pie rendering.** New default-export `MovementsPieChart.tsx`, loaded with `React.lazy` from `MovementsChart` like `MovementsBarChart`, importing `@mantine/charts/styles.css`. It renders Mantine's `PieChart` with: `data` = the cells of B3, `size={220}`, `withLabels`, `labelsType="percent"` (outside labels with connector lines are Mantine's defaults via `labelsPosition="outside"` + `withLabelsLine`), `withLegend={false}`, `tooltipDataSource="segment"`, `accessibilityLayer={false}`, `role="img"`, `aria-label` = the panel title (same string the bars use), and `mx="auto"` so the pie centers in the card. The legend sits **beside the pie on wide screens**: a `Group` (justify center, align center, gap xl, wrapping) holds the pie and the legend, so on narrow screens the same wrap drops the legend below the pie — one layout, no media-query fork. Each legend row is swatch, name, percent and the exact amount (`movements.chart` has no new keys: numbers need no words): percent = `Math.round(cell.value / sumOfAllCellValues * 100)`, dimmed; amount = `maskText(formatUsd(cell.amount), hidden)`, `fw={600}` — percents never mask, amounts do, same as the tooltip. Rows are `nowrap` and the legend wraps as a whole, so with many categories it takes space to the side instead of stretching the card vertically; the palette caps the series at six (four named + Other + no category), so on desktop the side legend always fits the pie's height. The legend extends the shared `ChartLegend` with an optional trailing node, so the bars' plain legend and the pie's numeric one can't drift.

**B5. Pie tooltip.** A custom `tooltipProps.content`, built like the bar chart's readout: a `Paper bg="dark.5" radius="md" p="xs" shadow="md"` with the hovered segment's name (`size="xs" c="dimmed"`), then one row — percent on the left (`c="dimmed"`), amount on the right (`fw={600}`, `whiteSpace: "nowrap"`). Percent = `Math.round(cell.value / sumOfAllCellValues * 100)` computed from the cells; amount = `maskText(formatUsd(cell.amount), hidden)`. With Hide Balances on (`useBalancesHidden`), the amount shows the mask and the percent, the slice and its label do not — percents reveal shares, not money, matching how the bars keep their heights while their axis and tooltip mask.

**B6. Title in pie mode.** While the pie is on, the header title uses `movements.chart.title.{out,in}.pie` ("Money out by category" / "Money in by category"), since the period part of the bars' title is not true of a pie. The `Last 12 months` caption and the not-counting caption stay (the range is unchanged). Bars brings the period title back.

**B7. Mode control visibility.** While the pie is on, the Total / By category control is not rendered — a pie is always by category, so the control has nothing to offer. It returns, with its previous mode intact, when Bars is selected. The grouped query stays enabled while the pie is on (B3), whatever the saved mode is.

**B8. Shared states.** Loading, error, skeleton, the summary line, the unpriced note and the empty message (`movements.chart.emptyDirection.*` when no priced row of the direction exists) behave exactly as today and are shared by both chart types; nothing in them is chart-type specific.

**B9. Slices are read-only.** No click, hover-action or keyboard action on a slice beyond the tooltip (decided 2026-11-25; a slice-to-category-filter can come later if wanted).

**B10. Chunks and hide behaviour unchanged.** Both charts are lazy chunks; the pie chunk loads on first Pie selection with the same `Suspense` fallback. Hide/Show keeps collapsing the whole body, and while hidden no totals request is made — exactly as in Movements Chart B12/B14.

## i18n

en + es, `movements.chart.*` only, same shape in both files:

- `bars`: "Bars" / "Barras"
- `pie`: "Pie" / "Pastel"
- `chartType` (the toggle's aria-label): "Chart type" / "Tipo de gráfico"
- `title.out.pie`: "Money out by category" / "Salidas por categoría"
- `title.in.pie`: "Money in by category" / "Entradas por categoría"

## Acceptance criteria

- **AC1.** Given the chart shown with no filters, the header reads "Money out by month" with "Last 12 months" under it, the accent-highlighted Bars / Pie toggle right of the title block, Hide chart far right; the mode control stays at the left with its labels vertically centered inside the 44px pill; the card looks otherwise as today.
- **AC2.** Given Pie selected: the mode control disappears, the title reads "Money out by category", and a pie draws the direction's categories largest first with outside percent labels and connector lines, Other categories and no category in their bar colors, centered in the card; on a wide viewport the legend sits beside the pie with each row showing swatch, name, percent and exact amount, and on a narrow one it wraps below the pie.
- **AC3.** Given a hover on a slice: the tooltip shows the category name, its whole-number percent and its exact amount (e.g. "Groceries · 36% · $6,102.00").
- **AC4.** Given Hide Balances on: the summary, the pie tooltip's amount and the legend's amounts show the mask; the percents, the slices and their labels stay.
- **AC5.** Given `direction=in`, the pie title is "Money in by category" and the slices are money in by category; the summary shows only In.
- **AC6.** Given a date filter ("This month"), the pie aggregates that same range — the summary, caption and pie agree.
- **AC7.** Given no priced row of the shown direction, the empty-direction message shows instead of either chart.
- **AC8.** Given Bars → Pie → Bars, the mode control returns with its previous mode and the bar chart is unchanged.
- **AC9.** Given a reload, Bars/Pie and Total/By category return to their defaults while the chart's shown/hidden choice is still remembered.
- **AC10.** Given a 375px viewport, the header wraps (title block, toggle, Hide chart) without horizontal overflow and the pie stays centered.
- **AC11.** Given six categories on a 1280px viewport, the legend wraps within the space beside the pie and the card's height doesn't grow past the pie's.

## Open questions

None. All decisions were made with the requester on 2026-11-25: read-only slices; toggle next to the title with the accent look; mode control hidden while the pie is on; labels vertically centered inside both selectors; the mode control keeps its place at the left.

## Unit tests (node, no DOM, TZ America/Santiago)

- No new pure helper is required: the pie consumes `chartRows(..., "category")`'s `series`, which is already tested, and the percent lives in the tooltip view.
- If the implementation extracts a pure helper anyway (e.g. building pie cells or the percent), it goes into `chart.ts` with tests in `chart.test.ts`: order preserved (largest first, Other, no category last), the exact decimal string travels in `amount`, and percent rounding on representative mixes.
- `pnpm verify` must stay green; existing chart tests are untouched.
