import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import dotenv from "dotenv";

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
    console.log("pushed");
  }
  allRepos.map((data) => console.log(data.name))
}

main();
