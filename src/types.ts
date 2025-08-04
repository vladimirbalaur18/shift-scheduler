type Day = string;

type Shift = "Morning" | "Evening" | "Night";

type DayShift = `${Day}-${Shift}`;

type ScheduleConfig = {
  team: string[];
  days: Day[];
  shifts: Shift[];
  unavailableShifts: Record<string, Set<DayShift>>;
  desiredShifts: Record<string, Set<DayShift>>;
  undesiredShifts: Record<string, Set<DayShift>>;
  sundayWorker: string;
};

type WeekSchedule = Record<Day, Record<Shift, string>>;

export { Day, Shift, DayShift, ScheduleConfig, WeekSchedule };
