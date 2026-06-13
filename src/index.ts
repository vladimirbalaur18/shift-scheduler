import { ScheduleFacade } from "./facades/ScheduleFacade";
import { CSVExportObserver } from "./observers/CSVExportObserver";
import { ExcelExportObserver } from "./observers/ExcelExportObserver";

const SCHEDULE_GENERATED_EVENT = ScheduleFacade.events.scheduleGenerated;

const scheduleMaker = new ScheduleFacade();

scheduleMaker.configureSchedule({
  team: ["Vladimir", "Daniel", "Dan", "Cristin", "Alexandru"],
  days: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],

  shifts: ["Morning", "Evening", "Night"],
  unavailableShifts: {
    Alexandru: new Set([]),
    Vladimir: new Set([
      "Sunday-Morning",
      "Sunday-Night",
      "Monday-Morning",
      "Monday-Evening",
      "Monday-Night",
      "Tuesday-Morning",
      "Tuesday-Night",
      "Wednesday-Morning",
      "Wednesday-Night",
      "Thursday-Morning",
      "Thursday-Evening",
      "Thursday-Night",
      "Friday-Morning",
      "Friday-Night",
      "Saturday-Morning",
      "Saturday-Night",
    ]),
    Cristin: new Set([
      "Sunday-Night",
      "Tuesday-Night",
      "Wednesday-Night",
      "Thursday-Night",
      "Friday-Night",
      "Saturday-Night",
    ]),
    Daniel: new Set([]),
    Dan: new Set(["Tuesday-Morning"]),
  },
  vacationDays: {
    Vladimir: new Set([]),
    Cristin: new Set(["Monday"]),
    Daniel: new Set(["Sunday"]),
    Dan: new Set([]),
    Alexandru: new Set(["Sunday"]),
  },
  desiredShifts: {
    Alexandru: new Set([]),
    Vladimir: new Set([]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([
      "Sunday-Evening",
      "Monday-Evening",
      "Tuesday-Evening",
      "Wednesday-Evening",
      "Thursday-Evening",
      "Friday-Evening",
      "Saturday-Evening",
    ]),
  },
  undesiredShifts: {
    Alexandru: new Set([]),
    Vladimir: new Set([]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([]),
  },

  sundayWorker: "Cristin",
});

const csvObserver = new CSVExportObserver({
  exportOnEvent: SCHEDULE_GENERATED_EVENT,
});
const excelObserver = new ExcelExportObserver({
  exportOnEvent: SCHEDULE_GENERATED_EVENT,
});

//hook observers to the scheduleMaker
scheduleMaker.addObserver(csvObserver);
scheduleMaker.addObserver(excelObserver);

scheduleMaker.generateAndLogSchedule();
