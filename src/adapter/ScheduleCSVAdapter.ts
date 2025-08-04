// implementarea pattern-ului adapter pentru conversia programului in format csv

import { ScheduleManager } from "../ScheduleManager";
import { writeFileSync } from "fs";
import { WeekSchedule } from "../types";

export class ScheduleCSVAdapter {
  generateCSV(schedule: WeekSchedule): void {
    // definirea antetului fisierului csv
    const headers = ["Day", "Shift", "Worker"];
    const rows: string[] = [headers.join(",")];

    // convertirea datelor in format csv
    for (const [day, shifts] of Object.entries(schedule)) {
      Object.entries(shifts).forEach(([shift, worker]) => {
        rows.push(`${day},${shift},${worker}`);
      });
    }

    // crearea continutului final si salvarea in fisier
    const csvContent = rows.join("\n");
    writeFileSync("src/resources/schedule.csv", csvContent);
    console.log("program exportat in schedule.csv");
  }
}
