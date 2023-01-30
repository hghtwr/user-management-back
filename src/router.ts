import Router from "@koa/router";
import Koa from "koa";
import { Gitlab } from "./git/gitlab.js";
import "dotenv/config";

const router = new Router();

router.get("/version", (ctx: Koa.Context, next: Koa.Next) => {
  ctx.body = "1.0.0";
  next();
});

router.get("/groups", async (ctx: Koa.Context, next: Koa.Next) => {
  const gitlab = new Gitlab(
    {
      host: "https://gitlab.com",
      token: process.env.gitlabToken,
    },
    parseInt(process.env.topLevelGroup, 10)
  );
  const body = gitlab.getGroups();
  ctx.body = JSON.stringify(body);
  next();
});

export { router as Router };
