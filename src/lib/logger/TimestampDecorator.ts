import { Logger } from "./logger";

export class TimestampLogger
  implements Pick<Logger, "log" | "error" | "getLogs" | "clearLogs">
{
  constructor(private baseLogger: Logger) {}

  private withTimestamp(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
  }

  log(message: string): void {
    this.baseLogger.log(this.withTimestamp(message));
  }

  error(message: string): void {
    this.baseLogger.error(this.withTimestamp(message));
  }

  getLogs(): string[] {
    return this.baseLogger.getLogs();
  }

  clearLogs(): void {
    this.baseLogger.clearLogs();
  }
}
