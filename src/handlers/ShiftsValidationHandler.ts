// handler pentru validarea configuratiei turelor in lantul de responsabilitate

import { ScheduleConfig } from "../types";
import { BaseScheduleHandler } from "./ScheduleHandler";
import { Logger } from "../lib/logger/logger";

export class ShiftsValidationHandler extends BaseScheduleHandler {
  private logger = Logger.getInstance();

  // valideaza configuratia turelor
  handle(config: ScheduleConfig): boolean {
    // verifica daca exista ture definite
    if (!config.shifts || config.shifts.length === 0) {
      this.logger.error(
        "configuratia turelor este invalida: lista de ture nu poate fi goala"
      );
      return false;
    }

    // verifica daca toate turele sunt de tipurile permise
    const validShifts = new Set(["Morning", "Evening", "Night"]);
    const hasInvalidShift = config.shifts.some(
      (shift) => !validShifts.has(shift)
    );

    if (hasInvalidShift) {
      this.logger.error(
        "configuratia turelor este invalida: contine tipuri de tura nepermise"
      );
      return false;
    }

    // trimite configuratia catre urmatorul handler din lant
    return super.handle(config);
  }
}
