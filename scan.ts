import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import dotenv from "dotenv";
import { FRAMEWORK_DEFINITIONS, IGNORE_PATH, WEB_LANGUAGES } from "./config";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

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

      return FRAMEWORK_DEFINITIONS.filter((fw) =>
        fw.packages.some((p) => depNames.includes(p)),
      ).map((fw) => fw.id);
    }
  } catch (e) {
    return [];
  }
  return [];
}

// リポジトリの全てのファイルを捜索
async function deepScanRepo(
  owner: string,
  repo: string,
  path: string = "",
): Promise<string[]> {
  let detected: string[] = [];
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

  console.log(`Total repos: ${repo_count}.`);

  const results = [];
  let count = 0;
  // リポジトリにフロントエンドの言語があるかどうか確認
  for (const repo of targetRepos) {
    count++;
    const prefix = `[${count}/${repo_count}] ${repo.name}`;
    process.stdout.write(`\r${prefix}`);

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
      process.stdout.write(`${prefix} : SKIP (Reason: No web languages.)`);
      process.stdout.write(`Found: ${Object.keys(langs).join(",")}`);
      continue;
    }

    // リポジトリの深層スキャン
    const frameworks = await deepScanRepo(repo.owner.login, repo.name);
	await new Promise(r => setTimeout(r, 200));
  }
}

main();
