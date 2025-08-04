import { DayShift } from "./types";
import { ScheduleMediator } from "./mediator/ScheduleMediator";

class ShiftPreferences {
  private mediator: ScheduleMediator;

  constructor(
    private desiredShifts: Record<string, Set<DayShift>>,
    private undesiredShifts: Record<string, Set<DayShift>>,
    private team: string[],
    mediator: ScheduleMediator
  ) {
    this.mediator = mediator;
    this.mediator.registerComponent("preferences", this);
  }

  getMembersBySpecialDesires(
    dayShiftKey: DayShift,
    isMemberAvailable: (member: string) => boolean
  ): {
    desiredMembers: string[];
    neutralMembers: string[];
    undesiredMembers: string[];
  } {
    const desiredMembers: string[] = [];
    const neutralMembers: string[] = [];
    const undesiredMembers: string[] = [];

    for (const member of this.team) {
      if (!isMemberAvailable(member)) continue;
      if (this.desiredShifts[member].has(dayShiftKey)) {
        desiredMembers.push(member);
      } else if (this.undesiredShifts[member].has(dayShiftKey)) {
        undesiredMembers.push(member);
      } else {
        neutralMembers.push(member);
      }
    }

    return {
      desiredMembers: this.shuffleArray(desiredMembers),
      neutralMembers: this.shuffleArray(neutralMembers),
      undesiredMembers: this.shuffleArray(undesiredMembers),
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    return array.slice().sort(() => Math.random() - 0.5);
  }
}

export { ShiftPreferences };
