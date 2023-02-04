import Koa from "koa";
import logger from "koa-logger";
import * as HttpStatus from "http-status-codes";
import { Router } from "./router.js";
import "dotenv/config";
import { Gitlab } from "./git/gitlab.js";
const app = new Koa();

app.use(logger());

app.use(async (ctx: Koa.Context, next: () => Promise<any>) => {
  try {
    await next();
  } catch (error) {
    ctx.status =
      error.statusCode ||
      error.status ||
      HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR;
    error.status = ctx.status;
    ctx.body = { error };
    ctx.app.emit("error", error, ctx);
  }
});
app.use(Router.routes());

app.listen(3000);
