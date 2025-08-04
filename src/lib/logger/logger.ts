export class Logger {
  private static instance: Logger;
  private logs: string[] = [];

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  log(message: string): void {
    this.logs.push(`[INFO] ${message}`);
    console.log(`[INFO] ${message}`);
  }

  error(message: string): void {
    this.logs.push(`[ERROR] ${message}`);
    console.error(`[ERROR] ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
