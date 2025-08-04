// implementarea pattern-ului observer pentru notificarea schimbarilor in program

// interfata pentru observatori - defineste metoda de actualizare
export interface Observer {
  update(event: string, data?: any): void;
}

// clasa subiect - gestioneaza si notifica observatorii
export class Subject {
  // lista de observatori inregistrati
  private observers: Observer[] = [];

  addObserver(observer: Observer): void {
    this.observers.push(observer);
  }

  removeObserver(observer: Observer): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  // notifica toti observatorii despre un eveniment
  notify(event: string, data?: any): void {
    this.observers.forEach((observer) => observer.update(event, data));
  }
}
