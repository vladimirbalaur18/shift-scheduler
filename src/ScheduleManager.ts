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

  // numarul real de zile in care un membru poate lucra: zile fara concediu in
  // care exista cel putin o tura disponibila (regula: o singura tura pe zi).
  // Tine cont atat de vacationDays cat si de unavailableShifts, astfel incat
  // membrii indisponibili in majoritatea zilelor sa primeasca mai putine ture.
  private workableDaysCount(member: string): number {
    let count = 0;
    for (const day of this.config.days) {
      if (this.config.vacationDays[member]?.has(day)) continue;
      const hasAvailableShift = this.config.shifts.some(
        (shift) =>
          !this.config.unavailableShifts[member]?.has(`${day}-${shift}`)
      );
      if (hasAvailableShift) count++;
    }
    return count;
  }

  private getMaximumShiftsNumberLimitPerTeamMember(): Record<string, number> {
    const totalShifts = this.config.days.length * this.config.shifts.length;
    const shiftsPerMember = Math.floor(totalShifts / this.config.team.length);
    const memberShiftLimits: Record<string, number> = {};

    const capacity: Record<string, number> = {};
    for (const member of this.config.team) {
      capacity[member] = this.workableDaysCount(member);
    }

    let extraShifts = 0;

    // Distributie initiala: fiecare primeste cota egala, plafonata la capacitatea
    // sa reala. Deficitul membrilor cu disponibilitate redusa este redistribuit.
    for (const member of this.config.team) {
      const availableDays = capacity[member];

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
      let shiftsToDistribute = extraShifts;
      while (shiftsToDistribute > 0) {
        let minLimit = Infinity;
        for (const member of this.config.team) {
          if (memberShiftLimits[member] >= capacity[member]) continue;
          const lim = memberShiftLimits[member];
          if (lim < minLimit) minLimit = lim;
        }
        if (minLimit === Infinity) break;

        const chosen = this.config.team.find(
          (member) =>
            memberShiftLimits[member] < capacity[member] &&
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

  // limite pentru cautarea celui mai echilibrat program: numar maxim de
  // incercari, buget de timp si oprire timpurie cand nu se mai imbunatateste
  private static readonly BALANCE_ATTEMPTS = 500;
  private static readonly BALANCE_TIME_BUDGET_MS = 3000;
  private static readonly BALANCE_NO_IMPROVEMENT_LIMIT = 120;

  // genereaza mai multe programe valide si il pastreaza pe cel mai echilibrat
  // (turele de tip dimineata/seara/noapte distribuite cat mai egal posibil)
  public generateValidSchedule(): WeekSchedule | null {
    const deadline = Date.now() + ScheduleManager.BALANCE_TIME_BUDGET_MS;

    let best: WeekSchedule | null = null;
    let bestScore = Infinity;
    let fallback: WeekSchedule | null = null;
    let attemptsSinceImprovement = 0;

    for (
      let attempt = 0;
      attempt < ScheduleManager.BALANCE_ATTEMPTS && Date.now() < deadline;
      attempt++
    ) {
      this.resetTeamShiftsCounts();
      const schedule = this.buildSchedule();

      // fezabilitatea nu depinde de ordinea de cautare (backtracking complet):
      // daca o incercare esueaza, nicio alta nu va reusi
      if (!schedule) break;

      if (!fallback) fallback = schedule;
      if (!this.membersHaveEnoughShifts(schedule)) continue;

      const score = this.computeBalanceScore();
      if (score < bestScore) {
        bestScore = score;
        best = schedule;
        attemptsSinceImprovement = 0;
        // 0 = perfect echilibrat, nu se poate mai bine
        if (score === 0) break;
      } else {
        attemptsSinceImprovement++;
        if (
          attemptsSinceImprovement >=
          ScheduleManager.BALANCE_NO_IMPROVEMENT_LIMIT
        ) {
          break;
        }
      }
    }

    return best ?? fallback;
  }

  // scor de dezechilibru: pentru fiecare tip de tura, suma abaterilor patratice
  // ale numarului de ture per membru fata de medie. Mai mic = mai echilibrat.
  private computeBalanceScore(): number {
    let score = 0;
    for (const shift of this.config.shifts) {
      const counts = this.config.team.map(
        (member) =>
          this.shiftSchedule[member].filter((h) => h.shift === shift).length
      );
      const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
      for (const c of counts) {
        score += (c - mean) ** 2;
      }
    }
    return score;
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

    // statistici calculate din programul ales (nu din ultima incercare)
    logger.log(":bar_chart: distributia turelor:");
    this.config.team.forEach((member) => {
      const perType = this.config.shifts.map((shift) => {
        const count = this.countMemberShiftsOfType(schedule, member, shift);
        return `${shift}: ${count}`;
      });
      const total = this.config.shifts.reduce(
        (sum, shift) =>
          sum + this.countMemberShiftsOfType(schedule, member, shift),
        0
      );
      logger.log(`  ${member}: ${total} ture (${perType.join(", ")})`);
    });
  }

  private countMemberShiftsOfType(
    schedule: WeekSchedule,
    member: string,
    shift: Shift
  ): number {
    return this.config.days.filter((day) => schedule[day]?.[shift] === member)
      .length;
  }
}

export { ScheduleManager };
