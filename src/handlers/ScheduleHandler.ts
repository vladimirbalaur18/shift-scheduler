// implementarea pattern-ului chain of responsibility pentru validarea configuratiei programului

import { ScheduleConfig } from "../types";

// interfata de baza pentru handleri in lantul de responsabilitate
export interface ScheduleHandler {
  // seteaza urmatorul handler din lant
  setNext(handler: ScheduleHandler): ScheduleHandler;
  // proceseaza configuratia si o trimite mai departe in lant
  handle(config: ScheduleConfig): boolean;
}

// clasa abstracta de baza pentru toti handlerii
export abstract class BaseScheduleHandler implements ScheduleHandler {
  // referinta catre urmatorul handler din lant
  private nextHandler: ScheduleHandler | null = null;

  // conecteaza handlerul curent cu urmatorul
  setNext(handler: ScheduleHandler): ScheduleHandler {
    this.nextHandler = handler;
    return handler;
  }

  handle(config: ScheduleConfig): boolean {
    if (this.nextHandler) {
      return this.nextHandler.handle(config);
    }
    return true;
  }
}
