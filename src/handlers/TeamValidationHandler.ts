// handler pentru validarea configuratiei echipei in lantul de responsabilitate

import { ScheduleConfig } from "../types";
import { BaseScheduleHandler } from "./ScheduleHandler";
import { Logger } from "../logger";

export class TeamValidationHandler extends BaseScheduleHandler {
  private logger = Logger.getInstance();

  // valideaza configuratia echipei
  handle(config: ScheduleConfig): boolean {
    // verifica daca exista membri in echipa
    if (!config.team || config.team.length === 0) {
      this.logger.error(
        "configuratia echipei este invalida: echipa nu poate fi goala"
      );
      return false;
    }

    // verifica daca angajatul desemnat pentru duminica face parte din echipa
    if (!config.team.includes(config.sundayWorker)) {
      this.logger.error(
        "configuratia echipei este invalida: angajatul pentru duminica trebuie sa fie membru al echipei"
      );
      return false;
    }

    // trimite configuratia catre urmatorul handler din lant
    return super.handle(config);
  }
}
