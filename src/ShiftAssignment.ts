
import { Day, Shift, DayShift, WeekSchedule } from "./types";
import { ScheduleMediator } from "./mediator/ScheduleMediator";

class ShiftAssignment {
  private mediator: ScheduleMediator;

  constructor(
    private days: Day[],
    private shifts: Shift[],
    mediator: ScheduleMediator,
    private totalShiftsCount: Record<string, number>,
    private shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>
  ) {
    this.mediator = mediator;
    this.mediator.registerComponent("assignment", this);
  }

  assignShiftForDay(
    dayIndex: number,
    shiftIndex: number,
    schedule: WeekSchedule
  ): boolean {
    // verifica daca am terminat de asignat toate turele
    if (dayIndex === this.days.length) return true;

    const currentDay = this.days[dayIndex];
    const currentShift = this.shifts[shiftIndex];
    const dayShiftKey: DayShift = `${currentDay}-${currentShift}`;

    // obtine membrii grupati dupa preferintele lor pentru aceasta tura
    const availableGroups = this.mediator.getMembersByPreference(dayShiftKey);
    const availableMembersGroups = [
      availableGroups.desiredMembers,
      availableGroups.neutralMembers,
      availableGroups.undesiredMembers,
    ];

    // incearca sa asigneze tura unui membru disponibil
    for (const group of availableMembersGroups) {
      for (const member of group) {
        // initializeaza ziua in program daca nu exista
        schedule[currentDay] = schedule[currentDay] || {};
        schedule[currentDay][currentShift] = member;

        // actualizeaza contoarele si istoricul
        this.totalShiftsCount[member]++;
        this.shiftSchedule[member].push({ dayIndex, shift: currentShift });
        this.mediator.notifyShiftAssignment(member, dayIndex, currentShift);

        // calculeaza urmatoarea tura de asignat
        const nextShiftIndex = (shiftIndex + 1) % this.shifts.length;
        const nextDayIndex =
          shiftIndex === this.shifts.length - 1 ? dayIndex + 1 : dayIndex;

        // incearca sa asigneze urmatoarea tura
        if (this.assignShiftForDay(nextDayIndex, nextShiftIndex, schedule)) {
          return true;
        }

        this.totalShiftsCount[member]--;
        this.shiftSchedule[member] = this.shiftSchedule[member].filter(
          (h) => h.dayIndex !== dayIndex || h.shift !== currentShift
        );
        this.mediator.undoShiftAssignment(member, dayIndex, currentShift);
        delete schedule[currentDay][currentShift];
      }
    }

    return false;
  }
}

export { ShiftAssignment };
