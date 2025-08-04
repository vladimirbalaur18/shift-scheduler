// clasa principala pentru gestionarea programului de lucru
// implementeaza logica de baza pentru crearea si validarea programului

import { ScheduleConfig, Day, Shift, WeekSchedule, DayShift } from "./types";
import { ScheduleComponentFactory } from "./ScheduleComponentFactory";
import { ShiftConstraints } from "./ShiftConstraints";
import { ShiftPreferences } from "./ShiftPreferences";
import { ShiftAssignment } from "./ShiftAssignment";
import { Logger } from "./logger";
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

    // Redistribute extra shifts to a random eligible member
    if (extraShifts > 0) {
      const eligibleMembers = this.config.team.filter(
        (member) =>
          memberShiftLimits[member] <
          this.config.days.length -
            (this.config.vacationDays[member]?.size ?? 0)
      );

      if (eligibleMembers.length > 0) {
        // Distribute extraShifts randomly among eligible members
        let shiftsToDistribute = extraShifts;
        let lastMember: string | undefined;

        while (shiftsToDistribute > 0) {
          // Pick a random member, but not the same one as the last iteration if possible
          let selectableMembers = lastMember
            ? eligibleMembers.filter((m) => m !== lastMember)
            : eligibleMembers;

          if (selectableMembers.length === 0) {
            selectableMembers = eligibleMembers; // fallback if only one eligible member
          }

          // Shuffle selectableMembers and pick the first one as random
          const shuffledMembers = selectableMembers
            .map((m) => ({ m, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ m }) => m);
          const randomMember = shuffledMembers[0];

          memberShiftLimits[randomMember]++;
          lastMember = randomMember;
          shiftsToDistribute--;
        }
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
        `:x: ${this.config.sundayWorker} nu este disponibil pentru turele de duminica dimineata sau seara.`
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

    // incepe asignarea de la tura de noapte de duminica
    const isScheduleGenerated = this.shiftAssignment.assignShiftForDay(
      0,
      2,
      schedule
    );
    return isScheduleGenerated ? schedule : null;
  }

  // genereaza un program valid, reincercand daca este necesar
  public generateValidSchedule(): WeekSchedule | null {
    let schedule: WeekSchedule | null = this.buildSchedule();

    // reincearca pana cand toti membrii au suficiente ture
    while (
      schedule &&
      Object.keys(this.totalShiftsCount).some(
        (member) =>
          this.totalShiftsCount[member] < this.memberShiftLimits[member]
      )
    ) {
      logger.log(":x: unii membri nu au suficiente ture. se regenereaza...");
      this.resetTeamShiftsCounts();
      schedule = this.buildSchedule();
    }

    return schedule;
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
