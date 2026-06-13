// clasa principala pentru gestionarea programului de lucru
// implementeaza logica de baza pentru crearea si validarea programului

import { ScheduleConfig, Day, Shift, WeekSchedule, DayShift } from "./types";
import { ScheduleComponentFactory } from "./builders/ScheduleComponentFactory";
import { ShiftConstraints } from "./ShiftConstraints";
import { ShiftPreferences } from "./ShiftPreferences";
import { ShiftAssignment } from "./ShiftAssignment";
import { Logger } from "./lib/logger/logger";
import { ConcreteScheduleMediator } from "./mediator/ScheduleMediator";

const logger = Logger.getInstance();
class ScheduleManager {
  // starea interna pentru gestionarea turelor
  private totalShiftsCount: Record<string, number>;
  private shiftSchedule: Record<string, { dayIndex: number; shift: Shift }[]>;
  private memberShiftLimits: Record<string, number>;

  // componente pentru gestionarea diferitelor aspecte ale programului
  private shiftConstraints: ShiftConstraints;
  private shiftPreferences: ShiftPreferences;
  private shiftAssignment: ShiftAssignment;
  private mediator: ConcreteScheduleMediator;

  constructor(private config: ScheduleConfig) {
    // initializeaza contoarele si programul gol
    this.totalShiftsCount = this.nullifyShiftCounterPerMember();
    this.shiftSchedule = this.initializeBlankScheduleWithTeam();
    this.memberShiftLimits = this.getMaximumShiftsNumberLimitPerTeamMember();

    // creeaza componentele necesare folosind factory pattern
    const components = ScheduleComponentFactory.createComponentsWithMediator(
      this.config,
      this.shiftSchedule,
      this.totalShiftsCount,
      this.memberShiftLimits
    );

    // initializeaza componentele
    this.shiftConstraints = components.constraints;
    this.shiftPreferences = components.preferences;
    this.shiftAssignment = components.assignment;
    this.mediator = components.mediator;
  }

  // returneaza tipurile de ture disponibile
  private getShifts() {
    return ["Morning", "Evening", "Night"] as const;
  }

  public getAvailableShifts(): readonly string[] {
    return this.getShifts();
  }

  // initializeaza contoarele de ture pentru fiecare membru
  private nullifyShiftCounterPerMember(): Record<string, number> {
    return Object.fromEntries(this.config.team.map((name) => [name, 0]));
  }

  // creeaza un program gol pentru fiecare membru
  private initializeBlankScheduleWithTeam(): Record<
    string,
    { dayIndex: number; shift: Shift }[]
  > {
    return Object.fromEntries(this.config.team.map((name) => [name, []]));
  }

  private getMaximumShiftsNumberLimitPerTeamMember(): Record<string, number> {
    const totalShifts = this.config.days.length * this.config.shifts.length;
    const shiftsPerMember = Math.floor(totalShifts / this.config.team.length);
    const memberShiftLimits: Record<string, number> = {};

    let extraShifts = 0;

    // Initial distribution and check for constraints
    for (const member of this.config.team) {
      const availableDays =
        this.config.days.length - (this.config.vacationDays[member]?.size ?? 0);

      if (availableDays < shiftsPerMember) {
        extraShifts += shiftsPerMember - availableDays;
        memberShiftLimits[member] = availableDays;
      } else {
        memberShiftLimits[member] = shiftsPerMember;
      }
    }

    // Redistribute extra shifts by water-filling: always top up eligible members
    // with the smallest current limit (stable tie-break: first in config.team order).
    if (extraShifts > 0) {
      const maxWorkableDays = (member: string) =>
        this.config.days.length - (this.config.vacationDays[member]?.size ?? 0);

      let shiftsToDistribute = extraShifts;
      while (shiftsToDistribute > 0) {
        let minLimit = Infinity;
        for (const member of this.config.team) {
          if (memberShiftLimits[member] >= maxWorkableDays(member)) continue;
          const lim = memberShiftLimits[member];
          if (lim < minLimit) minLimit = lim;
        }
        if (minLimit === Infinity) break;

        const chosen = this.config.team.find(
          (member) =>
            memberShiftLimits[member] < maxWorkableDays(member) &&
            memberShiftLimits[member] === minLimit
        );
        if (!chosen) break;

        memberShiftLimits[chosen]++;
        shiftsToDistribute--;
      }
    }

    // Handle Sunday worker bonus
    if (this.config.sundayWorker) {
      memberShiftLimits[this.config.sundayWorker]++;
    }

    console.log("Computed memberShiftLimits", memberShiftLimits);
    return memberShiftLimits;
  }
  // reseteaza starea programului pentru o noua incercare
  private resetTeamShiftsCounts(): void {
    this.totalShiftsCount = this.nullifyShiftCounterPerMember();
    this.shiftSchedule = this.initializeBlankScheduleWithTeam();

    // recreeaza componentele cu stare proaspata
    const components = ScheduleComponentFactory.createComponentsWithMediator(
      this.config,
      this.shiftSchedule,
      this.totalShiftsCount,
      this.memberShiftLimits
    );

    this.shiftConstraints = components.constraints;
    this.shiftPreferences = components.preferences;
    this.shiftAssignment = components.assignment;
    this.mediator = components.mediator;
  }

  private initializeSundaysOnSchedule(schedule: WeekSchedule): boolean {
    const sundayIndex = 0;
    const sunday = this.config.days[sundayIndex];
    const keyMorning: DayShift = `${sunday}-Morning`;
    const keyEvening: DayShift = `${sunday}-Evening`;

    if (
      this.config.unavailableShifts[this.config.sundayWorker]?.has(
        keyMorning
      ) ||
      this.config.unavailableShifts[this.config.sundayWorker]?.has(keyEvening)
    ) {
      logger.error(
        `generation failed: sunday worker ${this.config.sundayWorker} unavailable for ${keyMorning} or ${keyEvening}`
      );
      return false;
    }

    //@ts-expect-error
    schedule[sunday] = {
      Morning: this.config.sundayWorker,
      Evening: this.config.sundayWorker,
    };
    this.totalShiftsCount[this.config.sundayWorker] += 2;
    this.shiftSchedule[this.config.sundayWorker].push({
      dayIndex: sundayIndex,
      shift: "Morning",
    });
    this.shiftSchedule[this.config.sundayWorker].push({
      dayIndex: sundayIndex,
      shift: "Evening",
    });

    return true;
  }

  private buildSchedule(): WeekSchedule | null {
    const schedule: WeekSchedule = {};
    if (!this.initializeSundaysOnSchedule(schedule)) return null;

    const sundayIndex = this.config.days.indexOf("Sunday");
    const nightShiftIndex = this.config.shifts.indexOf("Night");

    this.shiftAssignment.clearLastFailure();
    const isScheduleGenerated = this.shiftAssignment.assignShiftForDay(
      sundayIndex,
      nightShiftIndex,
      schedule
    );
    if (!isScheduleGenerated) {
      const failed = this.shiftAssignment.getLastFailedShift();
      if (failed) {
        logger.error(
          `generation failed: no assignable member for shift ${failed}`
        );
      }
    }
    return isScheduleGenerated ? schedule : null;
  }

  private membersHaveEnoughShifts(schedule: WeekSchedule): boolean {
    return Object.keys(this.totalShiftsCount).every(
      (member) =>
        this.totalShiftsCount[member] >= this.memberShiftLimits[member]
    );
  }

  // genereaza un program valid, reincercand daca este necesar
  public generateValidSchedule(): WeekSchedule | null {
    let schedule: WeekSchedule | null = this.buildSchedule();

    // reincearca pana cand toti membrii au suficiente ture
    while (schedule && !this.membersHaveEnoughShifts(schedule)) {
      logger.log(":x: unii membri nu au suficiente ture. se regenereaza...");
      this.resetTeamShiftsCounts();
      schedule = this.buildSchedule();
    }

    return schedule;
  }

  getLastFailedShift(): DayShift | null {
    return this.shiftAssignment.getLastFailedShift();
  }

  // afiseaza programul generat si statisticile
  public printSchedule(schedule: WeekSchedule): void {
    this.config.days.forEach((day) => {
      logger.log(`${day}:`);
      this.config.shifts.forEach((shift) => {
        logger.log(`  ${shift}: ${schedule[day][shift]}`);
      });
      logger.log("");
    });
    logger.log(":bar_chart: distributia turelor:");
    this.config.team.forEach((member) => {
      logger.log(`  ${member}: ${this.totalShiftsCount[member]} ture`);
    });
  }
}

export { ScheduleManager };
