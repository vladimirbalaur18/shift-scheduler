// implementarea unui observator specific pentru exportul programului in format csv

import { Logger } from "./logger";
import { Observer } from "./Observer";
import { ScheduleCSVAdapter } from "./ScheduleCSVAdapter";
import { ScheduleManager } from "./ScheduleManager";

class CSVExportObserver implements Observer {
  private scheduleManager: ScheduleManager;
  private logger: Logger;

  constructor(scheduleManager: ScheduleManager) {
    this.scheduleManager = scheduleManager;
    this.logger = Logger.getInstance();
  }

  // implementarea metodei update din interfata observer
  // se declanseaza cand programul este generat si trebuie exportat
  update(event: string, data?: any): void {
    if (event === "scheduleGenerated" && data) {
      const csvAdapter = new ScheduleCSVAdapter(this.scheduleManager);
      csvAdapter.generateCSV(data);
      this.logger.log("csv exportat cu succes.");
    }
  }
}

export { CSVExportObserver };
