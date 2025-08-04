// handler pentru validarea constrangerilor in lantul de responsabilitate

import { ScheduleConfig, DayShift } from "../types";
import { BaseScheduleHandler } from "./ScheduleHandler";
import { Logger } from "../lib/logger/logger";

export class ConstraintsValidationHandler extends BaseScheduleHandler {
  private logger = Logger.getInstance();

  handle(config: ScheduleConfig): boolean {
    // verifica daca vreun membru al echipei are toate turele marcate ca indisponibile
    for (const member of config.team) {
      const memberUnavailable = config.unavailableShifts[member];
      if (!memberUnavailable) continue;

      const totalPossibleShifts = config.days.length * config.shifts.length;
      if (memberUnavailable.size >= totalPossibleShifts) {
        this.logger.error(
          `validarea constrangerilor a esuat: ${member} are toate turele marcate ca indisponibile`
        );
        return false;
      }
    }

    // verifica daca angajatul desemnat pentru duminica este disponibil pentru turele de duminica
    const sundayShifts = config.shifts.map(
      (shift) => `Sunday-${shift}` as DayShift
    );
    const sundayWorkerUnavailable =
      config.unavailableShifts[config.sundayWorker] || new Set<DayShift>();

    const isSundayWorkerAvailable = !sundayShifts.every((shift) =>
      sundayWorkerUnavailable.has(shift)
    );

    if (!isSundayWorkerAvailable) {
      this.logger.error(
        `validarea constrangerilor a esuat: angajatul ${config.sundayWorker} nu este disponibil pentru nicio tura de duminica`
      );
      return false;
    }

    // trimite configuratia catre urmatorul handler din lant
    return super.handle(config);
  }
}
