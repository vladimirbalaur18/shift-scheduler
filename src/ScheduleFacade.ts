// implementarea pattern-ului facade pentru simplificarea interfetei sistemului
// coordoneaza toate componentele si ofera o interfata simplificata pentru client

import { Logger } from "./logger";
import { ScheduleConfigBuilder } from "./ScheduleConfigBuilder";
import { ScheduleManager } from "./ScheduleManager";
import { ScheduleCSVAdapter } from "./ScheduleCSVAdapter";
import { TimestampLogger } from "./TimestampDecorator";
import { Subject } from "./Observer";
import { TeamValidationHandler } from "./handlers/TeamValidationHandler";
import { ShiftsValidationHandler } from "./handlers/ShiftsValidationHandler";
import { ConstraintsValidationHandler } from "./handlers/ConstraintsValidationHandler";
import { ScheduleHandler } from "./handlers/ScheduleHandler";
import { Day, Shift, DayShift } from "./types";

export class ScheduleFacade extends Subject {
  private baseLogger: Logger;
  private timestampLogger: TimestampLogger;
  private configBuilder: ScheduleConfigBuilder;
  private scheduleManager: ScheduleManager | null = null;
  private validationChain: ScheduleHandler;

  constructor() {
    super();
    // initializeaza componentele necesare
    this.baseLogger = Logger.getInstance();
    this.timestampLogger = new TimestampLogger(this.baseLogger);
    this.configBuilder = new ScheduleConfigBuilder();

    // configureaza lantul de validare (chain of responsibility)
    const teamHandler = new TeamValidationHandler();
    const shiftsHandler = new ShiftsValidationHandler();
    const constraintsHandler = new ConstraintsValidationHandler();

    teamHandler.setNext(shiftsHandler).setNext(constraintsHandler);
    this.validationChain = teamHandler;
  }

  // configureaza programul cu parametrii furnizati
  configureSchedule(config: {
    team: string[];
    days: Day[];
    shifts: Shift[];
    unavailableShifts: Record<string, Set<DayShift>>;
    desiredShifts: Record<string, Set<DayShift>>;
    undesiredShifts: Record<string, Set<DayShift>>;
    sundayWorker: string;
  }) {
    // construieste configuratia folosind builder pattern
    this.configBuilder
      .setTeam(config.team)
      .setDays(config.days)
      .setShifts(config.shifts)
      .setUnavailableShifts(config.unavailableShifts)
      .setDesiredShifts(config.desiredShifts)
      .setUndesiredShifts(config.undesiredShifts)
      .setSundayWorker(config.sundayWorker);

    const builtConfig = this.configBuilder.build();

    // valideaza configuratia folosind lantul de responsabilitate
    if (!this.validationChain.handle(builtConfig)) {
      this.notify("error", "validarea configuratiei a esuat");
      return;
    }

    // initializeaza managerul de program cu configuratia validata
    this.scheduleManager = new ScheduleManager(builtConfig);
    this.notify("scheduleConfigured", builtConfig);
  }

  generateAndLogSchedule() {
    if (!this.scheduleManager) {
      this.timestampLogger.error(
        "schedulemanager nu este initializat. configurati programul mai intai."
      );
      this.notify("error", "schedulemanager nu este initializat.");
      return;
    }

    this.timestampLogger.log("se genereaza programul...");
    const finalSchedule = this.scheduleManager.generateValidSchedule();

    if (!finalSchedule) {
      this.timestampLogger.error("nu s-a putut genera un program valid.");
      this.notify("error", "nu s-a putut genera un program valid.");
    } else {
      this.timestampLogger.log("programul final:");
      this.scheduleManager.printSchedule(finalSchedule);

      this.notify("scheduleGenerated", finalSchedule);
    }
  }

  generateAndExportSchedule() {
    if (!this.scheduleManager) {
      this.timestampLogger.error(
        "schedulemanager nu este initializat. configurati programul mai intai."
      );
      this.notify("error", "schedulemanager nu este initializat.");
      return;
    }

    this.timestampLogger.log("se genereaza programul...");
    const finalSchedule = this.scheduleManager.generateValidSchedule();

    if (!finalSchedule) {
      this.timestampLogger.error("nu s-a putut genera un program valid.");
      this.notify("error", "nu s-a putut genera un program valid.");
    } else {
      this.timestampLogger.log("programul final:");
      this.scheduleManager.printSchedule(finalSchedule);

      this.notify("scheduleGenerated", finalSchedule);
    }
  }

  // returneaza managerul de program pentru operatii avansate
  getScheduleManager(): ScheduleManager {
    if (!this.scheduleManager) {
      throw new Error(
        "schedulemanager nu este initializat. configurati programul mai intai."
      );
    }
    return this.scheduleManager;
  }
}
