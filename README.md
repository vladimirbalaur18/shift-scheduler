
# 🕒 Shift Scheduler

A **Node.js utility** that intelligently generates and exports team shift schedules in `.csv` or Excel format, while taking into account:

* **Member availability**
* **Preferred / undesired shift types for each member**
* **Unavailable / vacation days**
* **System-defined scheduling constraints**

This tool is designed to **distribute shifts fairly** and **automatically resolve conflicts**, making workforce planning effortless and scalable without requiring manual involvement.

---

## 🚀 Features

* ✅ Smart shift assignment based on:

  * Availability
  * Preferred shifts (e.g., morning, evening, night)
  * Undesired shifts of each member
  * Shift conflicts and constraints
  * Days off and vacations
* 📊 Export to:

  * `.csv`
  * `.xlsx` (Excel)
* ♻️ Fair distribution logic: no member gets too many or too few shifts
* 🔧 Customizable rules (e.g., max shifts/day, adding / removing members, number of consecutive night shifts)
* 🧠 Easily extendable logic via modular architecture

---

## 📦 Installation

```bash
git clone https://github.com/vladimirbalaur18/shift-scheduler.git
cd shift-scheduler
npm install
```

---

## 🛠 Usage

### 1. Define your team and preferences

In index.ts, make sure to adjust the config to the ScheduleFacade as follows

```json
{
  "team": ["Vladimir", "Daniel", "Dan", "Cristin", "Alexandru"],
  "days": [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],
  "shifts": ["Morning", "Evening", "Night"],
  "unavailableShifts": {
    "Alexandru": [],
    "Vladimir": [],
    "Cristin": [],
    "Daniel": [],
    "Dan": [
      "Sunday-Night",
      "Friday-Night",
      "Saturday-Morning",
      "Saturday-Evening"
    ]
  },
  "desiredShifts": {
    "Alexandru": [],
    "Vladimir": [],
    "Cristin": [],
    "Daniel": [],
    "Dan": []
  },
  "undesiredShifts": {
    "Alexandru": [],
    "Vladimir": [
      "Sunday-Night",
      "Monday-Night",
      "Tuesday-Night",
      "Wednesday-Night",
      "Thursday-Night",
      "Friday-Night",
      "Saturday-Night"
    ],
    "Cristin": [],
    "Daniel": [],
    "Dan": [
      "Monday-Morning",
      "Tuesday-Morning",
      "Wednesday-Morning",
      "Thursday-Morning",
      "Friday-Morning"
    ]
  },
  "vacationDays": {
    "Vladimir": [],
    "Cristin": [],
    "Daniel": [],
    "Dan": [],
    "Alexandru": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ]
  },
  "sundayWorker": "Alexandru"
}

```

### 2. Generate schedule

```bash
npm run start
```

Supported output formats: `.csv` or `.xlsx`


---

## ✨ Example Output

| Shift     | Monday | Tuesday  | Wednesday |
| --------- | ------- | ------- | -----     |
| Morning   | Alice   | Bob     | —     |
| Evening   | Alice   | —       | —     |
| Night     | —       | Bob     | —     |

Exported as `.xlsx` or `.csv`.

---

## 📌 Roadmap
* [ ] Extract the configuration to a separate file
* [ ] Add web UI for easier input
* [ ] Weekly rotation planner
* [ ] Support time-based rather than shift-based scheduling

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you’d like to change.

---

## 📄 License

MIT License. Free to use, modify, and distribute.

---

Let me know if you want to include examples, tests, or diagrams. I can also help generate CLI help commands or improve argument parsing UX.
