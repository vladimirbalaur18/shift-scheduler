import { Day, Shift, DayShift, WeekSchedule } from "./types";
import { ScheduleMediator } from "./mediator/ScheduleMediator";

class ShiftAssignment {
  private mediator: ScheduleMediator;
  private lastFailedShift: DayShift | null = null;
  private readonly teamOrderIndex: Map<string, number>;

  constructor(
    private days: Day[],
    private shifts: Shift[],
    mediator: ScheduleMediator,
    private totalShiftsCount: Record<string, number>,
    private shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>,
    team: string[],
  ) {
    this.mediator = mediator;
    this.teamOrderIndex = new Map(team.map((name, i) => [name, i]));
    this.mediator.registerComponent("assignment", this);
  }

  /** Ascending by assigned shifts; stable tie-break: config.team order. */
  private sortMembersByCurrentLoad(members: string[]): string[] {
    return [...members].sort((a, b) => {
      const ca = this.totalShiftsCount[a];
      const cb = this.totalShiftsCount[b];
      if (ca !== cb) return ca - cb;
      return (
        (this.teamOrderIndex.get(a) ?? 0) - (this.teamOrderIndex.get(b) ?? 0)
      );
    });
  }

  clearLastFailure(): void {
    this.lastFailedShift = null;
  }

  getLastFailedShift(): DayShift | null {
    return this.lastFailedShift;
  }

  assignShiftForDay(
    dayIndex: number,
    shiftIndex: number,
    schedule: WeekSchedule,
  ): boolean {
    // verifica daca am terminat de asignat toate turele
    if (dayIndex === this.days.length) return true;

    const currentDay = this.days[dayIndex];
    const currentShift = this.shifts[shiftIndex];
    const dayShiftKey: DayShift = `${currentDay}-${currentShift}`;

    // obtine membrii grupati dupa preferintele lor pentru aceasta tura
    const availableGroups = this.mediator.getMembersByPreference(dayShiftKey);
    const availableMembersGroups = [
      this.sortMembersByCurrentLoad(availableGroups.desiredMembers),
      this.sortMembersByCurrentLoad(availableGroups.neutralMembers),
      this.sortMembersByCurrentLoad(availableGroups.undesiredMembers),
    ];

    // console.log("assigning shift for day", currentDay, currentShift);
    // console.log("available members groups", availableMembersGroups);
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
          (h) => h.dayIndex !== dayIndex || h.shift !== currentShift,
        );
        this.mediator.undoShiftAssignment(member, dayIndex, currentShift);
        delete schedule[currentDay][currentShift];
      }
    }

    this.lastFailedShift = dayShiftKey;
    return false;
  }
}

export { ShiftAssignment };
