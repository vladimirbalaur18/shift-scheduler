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
    Vladimir: new Set([]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([
      "Sunday-Night",
      "Friday-Night",
      "Saturday-Morning",
      "Saturday-Evening",
    ]),
  },

  desiredShifts: {
    Alexandru: new Set([]),
    Vladimir: new Set([]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([]),
  },

  undesiredShifts: {
    Alexandru: new Set([]),
    Vladimir: new Set([
      "Sunday-Night",
      "Monday-Night",
      "Tuesday-Night",
      "Wednesday-Night",
      "Thursday-Night",
      "Friday-Night",
      "Saturday-Night",
    ]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([
      "Monday-Morning",
      "Tuesday-Morning",
      "Wednesday-Morning",
      "Thursday-Morning",
      "Friday-Morning",
    ]),
  },
  vacationDays: {
    Vladimir: new Set([]),
    Cristin: new Set([]),
    Daniel: new Set([]),
    Dan: new Set([]),
    Alexandru: new Set([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]),
  },
  sundayWorker: "Alexandru",
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
