import { Day, Shift, DayShift } from "./types";
import { ScheduleMediator } from "./mediator/ScheduleMediator";

class ShiftConstraints {
  private mediator: ScheduleMediator;

  constructor(
    private unavailableShifts: Record<string, Set<DayShift>>,
    private days: Day[],
    private shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>,
    private totalShiftsCount: Record<string, number>,
    private memberShiftLimits: Record<string, number>,
    private vacationDays: Record<string, Set<Day>>,
    mediator: ScheduleMediator
  ) {
    this.mediator = mediator;
    this.mediator.registerComponent("constraints", this);
  }

  isMemberAvailable(member: string, dayIndex: number, shift: Shift): boolean {
    const day = this.days[dayIndex];
    const key: DayShift = `${day}-${shift}`;
    return (
      !this.vacationDays[member]?.has(day) &&
      !this.unavailableShifts[member]?.has(key) &&
      !this.shiftSchedule[member].some((h) => h.dayIndex === dayIndex) &&
      !this.hasMoreThanThreeConsecutiveNights(member, dayIndex, shift) &&
      !this.hasNightBeforeMorningOrEvening(member, dayIndex, shift) &&
      this.totalShiftsCount[member] < this.memberShiftLimits[member]
    );
  }

  private hasMoreThanThreeConsecutiveNights(
    member: string,
    dayIndex: number,
    shift: Shift
  ): boolean {
    if (shift !== "Night") return false;
    let streak = 1;
    for (let i = dayIndex - 1; i >= 0 && streak <= 3; i--) {
      if (
        this.shiftSchedule[member].some(
          (h) => h.dayIndex === i && h.shift === "Night"
        )
      ) {
        streak++;
      } else {
        break;
      }
    }
    return streak > 3;
  }

  private hasNightBeforeMorningOrEvening(
    member: string,
    dayIndex: number,
    shift: Shift
  ): boolean {
    if (shift === "Morning" || shift === "Evening") {
      return this.shiftSchedule[member].some(
        (h) => h.dayIndex === dayIndex - 1 && h.shift === "Night"
      );
    }
    return false;
  }
}

export { ShiftConstraints };
