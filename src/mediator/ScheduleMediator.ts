// Implementarea pattern-ului Mediator pentru coordonarea componentelor de programare a turelor

import { Day, Shift, DayShift, WeekSchedule } from "../types";
import { ShiftAssignment } from "../ShiftAssignment";
import { ShiftConstraints } from "../ShiftConstraints";
import { ShiftPreferences } from "../ShiftPreferences";

// Interfața mediatorului care definește metodele de comunicare între componente
export interface ScheduleMediator {
  // Notifică despre asignarea unei ture
  notifyShiftAssignment(member: string, dayIndex: number, shift: Shift): void;
  // Verifică disponibilitatea unui membru pentru o tură
  checkMemberAvailability(
    member: string,
    dayIndex: number,
    shift: Shift
  ): boolean;
  // Obține membrii grupați după preferințele lor pentru o tură
  getMembersByPreference(dayShiftKey: DayShift): {
    desiredMembers: string[];
    neutralMembers: string[];
    undesiredMembers: string[];
  };
  // Anulează asignarea unei ture
  undoShiftAssignment(member: string, dayIndex: number, shift: Shift): void;
  // Înregistrează componentele în mediator
  registerComponent(
    component: "assignment" | "constraints" | "preferences",
    instance: any
  ): void;
}

// Implementarea concretă a mediatorului
export class ConcreteScheduleMediator implements ScheduleMediator {
  // Referințe către componentele sistemului
  private shiftAssignment: ShiftAssignment | null = null;
  private shiftConstraints: ShiftConstraints | null = null;
  private shiftPreferences: ShiftPreferences | null = null;

  // Înregistrează componentele în mediator
  registerComponent(
    component: "assignment" | "constraints" | "preferences",
    instance: any
  ): void {
    switch (component) {
      case "assignment":
        this.shiftAssignment = instance;
        break;
      case "constraints":
        this.shiftConstraints = instance;
        break;
      case "preferences":
        this.shiftPreferences = instance;
        break;
    }
  }

  // Notifică despre asignarea unei ture și actualizează starea constrângerilor
  notifyShiftAssignment(member: string, dayIndex: number, shift: Shift): void {
    if (!this.shiftConstraints)
      throw new Error("ShiftConstraints nu este înregistrat");
    this.shiftConstraints.isMemberAvailable(member, dayIndex, shift);
  }

  checkMemberAvailability(
    member: string,
    dayIndex: number,
    shift: Shift
  ): boolean {
    if (!this.shiftConstraints)
      throw new Error("ShiftConstraints nu este înregistrat");
    return this.shiftConstraints.isMemberAvailable(member, dayIndex, shift);
  }

  getMembersByPreference(dayShiftKey: DayShift): {
    desiredMembers: string[];
    neutralMembers: string[];
    undesiredMembers: string[];
  } {
    if (!this.shiftPreferences)
      throw new Error("ShiftPreferences nu este înregistrat");
    return this.shiftPreferences.getMembersBySpecialDesires(
      dayShiftKey,
      (member) => {
        const [day, shift] = dayShiftKey.split("-");
        const dayIndex = this.getDayIndex(day);
        return this.checkMemberAvailability(member, dayIndex, shift as Shift);
      }
    );
  }

  undoShiftAssignment(member: string, dayIndex: number, shift: Shift): void {
    if (!this.shiftConstraints)
      throw new Error("ShiftConstraints nu este înregistrat");
    this.shiftConstraints.isMemberAvailable(member, dayIndex, shift);
  }

  private getDayIndex(day: string): number {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days.indexOf(day);
  }
}
