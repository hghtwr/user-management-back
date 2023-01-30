import Koa from "koa";
import logger from "koa-logger";
import * as HttpStatus from "http-status-codes";
import { Router } from "./router.js";
import { start } from "./startup.js";
import "dotenv/config";

const app = new Koa();

app.use(logger());

await start();

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
