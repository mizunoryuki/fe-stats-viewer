import fs from "fs";
import { Result } from "./scan";

const RESULT_FILE = "result.json";
const OUTPUT_FILE = "stats-chart.svg";

const COLORS: Record<string, string> = {
  next: "#ffffff",
  react: "#61DAFB",
  vue: "#4FC08D",
  nuxt: "#00C58E",
  svelte: "#FF3E00",
  hono: "#E36002",
  astro: "#BC52EE",
  solid: "#446b9e",
  nitro: "#F4D03F",
  htmx: "#336699",
  alpine: "#8BC0D0",
};
const DEFAULT_COLOR = "#888888";

const CONFIG = {
  width: 800,
  bg: "#0d1117",
  textColor: "#ffffff",
  fontSans:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontImpact: "Impact, 'Arial Black', sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
};

type ResultStats = {
  color: string;
  name: string;
  count: number;
  repos: string[];
};

function escapeXml(unsafe: string): string {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

async function generate() {
  if (!fs.existsSync(RESULT_FILE)) return;
  const data: Result[] = JSON.parse(fs.readFileSync(RESULT_FILE, "utf-8"));

  const statsMap: Record<string, { count: number; repos: string[] }> = {};
  let totalCount = 0;

  data.forEach((entry) => {
    entry.frameworks.forEach((framework: string) => {
      if (!statsMap[framework]) statsMap[framework] = { count: 0, repos: [] };
      statsMap[framework].count++;
      statsMap[framework].repos.push(entry.repoName);
      totalCount++;
    });
  });

  const stats: ResultStats[] = Object.entries(statsMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      repos: val.repos,
      color: COLORS[name] || DEFAULT_COLOR,
    }))
    .sort((a, b) => b.count - a.count);

  if (stats.length === 0) return;

  const padding = 30;
  const barHeight = 23;
  const barGap = 18;
  const rowHeight = barHeight + barGap;
  const legendItemHeight = 32;
  const pieRadius = 100;
  const holeRadius = 65;
  const totalLegendHeight = stats.length * legendItemHeight;
  const totalBarHeight = stats.length * rowHeight - barGap;
  const contentHeight = Math.max(totalBarHeight, pieRadius * 2, 300);
  const headerSpace = 100;
  const svgHeight = headerSpace + contentHeight + 50;
  const drawingAreaCenterY = headerSpace + contentHeight / 2;

  const labelAreaWidth = 120;
  const maxBarPx = 180;
  const pieCenterX = 480;
  const legendX = 600;

  let currentBarY = drawingAreaCenterY - totalBarHeight / 2;
  const pieCenterY = drawingAreaCenterY;
  let currentLegendY = drawingAreaCenterY - totalLegendHeight / 2;

  let svg = `<svg width="${CONFIG.width}" height="${svgHeight}" viewBox="0 0 ${CONFIG.width} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
  text { fill: ${CONFIG.textColor}; font-family: ${CONFIG.fontSans}; }

  .title { font-family: ${CONFIG.fontImpact}; font-size: 28px; fill: #80FF00; letter-spacing: 1px; }
  .author { font-family: ${CONFIG.fontImpact}; font-size: 12px; fill: #8b949e; letter-spacing: 1px; }
  
  .label { font-family: ${CONFIG.fontImpact}; font-size: 14px; letter-spacing: 0.05em; fill: #ffffff; }
  .legend-name { font-family: ${CONFIG.fontImpact}; font-size: 14px; font-weight: normal; fill: #ffffff; letter-spacing: 0.5px; }
  
  .font-data { font-family: ${CONFIG.fontMono}; font-weight: 700; fill: #ffffff; }
  .total-val { font-family: ${CONFIG.fontMono}; font-size: 44px; fill: #ffffff; }
  .total-label { font-size: 12px; fill: #8b949e; letter-spacing: 0.1em; font-weight: 900;}
  
  .count-badge { font-size: 16px; fill: #ffffff; }
  .percent-val { font-size: 15px; fill: #ffffff; }

  .tooltip { cursor: pointer; }
  </style>
  <rect width="100%" height="100%" fill="${CONFIG.bg}" rx="16" />
  
  <text x="${padding}" y="55" class="title">TECH STACK OVERVIEW</text>
  <text x="${CONFIG.width - 100}" y="${svgHeight - padding}" class="author">MIZUNORYUKI</text>
`;

  // 左側：棒グラフ
  const maxVal = stats[0].count;
  stats.forEach((item) => {
    const barW = (item.count / maxVal) * maxBarPx;
    svg += `<g class="tooltip">
  <title>${escapeXml(item.name)}: ${item.count}</title>
  <text x="${padding}" y="${currentBarY + 19}" class="label">${item.name.toUpperCase()}</text>
  <rect x="${labelAreaWidth}" y="${currentBarY}" width="${maxBarPx}" height="${barHeight}" fill="#30363d" rx="4" />
  <rect x="${labelAreaWidth}" y="${currentBarY}" width="${barW}" height="${barHeight}" fill="${item.color}" rx="4">
    <animate attributeName="width" from="0" to="${barW}" dur="0.8s" fill="freeze" />
  </rect>
  <text x="${labelAreaWidth + maxBarPx + 12}" y="${currentBarY + 19}" class="font-data count-badge">${item.count}</text>
  </g>`;
    currentBarY += rowHeight;
  });

  // 中央：円グラフ
  const ringRadius = (pieRadius + holeRadius) / 2;
  const strokeWidth = pieRadius - holeRadius;
  const circumference = 2 * Math.PI * ringRadius;
  const gapPx = 2;
  const gapLength = (gapPx / (2 * Math.PI * ringRadius)) * circumference;
  let accumulatedPercent = 0;

  stats.forEach((item) => {
    const pct = item.count / totalCount;
    const dashLength = Math.max(0, pct * circumference - gapLength);
    const offset = -accumulatedPercent * circumference;

    svg += `<g class="tooltip">
      <circle cx="${pieCenterX}" cy="${pieCenterY}" r="${ringRadius}" fill="transparent" stroke="${item.color}" stroke-width="${strokeWidth}" stroke-dasharray="0 ${circumference}" stroke-linecap="butt" transform="rotate(-90 ${pieCenterX} ${pieCenterY})">
        <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${dashLength} ${circumference}" dur="0.8s" fill="freeze" />
        <animate attributeName="stroke-dashoffset" from="0" to="${offset}" dur="0.8s" fill="freeze" />
      </circle>
    </g>`;
    accumulatedPercent += pct;
  });

  svg += `<circle cx="${pieCenterX}" cy="${pieCenterY}" r="${holeRadius}" fill="${CONFIG.bg}" />`;
  svg += `<text x="${pieCenterX}" y="${pieCenterY + 12}" text-anchor="middle" class="font-data total-val">${totalCount}</text>`;
  svg += `<text x="${pieCenterX}" y="${pieCenterY + 38}" text-anchor="middle" class="total-label">TOTAL USES</text>`;

  // 右側：凡例
  stats.forEach((item) => {
    const percentage = Math.round((item.count / totalCount) * 100);
    svg += `<g>
      <rect x="${legendX}" y="${currentLegendY}" width="16" height="16" fill="${item.color}" rx="3" />
      <text x="${legendX + 28}" y="${currentLegendY + 14}" class="legend-name">${item.name.toUpperCase()}</text>
      <text x="${legendX + 165}" y="${currentLegendY + 14}" text-anchor="end" class="font-data percent-val">${percentage}%</text>
    </g>`;
    currentLegendY += legendItemHeight;
  });

  svg += `</svg>`;
  fs.writeFileSync(OUTPUT_FILE, svg);
  process.stdout.write("successfully generated svg image");
}

generate();
