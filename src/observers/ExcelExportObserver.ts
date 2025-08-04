import { Observer } from "./Observer";
import { ScheduleManager } from "../ScheduleManager";
import * as Excel from "exceljs";
import { Day, Shift, WeekSchedule as Schedule } from "../types";

class ExcelExportObserver implements Observer {
  private readonly filePath = "src/resources/ScheduleLatest.xlsx";
  private readonly sheetName = "Sheet1"; // Should match the actual sheet name in the template
  private triggers: {
    exportOnEvent: string;
  };

  constructor(triggers: { exportOnEvent: string }) {
    this.triggers = triggers;
  }

  async update(event: string, data?: any): Promise<void> {
    if (event === this.triggers.exportOnEvent && data) {
      try {
        await this.exportToExcel(data);
        console.log("Schedule successfully exported to Excel.");
      } catch (error) {
        console.error("Failed to export schedule to Excel:", error);
      }
    }
  }

  private async exportToExcel(schedule: Schedule): Promise<void> {
    const workbook = new Excel.Workbook();
    try {
      await workbook.xlsx.readFile(this.filePath);
    } catch (error) {
      console.error(
        `Error reading the Excel template from ${this.filePath}. Make sure the file exists.`
      );
      // If the file does not exist, we can create it with a default structure
      // For now, we will stop the execution if the template is not found
      return;
    }

    const worksheet = workbook.getWorksheet(this.sheetName);
    if (!worksheet) {
      console.error(
        `Worksheet with name "${this.sheetName}" not found in the Excel file.`
      );
      return;
    }

    const today = new Date();
    const upcomingSunday = new Date(today);
    upcomingSunday.setHours(12, 0, 0, 0);
    // Always get the upcoming Sunday (not today, even if today is Sunday)
    upcomingSunday.setDate(
      today.getDate() + (7 - today.getDay() === 0 ? 7 : 7 - today.getDay())
    );

    const startDate = upcomingSunday;
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = `${
        currentDate.getMonth() + 1
      }/${currentDate.getDate()}/${currentDate.getFullYear()}`;
      worksheet.getCell(17, 3 + i).value = dateString;
    }

    // Clear existing data (optional, depends on whether we want to overwrite or append)
    // This example assumes overwriting the relevant cells
    // Note: Adjust the rows and columns based on your template's structure
    for (let i = 18; i <= 26; i++) {
      for (let j = 3; j <= 9; j++) {
        // Corresponds to columns C to I
        const cell = worksheet.getCell(i, j);
        cell.value = null;
      }
    }

    const days: Day[] = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const shifts: Shift[] = ["Morning", "Evening", "Night"];

    // Mapping from your screenshot
    // This needs to be precise
    const dayToColumn: Record<Day, number> = {
      Sunday: 3, // C
      Monday: 4, // D
      Tuesday: 5, // E
      Wednesday: 6, // F
      Thursday: 7, // G
      Friday: 8, // H
      Saturday: 9, // I
    };

    const shiftToRow: Record<Shift, number> = {
      Morning: 18, // This row seems to span from 18 to 20
      Evening: 21, // Spans 21 to 23
      Night: 24, // Spans 24 to 26
    };

    for (const day of days) {
      for (const shift of shifts) {
        const assignment = schedule[day]?.[shift];
        if (assignment) {
          const col = dayToColumn[day];
          const row = shiftToRow[shift];
          // We are placing the name in the first row of the shift block
          worksheet.getCell(row, col).value = assignment;
        }
      }
    }

    await workbook.xlsx.writeFile(this.filePath);
  }
}

export { ExcelExportObserver };
