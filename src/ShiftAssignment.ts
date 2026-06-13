import { Day, Shift, DayShift, WeekSchedule } from "./types";
import { ScheduleMediator } from "./mediator/ScheduleMediator";

class ShiftAssignment {
  private mediator: ScheduleMediator;
  private lastFailedShift: DayShift | null = null;

  constructor(
    private days: Day[],
    private shifts: Shift[],
    mediator: ScheduleMediator,
    private totalShiftsCount: Record<string, number>,
    private shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>,
    _team: string[],
  ) {
    this.mediator = mediator;
    this.mediator.registerComponent("assignment", this);
  }

  /**
   * Orders candidates so the schedule stays balanced:
   *   1. fewest shifts of THIS type already worked (even out mornings/evenings/nights),
   *   2. then fewest total shifts (even out overall load),
   *   3. then a random tie-break among equals (lets best-of-N explore variants).
   * Relies on a stable sort: pre-shuffling randomizes the order of equal-key members.
   */
  private sortMembersForShift(members: string[], shift: Shift): string[] {
    const shuffled = this.shuffle([...members]);
    return shuffled.sort((a, b) => {
      const ta = this.countShiftsOfType(a, shift);
      const tb = this.countShiftsOfType(b, shift);
      if (ta !== tb) return ta - tb;
      return this.totalShiftsCount[a] - this.totalShiftsCount[b];
    });
  }

  private countShiftsOfType(member: string, shift: Shift): number {
    let count = 0;
    for (const h of this.shiftSchedule[member]) {
      if (h.shift === shift) count++;
    }
    return count;
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
      this.sortMembersForShift(availableGroups.desiredMembers, currentShift),
      this.sortMembersForShift(availableGroups.neutralMembers, currentShift),
      this.sortMembersForShift(availableGroups.undesiredMembers, currentShift),
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
