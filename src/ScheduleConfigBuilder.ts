// implementarea pattern-ului builder pentru construirea configuratiei programului de lucru

import { ScheduleConfig, Day, Shift, DayShift } from "./types";

class ScheduleConfigBuilder {
  private config: Partial<ScheduleConfig> = {};

  setTeam(team: string[]) {
    this.config.team = team;
    return this;
  }

  setDays(days: Day[]) {
    this.config.days = days;
    return this;
  }

  setShifts(shifts: Shift[]) {
    this.config.shifts = shifts;
    return this;
  }

  setUnavailableShifts(map: Record<string, Set<DayShift>>) {
    this.config.unavailableShifts = map;
    return this;
  }

  setDesiredShifts(map: Record<string, Set<DayShift>>) {
    this.config.desiredShifts = map;
    return this;
  }

  setUndesiredShifts(map: Record<string, Set<DayShift>>) {
    this.config.undesiredShifts = map;
    return this;
  }

  setSundayWorker(name: string) {
    this.config.sundayWorker = name;
    return this;
  }

  build(): ScheduleConfig {
    const requiredFields = [
      "team",
      "days",
      "shifts",
      "unavailableShifts",
      "desiredShifts",
      "undesiredShifts",
      "sundayWorker",
    ];
    for (const field of requiredFields) {
      if (!(field in this.config)) {
        throw new Error(`camp obligatoriu lipsa in scheduleconfig: ${field}`);
      }
    }
    return this.config as ScheduleConfig;
  }
}

export { ScheduleConfigBuilder };
