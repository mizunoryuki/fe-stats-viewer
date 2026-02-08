import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import dotenv from "dotenv";
import { WEB_LANGUAGES } from "./config";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

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
  console.log(`Total repos: ${targetRepos}.`);

  const results = [];
  const repo_count = targetRepos.length;
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
	  continue
    }
  }
}

main();
