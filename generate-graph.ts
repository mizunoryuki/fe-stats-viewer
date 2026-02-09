import fs from "fs";
import { Result } from "./scan";

const RESULT_FILE = "result.json";

async function generate() {
  if (!fs.existsSync(RESULT_FILE)) return;
  const data: Result[] = JSON.parse(fs.readFileSync(RESULT_FILE, "utf-8"));

  const statsMap: Record<string, { count: number; repos: string[] }> = {};
  let totalCount = 0;

  // プロジェクトから見つかったフレームワークを集計する
  data.forEach((entry) => {
    entry.frameworks.forEach((framework: string) => {
      if (!statsMap[framework]) statsMap[framework] = { count: 0, repos: [] };
      statsMap[framework].count++;
      statsMap[framework].repos.push(entry.repoName);
      totalCount++;
    });
  });
}

generate();
