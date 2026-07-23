import * as React from "react";

export type RadarDimension = {
  key: string;
  label: string;
  score: number | null;
};

type NbgRadarChartProps = {
  dimensions: RadarDimension[];
  className?: string;
};

const GOLD = "#C9A24B";
const CENTER_X = 120;
const CENTER_Y = 112;
const MAX_RADIUS = 65;
const AXIS_COUNT = 5;
const AXIS_ANGLE = 360 / AXIS_COUNT;
const NBG_DIMENSIONS: RadarDimension[] = [
  { key: "market", label: "市场与机会", score: null },
  { key: "competition", label: "竞争格局", score: null },
  { key: "business_model", label: "商业模式", score: null },
  { key: "capability", label: "内部能力", score: null },
  { key: "finance", label: "财务健康", score: null },
];
const LABEL_POSITIONS = [
  { x: 120, y: 20, anchor: "middle" as const },
  { x: 196, y: 74, anchor: "middle" as const },
  { x: 173, y: 193, anchor: "middle" as const },
  { x: 67, y: 193, anchor: "middle" as const },
  { x: 43, y: 74, anchor: "middle" as const },
];

export function normalizeRadarScore(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(10, score));
}

export function orderNbgRadarDimensions(
  dimensions: RadarDimension[]
): RadarDimension[] {
  const dimensionsByKey = new Map(
    dimensions.map(dimension => [dimension.key, dimension])
  );

  return NBG_DIMENSIONS.map(fallback => {
    const dimension = dimensionsByKey.get(fallback.key);
    return dimension
      ? { ...dimension, label: dimension.label || fallback.label }
      : { ...fallback };
  });
}

function polarPoint(radius: number, angle: number) {
  const radians = (Math.PI / 180) * angle;
  return {
    x: Number((CENTER_X + radius * Math.cos(radians)).toFixed(2)),
    y: Number((CENTER_Y + radius * Math.sin(radians)).toFixed(2)),
  };
}

function polygonPoints(radius: number) {
  return Array.from({ length: AXIS_COUNT }, (_, index) => {
    const point = polarPoint(radius, -90 + index * AXIS_ANGLE);
    return `${point.x},${point.y}`;
  }).join(" ");
}

export function NbgRadarChart({
  dimensions,
  className = "mx-auto mt-1 h-[210px] w-full max-w-[270px]",
}: NbgRadarChartProps) {
  const normalizedDimensions = dimensions
    .slice(0, AXIS_COUNT)
    .map(dimension => ({
      ...dimension,
      score: normalizeRadarScore(dimension.score),
    }));
  const hasCompleteShape =
    normalizedDimensions.length === AXIS_COUNT &&
    normalizedDimensions.every(dimension => dimension.score !== null);
  const dataPoints = hasCompleteShape
    ? normalizedDimensions
        .map((dimension, index) =>
          polarPoint(
            MAX_RADIUS * ((dimension.score ?? 0) / 10),
            -90 + index * AXIS_ANGLE
          )
        )
        .map(point => `${point.x},${point.y}`)
        .join(" ")
    : null;
  const scoreDescription = normalizedDimensions
    .map(dimension =>
      dimension.score === null
        ? `${dimension.label}：暂无评分`
        : `${dimension.label}：${dimension.score.toFixed(1)} 分`
    )
    .join("；");

  return (
    <svg
      viewBox="0 0 240 210"
      className={className}
      role="img"
      aria-label={`NBG 五维雷达图。${scoreDescription}`}
    >
      <title>NBG 五维雷达图</title>
      <desc>{scoreDescription}</desc>
      {[65, 48, 31].map(radius => (
        <polygon
          key={radius}
          points={polygonPoints(radius)}
          fill="none"
          stroke="rgba(201,162,75,.17)"
        />
      ))}
      {Array.from({ length: AXIS_COUNT }, (_, index) => {
        const point = polarPoint(MAX_RADIUS, -90 + index * AXIS_ANGLE);
        return (
          <line
            key={index}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={point.x}
            y2={point.y}
            stroke="rgba(201,162,75,.13)"
          />
        );
      })}
      {dataPoints ? (
        <polygon
          className="nbg-radar-score-shape"
          points={dataPoints}
          fill="rgba(201,162,75,.24)"
          stroke={GOLD}
          strokeWidth="2.5"
        />
      ) : null}
      {normalizedDimensions.map((dimension, index) => {
        if (dimension.score === null) return null;
        const point = polarPoint(
          MAX_RADIUS * (dimension.score / 10),
          -90 + index * AXIS_ANGLE
        );
        return (
          <circle
            key={dimension.key}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={GOLD}
          />
        );
      })}
      <g
        fill="#D6DED8"
        fontSize="10.5"
        fontWeight="700"
        fontFamily="Noto Sans SC, Inter, sans-serif"
      >
        {normalizedDimensions.map((dimension, index) => {
          const position = LABEL_POSITIONS[index];
          return (
            <text
              key={dimension.key}
              x={position.x}
              y={position.y}
              textAnchor={position.anchor}
              fill={dimension.key === "finance" ? GOLD : undefined}
            >
              {dimension.label}
              {dimension.score === null ? (
                <tspan x={position.x} dy="12" fill="#8A8F9C">
                  —
                </tspan>
              ) : null}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
