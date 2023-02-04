import Router from "@koa/router";
import Koa from "koa";
import { GitConfig, Gitlab } from "./git/gitlab.js";
import "dotenv/config";
import { Types } from "@gitbeaker/node/dist/types/index.js";

const gitlab = new Gitlab(
  {
    host: "https://gitlab.com",
    token: process.env.gitlabToken,
  },
  parseInt(process.env.topLevelGroup, 10)
);

gitlab.updateFileTree();
const router = new Router();

router.get("/version", (ctx: Koa.Context, next: Koa.Next) => {
  ctx.body = "1.0.0";
  next();
});

router.get("/filetree", async (ctx: Koa.Context, next: Koa.Next) => {
  let body = gitlab.getFileTree();
  if (ctx.query.filter) {
    body = body.filter((item) => {
      return item.type == ctx.query.filter;
    });
  }
  ctx.body = JSON.stringify(body);
  next();
});

export { router as Router };
