import winston from "winston";
import Koa from "koa";

export const oBaseLogger = winston.createLogger({
  //format: winston.format.prettyPrint(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
});

export const KoaErrorLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
});
export function fnKoaErrorLog(ctx: Koa.Context, next: Koa.Next, error: any) {
  KoaErrorLogger.error("Koa middleware error", {
    oError: error,
  });
  next();
}
