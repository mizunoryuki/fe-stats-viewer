import fs from "fs";
import { Result } from "./scan";

const RESULT_FILE = "result.json";

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

type ResultStats = {
  color: string;
  name: string;
  count: number;
  repos: string[];
};

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
  
}

generate();
