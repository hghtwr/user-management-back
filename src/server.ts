import Koa from "koa";
import logger from "koa-logger";
import * as HttpStatus from "http-status-codes";
import { Gitlab } from "./git/gitlab";
//import { Gitlab } from "@gitbeaker/node"; // All Resources
const dotenv = require("dotenv");

const app = new Koa();
dotenv.config();

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

app.use(async (ctx: Koa.Context) => {
  const gitlab = new Gitlab({
    host: "http://gitlab.com",
    token: process.env.gitlabToken,
  });
  console.log("Calling...");
  const project = await gitlab.Groups.all();
  console.log(project);
  ctx.body = project;
});

app.listen(3000);
