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

  /**
   * Entry point. Assigns every day starting at `dayIndex`, skipping shifts that
   * are already present in the schedule (e.g. the pre-assigned Sunday worker).
   * `shiftIndex` is kept for backwards compatibility but is no longer used:
   * within each day the shift order is now decided dynamically (desired first).
   */
  assignShiftForDay(
    dayIndex: number,
    _shiftIndex: number,
    schedule: WeekSchedule,
  ): boolean {
    return this.assignDay(dayIndex, schedule);
  }

  private assignDay(dayIndex: number, schedule: WeekSchedule): boolean {
    // verifica daca am terminat de asignat toate zilele
    if (dayIndex === this.days.length) return true;

    const currentDay = this.days[dayIndex];
    schedule[currentDay] = schedule[currentDay] || {};

    // doar turele zilei care nu sunt deja completate (ex: duminica preasignata)
    const pendingShifts = this.shifts.filter(
      (shift) => schedule[currentDay][shift] === undefined,
    );

    // turele dorite de cineva sunt asignate inaintea celorlalte, astfel incat
    // un membru sa nu fie consumat de o tura neutra mai devreme in aceeasi zi
    const orderedShifts = this.orderShiftsByDesire(dayIndex, pendingShifts);

    return this.assignShiftsInDay(dayIndex, orderedShifts, 0, schedule);
  }

  /** Shifts wanted by at least one available member come first. */
  private orderShiftsByDesire(dayIndex: number, pendingShifts: Shift[]): Shift[] {
    const currentDay = this.days[dayIndex];
    const desiredFirst: Shift[] = [];
    const rest: Shift[] = [];

    for (const shift of pendingShifts) {
      const key: DayShift = `${currentDay}-${shift}`;
      const groups = this.mediator.getMembersByPreference(key);
      if (groups.desiredMembers.length > 0) {
        desiredFirst.push(shift);
      } else {
        rest.push(shift);
      }
    }

    return [...desiredFirst, ...rest];
  }

  private assignShiftsInDay(
    dayIndex: number,
    orderedShifts: Shift[],
    pos: number,
    schedule: WeekSchedule,
  ): boolean {
    // toate turele zilei au fost asignate, trece la ziua urmatoare
    if (pos === orderedShifts.length) {
      return this.assignDay(dayIndex + 1, schedule);
    }

    const currentDay = this.days[dayIndex];
    const currentShift = orderedShifts[pos];
    const dayShiftKey: DayShift = `${currentDay}-${currentShift}`;

    // obtine membrii grupati dupa preferintele lor pentru aceasta tura
    const availableGroups = this.mediator.getMembersByPreference(dayShiftKey);
    const availableMembersGroups = [
      this.sortMembersByCurrentLoad(availableGroups.desiredMembers),
      this.sortMembersByCurrentLoad(availableGroups.neutralMembers),
      this.sortMembersByCurrentLoad(availableGroups.undesiredMembers),
    ];

    // incearca sa asigneze tura unui membru disponibil
    for (const group of availableMembersGroups) {
      for (const member of group) {
        // asigneaza tura si actualizeaza contoarele si istoricul
        schedule[currentDay][currentShift] = member;
        this.totalShiftsCount[member]++;
        this.shiftSchedule[member].push({ dayIndex, shift: currentShift });
        this.mediator.notifyShiftAssignment(member, dayIndex, currentShift);

        // incearca sa asigneze urmatoarea tura a zilei
        if (this.assignShiftsInDay(dayIndex, orderedShifts, pos + 1, schedule)) {
          return true;
        }

        // backtracking: anuleaza asignarea
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
