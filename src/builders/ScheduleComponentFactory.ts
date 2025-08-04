// implementarea pattern-ului factory pentru crearea componentelor sistemului de programare

import { ShiftAssignment } from "../ShiftAssignment";
import { ShiftConstraints } from "../ShiftConstraints";
import { ShiftPreferences } from "../ShiftPreferences";
import { ScheduleConfig, Shift } from "../types";
import { ConcreteScheduleMediator } from "../mediator/ScheduleMediator";

class ScheduleComponentFactory {
  // creeaza toate componentele necesare sistemului si le conecteaza prin mediator
  static createComponentsWithMediator(
    config: ScheduleConfig,
    shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>,
    totalShiftsCount: Record<string, number>,
    limits: Record<string, number>
  ) {
    // creeaza mediatorul care va coordona comunicarea intre componente
    const mediator = new ConcreteScheduleMediator();

    // creeaza componenta pentru gestionarea constrangerilor
    const constraints = new ShiftConstraints(
      config.unavailableShifts,
      config.days,
      shiftSchedule,
      totalShiftsCount,
      limits,
      config.vacationDays,
      mediator
    );

    // creeaza componenta pentru gestionarea preferintelor
    const preferences = new ShiftPreferences(
      config.desiredShifts,
      config.undesiredShifts,
      config.team,
      mediator
    );

    // creeaza componenta pentru asignarea turelor
    const assignment = new ShiftAssignment(
      config.days,
      config.shifts,
      mediator,
      totalShiftsCount,
      shiftSchedule
    );

    // returneaza toate componentele create si mediatorul
    return { constraints, preferences, assignment, mediator };
  }
}

export { ScheduleComponentFactory };
