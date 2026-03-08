# Barangay Bayabas Appointment System

A web-based appointment and document request management system for Barangay Bayabas, Matina, Davao City. Built as a Final Project for CCE106.

> **Note:** Barangay Bayabas is a fictional barangay used for the purposes of this academic project. The system is fully functional and demonstrates a real-world barangay management workflow.

---

## Overview

The Barangay Bayabas Appointment System is a full-stack web and mobile application that allows residents to book appointments, request barangay documents, and interact with barangay staff and administrators — all online. The system reduces the need for walk-in visits and streamlines barangay operations through a role-based platform.

---

## Features

### Residents
- Register and log in securely
- Book appointments for barangay services
- Request barangay documents (e.g., Barangay Clearance, Certificate of Indigency)
- Track appointment and request status in real time
- Upload a valid ID and face photo for identity verification
- Chat with an AI-powered assistant (Gemini) for barangay-related questions
- Submit feedback on services

### Staff
- View and manage resident appointments
- Process document requests
- Update appointment schedules and availability
- Manage resident records

### Admin
- Full access to all staff features
- Manage staff accounts
- View system-wide reports and announcements
- Archive and restore records
- Configure barangay services and schedules

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (Web) | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| Frontend (Mobile) | Expo (React Native), TypeScript |
| Backend / API | Next.js Server Actions & API Routes |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI Chatbot | Google Gemini API (`@google/genai`) |
| Email | Nodemailer (SMTP) |
| Containerization | Docker (multi-stage build, standalone output) |
| Deployment | Vercel (web), Expo Go / EAS (mobile) |

---

## Project Structure

```
barangay-appointment-system/
├── apps/
│   ├── web/          # Next.js 16 web application
│   │   ├── app/      # App Router pages (admin, staff, resident, public)
│   │   ├── actions/  # Server Actions
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   └── mobile/       # Expo React Native mobile app
│       ├── app/      # File-based routing (Expo Router)
│       ├── components/
│       ├── services/
│       └── providers/
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project
- A [Google Gemini API](https://ai.google.dev) key
- An SMTP email account (e.g. Gmail App Password)

### Web App (Next.js)

```bash
cd apps/web
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mobile App (Expo)

```bash
cd apps/mobile
npm install
npx expo start
```

---

## User Roles

| Role | Access |
|---|---|
| **Resident** | Book appointments, request documents, view status, use chatbot |
| **Staff** | Manage appointments, process requests, view residents |
| **Admin** | Full system access including staff management and reports |

---

## Academic Context

This project was developed as a final requirement for **CCE106** (Computer Science course). It demonstrates practical full-stack web and mobile development, covering authentication, role-based access control, real-time data, AI integration, and containerization.

The "Barangay Bayabas" name and all barangay details used in this project are fictional and created solely for academic purposes.

