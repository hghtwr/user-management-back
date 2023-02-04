import { Gitlab } from "./git/gitlab.js";
import "dotenv/config";

export async function start() {
  const gitlab = new Gitlab(
    {
      host: "https://gitlab.com",
      token: process.env.gitlabToken,
    },
    parseInt(process.env.topLevelGroup)
  );
  await gitlab.updateFileTree();
}
