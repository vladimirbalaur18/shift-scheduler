// implementarea unui observator specific pentru exportul programului in format csv

import { Logger } from "../lib/logger/logger";
import { Observer } from "./Observer";
import { ScheduleCSVAdapter } from "../adapter/ScheduleCSVAdapter";
import { ScheduleManager } from "../ScheduleManager";

class CSVExportObserver implements Observer {
  private logger: Logger;
  private triggers: {
    exportOnEvent: string;
  };
  constructor(triggers: { exportOnEvent: string }) {
    this.triggers = triggers;
    this.logger = Logger.getInstance();
  }

  // implementarea metodei update din interfata observer
  // se declanseaza cand programul este generat si trebuie exportat
  update(event: string, data?: any): void {
    if (event === this.triggers.exportOnEvent && data) {
      const csvAdapter = new ScheduleCSVAdapter();
      csvAdapter.generateCSV(data);
      this.logger.log("csv exportat cu succes.");
    }
  }
}

export { CSVExportObserver };
