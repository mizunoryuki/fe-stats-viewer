import fs from "fs";
import { Result } from "./scan";

const RESULT_FILE = "result.json";
const OUTPUT_FILE = "tech-viewer.svg";

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
  width: 1000,
  bg: "#0d1117",
  textColor: "#ffffff",
  fontSans: "'Inter', sans-serif",
  fontBungee: "'Bungee', cursive",
  fontNumber: "'JetBrains Mono', 'Inter', monospace",
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

  // プロジェクトから見つかったフレームワークを集計する(利用回数,利用しているリポジトリ)
  data.forEach((entry) => {
    entry.frameworks.forEach((framework: string) => {
      if (!statsMap[framework]) statsMap[framework] = { count: 0, repos: [] };
      statsMap[framework].count++;
      statsMap[framework].repos.push(entry.repoName);
      totalCount++;
    });
  });

  // 色情報追加
  const stats: ResultStats[] = Object.entries(statsMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      repos: val.repos,
      color: COLORS[name] || DEFAULT_COLOR,
    }))
    .sort((a, b) => b.count - a.count); // 降順ソート

  if (stats.length === 0) return;

  // svg作成
  const padding = 40;
  const barHeight = 26;
  const barGap = 22;
  const rowHeight = barHeight + barGap;
  const legendItemHeight = 32;
  const pieRadius = 120;
  const holeRadius = 75;
  const totalLegendHeight = stats.length * legendItemHeight;
  const totalBarHeight = stats.length * rowHeight - barGap;
  const contentHeight = Math.max(totalBarHeight, pieRadius * 2, 300);
  const headerSpace = 100;
  const svgHeight = headerSpace + contentHeight + 50;
  const drawingAreaCenterY = headerSpace + contentHeight / 2;

  const labelAreaWidth = 140;
  const maxBarPx = 230;
  const pieCenterX = 610;
  const legendX = 790;

  let currentBarY = drawingAreaCenterY - totalBarHeight / 2;
  const pieCenterY = drawingAreaCenterY;
  let currentLegendY = drawingAreaCenterY - totalLegendHeight / 2;

  let svg = `<svg width="${CONFIG.width}" height="${svgHeight}" viewBox="0 0 ${CONFIG.width} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Bungee&amp;family=Inter:wght@400;600;700&amp;family=JetBrains+Mono:wght@700&amp;display=swap');
	
	text { fill: ${CONFIG.textColor}; }

	.font-bungee { font-family: ${CONFIG.fontBungee}; }
	.title { font-size: 26px; fill: #58a6ff; }
	.label { font-size: 14px; letter-spacing: 0.05em; fill: #ffffff; }
	.legend-name { font-size: 14px; font-weight: normal; fill: #ffffff; }
	
	.font-data { font-family: ${CONFIG.fontNumber}; font-weight: 700; fill: #ffffff; }
	.total-val { font-size: 44px; fill: #ffffff; }
	.total-label { font-family: ${CONFIG.fontSans}; font-size: 12px; fill: #8b949e; letter-spacing: 0.1em; font-weight: 900;}
	.count-badge { font-size: 16px; fill: #ffffff; }
	.percent-val { font-size: 15px; fill: #ffffff; }

	.tooltip { cursor: pointer; }
	.tooltip:hover { opacity: 0.8; }
  </style>
  <rect width="100%" height="100%" fill="${CONFIG.bg}" rx="16" />
  
  <text x="${padding}" y="55" class="font-bungee title">TECH STACK OVERVIEW</text>
`;

  // 左側
  const maxVal = stats[0].count;
  stats.forEach((item) => {
    const barW = (item.count / maxVal) * maxBarPx;
    svg += `<g class="tooltip">
	<title>${escapeXml(item.name)}: ${item.count}</title>
	<text x="${padding}" y="${currentBarY + 19}" class="font-bungee label">${item.name.toUpperCase()}</text>
	<rect x="${labelAreaWidth}" y="${currentBarY}" width="${maxBarPx}" height="${barHeight}" fill="#30363d" rx="4" />
	<rect x="${labelAreaWidth}" y="${currentBarY}" width="${barW}" height="${barHeight}" fill="${item.color}" rx="4">
	  <animate attributeName="width" from="0" to="${barW}" dur="0.8s" fill="freeze" />
	</rect>
	<text x="${labelAreaWidth + maxBarPx + 12}" y="${currentBarY + 19}" class="font-data count-badge">${item.count}</text>
  </g>`;
    currentBarY += rowHeight;
  });
  svg += `</svg>`;
  fs.writeFileSync(OUTPUT_FILE, svg);
}

generate();
