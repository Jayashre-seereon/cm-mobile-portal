import React from 'react';
import Svg, { Circle, Rect, Line, Polyline, Polygon, G, Text as SvgText } from 'react-native-svg';
import { CHART_COLOR } from '../data/careerCompassData';

export function DonutChart({ items = [], size = 176, thickness = 28 }) {
  const total = items.reduce((a, b) => a + (b.value || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {items.length === 0 ? (
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      ) : (
        items.map((it, idx) => {
          const frac = (it.value || 0) / total;
          const len = frac * C;
          const rotate = -90 + (acc / total) * 360;
          acc += it.value || 0;
          return (
            <Circle
              key={it.label || idx}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`}
              origin={`${cx}, ${cy}`}
              rotation={rotate}
            />
          );
        })
      )}
    </Svg>
  );
}

export function ColumnChart({ items = [], width = 340, height = 200 }) {
  const padT = 26, padB = 34, padX = 14;
  const innerW = width - padX * 2, innerH = height - padT - padB;
  const n = items.length || 1;
  const gap = 10;
  const barW = (innerW - gap * (n - 1)) / n;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={padX} y1={padT + innerH} x2={width - padX} y2={padT + innerH} stroke="#cbd5e1" strokeWidth="1" />
      {items.map((it, i) => {
        const h = Math.max(2, ((it.pct || 0) / 100) * innerH);
        const x = padX + i * (barW + gap);
        const y = padT + innerH - h;
        return (
          <G key={it.label || i}>
            <Rect x={x} y={y} width={barW} height={h} rx={6} ry={6} fill={it.color} />
            <SvgText
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fill="#211B19"
              fontSize="11"
              fontWeight="bold"
            >
              {it.pct}%
            </SvgText>
            <SvgText
              x={x + barW / 2}
              y={height - 10}
              textAnchor="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="600"
            >
              {it.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function LineChart({ items = [], width = 340, height = 190, color = CHART_COLOR.slate }) {
  const padT = 26, padB = 30, padX = 28;
  const innerW = width - padX * 2, innerH = height - padT - padB;
  const n = items.length || 1;
  const pts = items.map((it, i) => {
    const x = padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = padT + innerH - ((it.pct || 0) / 100) * innerH;
    return { x, y, it };
  });

  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaStr = `${padX},${padT + innerH} ${lineStr} ${padX + innerW},${padT + innerH}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={padX} y1={padT + innerH} x2={width - padX} y2={padT + innerH} stroke="#cbd5e1" strokeWidth="1" />
      <Polygon points={areaStr} fill={color} opacity={0.12} />
      <Polyline points={lineStr} fill="none" stroke={color} strokeWidth="2.5" />
      {pts.map((p, idx) => (
        <G key={p.it.label || idx}>
          <Circle cx={p.x} cy={p.y} r="5.5" fill={color} stroke="#ffffff" strokeWidth="2" />
          <SvgText
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            fill="#211B19"
            fontSize="11"
            fontWeight="bold"
          >
            {p.it.pct}%
          </SvgText>
          <SvgText
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
          >
            {p.it.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

export function TwinBars({ longPct = 0, shortPct = 0, width = 340, height = 110 }) {
  const padX = 90, barH = 24, gapY = 18, top = 16;
  const innerW = width - padX - 50;
  const rows = [
    { label: 'Long-term', pct: longPct, color: CHART_COLOR.red },
    { label: 'Short-term', pct: shortPct, color: CHART_COLOR.slate },
  ];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {rows.map((r, i) => {
        const y = top + i * (barH + gapY);
        const w = Math.max(3, ((r.pct || 0) / 100) * innerW);
        return (
          <G key={r.label}>
            <SvgText
              x="0"
              y={y + barH / 2 + 4}
              fill="#211B19"
              fontSize="12"
              fontWeight="bold"
            >
              {r.label}
            </SvgText>
            <Rect x={padX} y={y} width={innerW} height={barH} rx={12} ry={12} fill="#F2F4F6" />
            <Rect x={padX} y={y} width={w} height={barH} rx={12} ry={12} fill={r.color} />
            <SvgText
              x={padX + innerW + 10}
              y={y + barH / 2 + 4}
              fill="#211B19"
              fontSize="12"
              fontWeight="bold"
            >
              {r.pct}%
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function HBarChart({ items = [], width = 340 }) {
  const padX = 135, barH = 20, gapY = 14, top = 6;
  const innerW = width - padX - 45;
  const height = top * 2 + items.length * (barH + gapY) - gapY;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {items.map((r, i) => {
        const y = top + i * (barH + gapY);
        const w = Math.max(3, ((r.pct || 0) / 100) * innerW);
        return (
          <G key={r.label || i}>
            <SvgText
              x="0"
              y={y + barH / 2 + 4}
              fill="#211B19"
              fontSize="11"
              fontWeight="600"
            >
              {r.label}
            </SvgText>
            <Rect x={padX} y={y} width={innerW} height={barH} rx={6} ry={6} fill="#F2F4F6" />
            <Rect x={padX} y={y} width={w} height={barH} rx={6} ry={6} fill={r.color} />
            <SvgText
              x={padX + innerW + 8}
              y={y + barH / 2 + 4}
              fill="#211B19"
              fontSize="11"
              fontWeight="bold"
            >
              {r.pct}%
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
