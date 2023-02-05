import Router from "@koa/router";
import Koa from "koa";
import { GitConfig, Gitlab } from "./git/gitlab.js";
import "dotenv/config";
import { Types } from "@gitbeaker/node/dist/types/index.js";
import { fnKoaErrorLog, oBaseLogger } from "./logger.js";
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

/**
 * Should return the user details based on the user id parameter
 *
 */
router.get("/users", async (ctx: Koa.Context, next: Koa.Next) => {
  if (ctx.query.username) {
    const search = ctx.query.username as string;
    oBaseLogger.info("/users", {
      query: ctx.query.username,
    });

    var users = await gitlab.Users.search(search);
  } else {
    var users = await gitlab.Users.all();
  }
  ctx.body = JSON.stringify(users);
  next();
});

router.get("/groups/:id/users", async (ctx: Koa.Context, next: Koa.Next) => {
  oBaseLogger.info("/groups/" + ctx.params.id + "/users called");
  let id = ctx.params.id;
  let users = await gitlab.getEntityUsers(id);
  ctx.body = users;
  next();
});
export { router as Router };
