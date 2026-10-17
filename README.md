# 🌿 Herd Health Hub
### 🐄 Cattle Health Management System

**Smarter livestock care. Healthier herds. Better decisions.**

A full-stack cattle health management platform designed to connect farmers and veterinarians through animal registration, medical records, disease diagnosis, medication tracking, and follow-up management.

<p align="center">
  <a href="https://herd-healer-pro.lovable.app">
    <img src="https://img.shields.io/badge/🚀_LIVE_DEMO-Visit_Herd_Health_Hub-16A34A?style=for-the-badge" alt="Live Demo"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-Type_Safe-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Status-Project_Demo-22C55E?style=flat-square"/>
</p>

---

## 🌱 Project Overview

Herd Health Hub is designed to streamline cattle healthcare by bringing animal records, veterinary consultations, disease information, medication details, and follow-up tracking into one centralised platform.

The system provides role-based portals for farmers and veterinarians, helping organise health information and make animal medical histories easier to access.

## ✨ Key Features

| 🌟 Feature | 📝 Description |
|:--|:--|
| 👨‍🌾 Farmer Portal | Register cattle, manage animal profiles, and review health records. |
| 🩺 Veterinary Portal | Search animals, record consultations, and update diagnoses. |
| 🐄 Animal Management | Maintain animal identification, breed, age, sex, temperature, and milk-production status. |
| 🔬 Disease Records | Record symptoms, disease diagnoses, and previous disease history. |
| 💊 Medication Tracking | Document prescribed medication and continuing treatment. |
| 🔔 Follow-up Management | Highlight animals requiring follow-up care. |
| 💉 Vaccination Tracking | Display vaccination status and upcoming vaccination needs where supported by the implementation. |
| 📊 Dashboards | Present animal summaries, veterinary cases, alerts, and health information. |
| 🔐 Role-Based Access | Separate farmer and veterinary workflows with authentication. |
| 📱 Responsive Interface | Agriculture-inspired green UI designed for different screen sizes. |

## 👥 User Roles

### 👨‍🌾 Farmer
- Register new animals and maintain animal information.
- View registered animals and their medical history.
- Review symptoms, diagnoses, medication, and follow-up status.
- Monitor relevant health alerts and vaccination information.

### 🩺 Veterinarian
- Search for an animal using its ID.
- Review the combined animal medical record.
- Record symptoms, predicted diagnosis, and veterinary diagnosis.
- Prescribe medication and update continuing-treatment and follow-up information.

### 🛡️ Administrator *(if enabled)*
- Manage farmer and veterinarian accounts.
- View animal records.
- Review system-wide reports and analytics.

## 🗄️ Database Design

The requested data model contains three principal tables linked through `animal_id`.

```text
                  ┌──────────────────────┐
                  │     Master Table     │
                  │----------------------│
                  │ animal_id (PK)       │
                  │ animal information   │
                  │ disease diagnosis    │
                  │ follow-up / medicine │
                  │ vet_id               │
                  └──────────┬───────────┘
                             │
                  ┌──────────┴───────────┐
                  │                      │
        ┌─────────▼────────┐   ┌─────────▼─────────┐
        │   Farmer Entry   │   │     Vet Entry     │
        │------------------│   │-------------------│
        │ animal_id (FK)   │   │ animal_id (FK)    │
        │ animal details   │   │ symptoms          │
        │ health history   │   │ predicted diagnosis│
        │ reported symptoms│   │ vet diagnosis      │
        └──────────────────┘   │ medication details │
                               └────────────────────┘
```

### 📋 Master Table
Stores core animal information, body temperature, symptoms, disease diagnosis, follow-up status, prescribed medication, farmer name, and veterinarian ID.

### 🧑‍🌾 Farmer Entry
Stores farmer-reported animal details, previous disease history, milk-production status, and symptoms.

### 🩺 Vet Entry
Stores veterinary examination details, predicted and confirmed diagnoses, continuing-medication status, and prescribed medication.

## 🛠️ Technology Stack

| Layer | Technologies |
|:--|:--|
| 🎨 Frontend | React, TypeScript, Vite |
| 🧩 UI | Tailwind CSS, shadcn/ui |
| 📈 Visualisation | Recharts |
| 🗃️ Database | PostgreSQL |
| 🔐 Authentication | Supabase Auth |
| ⚡ Backend Services | Supabase Edge Functions |
| 🔄 Data Updates | Supabase Realtime |
| ☁️ Development & Hosting | Lovable Cloud |

*Technology descriptions should be adjusted to match the final repository and deployed implementation.*

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Git
- Access to the required backend environment variables and services

### 1. Clone the Repository

```bash
git clone https://github.com/Aditya-Nair-Git/Herd_Health_Hub.git
cd Herd_Health_Hub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file using the environment-variable names documented by the project. For example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Use the actual variable names required by the codebase. Never commit real credentials or privileged service-role keys.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## 🖥️ Live Application

Explore the deployed application:

**[🌿 Open Herd Health Hub](https://herd-healer-pro.lovable.app)**

## 🔮 Future Improvements

- 📍 Geospatial animal-health monitoring.
- 📊 Advanced veterinary and disease-trend analytics.
- 🔔 Automated follow-up and vaccination reminders.
- 📱 Improved mobile-first workflows.
- 📄 Exportable animal medical reports.
- 🧠 Further evaluation of disease decision-support methods.

## 🎯 Project Goal

To make cattle health information easier to organise and access, support veterinary workflows, and help farmers maintain structured records for better livestock care.

---

<p align="center">
  <b>🌿 Herd Health Hub — Supporting healthier herds through connected animal healthcare. 🐄</b>
</p>
