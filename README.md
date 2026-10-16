# Herd Health Hub

Here is a single, clean prompt you can paste into Lovable to generate the full end-to-end app:

---

Build a full-stack web application called **Cattle Health Management System** with a clean green agriculture-themed UI.

The system has 3 user roles: **Farmer, Vet, Admin**.

### Database (use exactly these 3 tables and fields)

**Master Table**

* animal_id (PK)
* species
* breed
* sex
* age
* body_temperature
* milk_production_status
* previous_disease_history
* symptom_1
* symptom_2
* symptom_3
* disease_diagnosis
* follow_up (Yes/No)
* prescribed_medication (medicine name, not Yes/No)
* farmer_name
* vet_id

**Vet Entry**

* animal_id (FK)
* species
* body_temperature
* symptom_1
* symptom_2
* symptom_3
* predicted_diagnosis
* vet_diagnosis
* continuing_medication (Yes/No)
* vet_prescribed_medication (medicine name)

**Farmer Entry**

* animal_id (FK)
* species
* sex
* age
* milk_production_status
* previous_disease_history
* symptom_1
* symptom_2
* symptom_3

### Pages & Navigation

**Public**

* Home
* Login (Farmer / Vet)
* About

**Farmer Portal**

* Dashboard (summary, alerts, follow-ups, vaccination status)
* Register New Animal (form from Master + Farmer Entry)
* My Animals (list)
* Animal Profile (full history, symptoms, diagnosis, medications, follow-up status)

**Vet Portal**

* Vet Dashboard (today’s cases, follow-ups, continuing medication, vaccination due)
* Search Animal (by animal_id)
* Animal Medical Record (view all 3 tables joined)
* Add / Update Visit (fill Vet Entry, prescribe medication, set follow-up, mark continuing meds)

**Admin (optional)**

* Manage vets and farmers
* View all records
* Reports & analytics

### Functional Requirements

* Authentication for Farmer and Vet
* CRUD for animals
* Join Master, Vet, and Farmer tables on animal_id
* Highlight follow-up due and continuing medication
* Show vaccination and disease history
* Responsive green themed UI (like an agriculture health system)
* Use cards, tables, and dashboards
* Include role-based navigation menus

Generate:

* Database schema
* API endpoints
* Backend logic
* Frontend pages
* Dashboard UI
* Authentication
* Seed data
* Deployment ready structure

Build it as a complete production-ready web app.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://herd-healer-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a40e270d-be5e-4f44-8980-246948e98574).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
