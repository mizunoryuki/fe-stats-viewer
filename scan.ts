import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import dotenv from "dotenv";
import { FRAMEWORK_DEFINITIONS, IGNORE_PATH, WEB_LANGUAGES } from "./config";
import fs from "fs";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const RESULT_FILE = "result.json";
const LOG_FILE = "scan.log";

type FrameworkName = (typeof FRAMEWORK_DEFINITIONS)[number]["id"];

type Result = {
  repoName: string;
  frameworks: FrameworkName[];
  url: string;
};

// ログ出力
const logStream = fs.createWriteStream(LOG_FILE, { flags: "w" });
function writeLog(message: string) {
  const ts = new Date().toISOString();
  logStream.write(`${ts} : ${message}\n`);
}

// package.jsonファイルからdependenciesを取得し,フレームワーク情報を取得
async function analyzePackageJson(owner: string, repo: string, path: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ("content" in data && !Array.isArray(data)) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const pkg = JSON.parse(content);
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const depNames = Object.keys(allDeps);

      // フレームワークをdependenciesから検出
      let foundIds = FRAMEWORK_DEFINITIONS.filter((fw) =>
        fw.packages.some((p) => depNames.includes(p)),
      ).map((fw) => fw.id);

      // 重複を除外
      // nextがあるなら reactを除外
      if (foundIds.includes("next")) {
        foundIds = foundIds.filter((id) => id !== "react");
      }

      // nuxtがあるならvueを除外
      if (foundIds.includes("nuxt")) {
        foundIds = foundIds.filter((id) => id !== "vue");
      }

      return foundIds;
    }
  } catch (e) {
    if (e instanceof Error) {
      writeLog(e.message);
    }
    return [];
  }
  return [];
}

// リポジトリの全てのファイルを捜索
async function deepScanRepo(
  owner: string,
  repo: string,
  path: string = "",
): Promise<FrameworkName[]> {
  let detected: FrameworkName[] = [];
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if (Array.isArray(data)) {
      for (const file of data) {
        if (file.type === "dir") {
          if (IGNORE_PATH.includes(file.name)) continue;
          const sub = await deepScanRepo(owner, repo, file.path);
          detected = [...new Set([...detected, ...sub])];
        } else if (file.name === "package.json") {
          const found = await analyzePackageJson(owner, repo, file.path);
          detected = [...new Set([...detected, ...found])];
        }
      }
    }
  } catch (e) {}

  return detected;
}

async function main() {
  // リポジトリ一覧取得
  let page = 1;
  const allRepos: RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"] =
    [];
  while (true) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page: page,
      affiliation: "owner",
    });
    if (data.length === 0) break;
    allRepos.push(...data);
    page++;
  }

  // 自分が作成したリポジトリのみ抽出
  const targetRepos = allRepos.filter(
    (repo) => repo.owner.login === GITHUB_USERNAME && !repo.fork,
  );
  const repo_count = targetRepos.length;

  writeLog(`Total repos: ${repo_count}.`);
  process.stdout.write(`Total repos: ${repo_count}\n`);

  const results: Result[] = [];
  let count = 0;
  // リポジトリにフロントエンドの言語があるかどうか確認
  for (const repo of targetRepos) {
    count++;
    const prefix = `[${count}/${repo_count}] ${repo.name}`;
    process.stdout.write(`\r${prefix}\n`);

    const { data: langs } = await octokit.rest.repos.listLanguages({
      owner: repo.owner.login,
      repo: repo.name,
    });
    // Web系の言語を使ったファイルがあるか
    // ex) langs = { JavaScript: 3573, CSS: 260, HTML: 223 }
    const hasWebLang: boolean = Object.keys(langs).some((l) =>
      WEB_LANGUAGES.includes(l),
    );
    // Web系のない場合はSkip
    if (!hasWebLang) {
      writeLog(`${prefix} : SKIP (Reason: No web languages.)`);
      writeLog(`Found: ${Object.keys(langs).join(",")}`);
      continue;
    }

    // リポジトリの深層スキャン
    const frameworks: FrameworkName[] = await deepScanRepo(
      repo.owner.login,
      repo.name,
    );

    // フレームワークが見つかった場合
    if (frameworks.length > 0) {
      writeLog(`${prefix}: FOUND [${frameworks.join(",")}]`);
      results.push({ repoName: repo.name, frameworks, url: repo.html_url });
    } else {
      writeLog(`${prefix}: No target frameworks found in package.json`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  writeLog(`output : ${RESULT_FILE}`);
}

main().catch(console.error);
