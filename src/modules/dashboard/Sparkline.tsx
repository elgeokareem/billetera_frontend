import { Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatShortDate } from "../shared/format";
import { INK_ON_ACCENT } from "../shared/theme";
import type { SnapshotPoint } from "../snapshots/types";
import {
  AXIS_LINE,
  DATE_LABELS,
  formatScaleUsd,
  LABEL_GAP,
  MAX_SCALE_STEPS,
  PLOT_HEIGHT,
  SPARK_WIDTH,
  sparklineGeometry,
} from "./sparkline";

/**
 * The balance over time as a line, with a USD scale that starts at zero and three date labels. The line and its gridlines are an
 * SVG that stretches to the card. The labels are HTML, so their text is never stretched, and they stay in their own lines.
 */
export function Sparkline({ points }: { points: readonly SnapshotPoint[] }) {
  const { t, i18n } = useTranslation();
  const geometry = useMemo(
    () =>
      sparklineGeometry(
        points.map((point) => ({ time: Date.parse(point.captured_at), value: Number(point.total_usd) })),
        { width: SPARK_WIDTH, height: PLOT_HEIGHT, labelCount: DATE_LABELS, maxSteps: MAX_SCALE_STEPS },
      ),
    [points],
  );
  const line = geometry.vertices.map((vertex) => `${vertex.x.toFixed(1)},${vertex.y.toFixed(1)}`).join(" ");
  // The scale reads from the top down, so its highest tick comes first.
  const scale = [...geometry.ticks].reverse();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", columnGap: 8, marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: PLOT_HEIGHT + AXIS_LINE,
          textAlign: "right",
        }}
      >
        {scale.map((tick) => (
          <Text key={tick.value} component="span" size="xs" style={{ lineHeight: `${AXIS_LINE}px`, whiteSpace: "nowrap" }}>
            {formatScaleUsd(tick.value, i18n.language)}
          </Text>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${SPARK_WIDTH} ${PLOT_HEIGHT}`}
        width="100%"
        height={PLOT_HEIGHT}
        preserveAspectRatio="none"
        role="img"
        aria-label={t("dashboard.balance.sparkline")}
        style={{ display: "block", overflow: "visible", margin: `${AXIS_LINE / 2}px 0` }}
      >
        {geometry.ticks.map((tick) => (
          <line
            key={tick.value}
            x1={0}
            x2={SPARK_WIDTH}
            y1={tick.y}
            y2={tick.y}
            stroke={INK_ON_ACCENT}
            strokeOpacity={tick.value === 0 ? 0.5 : 0.15}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polyline
          fill="none"
          stroke={INK_ON_ACCENT}
          strokeWidth={2.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          points={line}
        />
      </svg>
      <div style={{ gridColumn: 2, position: "relative", height: AXIS_LINE, marginTop: LABEL_GAP }}>
        {geometry.labels.map((label) => (
          <Text
            key={label.time}
            component="span"
            size="xs"
            style={{
              position: "absolute",
              top: 0,
              left: `${label.across * 100}%`,
              // Each label is anchored by its own width: its start at the left edge, its end at the right, and its middle
              // in between. So a label at the far left or right never runs past the plot.
              transform: `translateX(-${label.across * 100}%)`,
              lineHeight: `${AXIS_LINE}px`,
              whiteSpace: "nowrap",
            }}
          >
            {formatShortDate(new Date(label.time).toISOString())}
          </Text>
        ))}
      </div>
    </div>
  );
}
