<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=059669&center=true&vCenter=true&width=600&lines=Finonest+India+Pvt+Ltd;Loan+Management+System;Built+by+acelion55+%26+sparshjain28;Full-Stack+Fintech+Platform" alt="Typing SVG" />
</p>

<div align="center">

[![Built By](https://img.shields.io/badge/Built%20By-acelion55%20%26%20sparshjain28-059669?style=flat-square)](https://github.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

# Finonest India Pvt Ltd — Loan Management System (Frontend)

A comprehensive, enterprise-grade loan management platform built for **Finonest India Pvt Ltd** by **acelion55** and **sparshjain28**. This frontend serves as the complete UI for managing loans, leads, users, payments, reports, and operations — all in one unified dashboard.

---

## ✨ Features & Modules

### 🔐 Authentication & Onboarding
| Page | Description |
|------|-------------|
| **Login** | Two-step login with phone + 4-digit MPIN. PWA standalone detection, remember-me, error handling. |
| **Signup** | Multi-step registration: PAN verification → Aadhaar OTP → Bank account → Personal details + MPIN setup. |
| **Forgot MPIN** | 3-step reset: enter phone → send OTP → set new MPIN. |
| **Profile Setup** | First-time onboarding: PAN, name, email, DOB, gender, address, refer code entry. |
| **User Profile** | Full profile management: edit phone, verify PAN/Aadhaar with OTP, bank verification, photo upload. |
| **Operations Login** | Separate login for operations team, redirects to `/ops/dashboard`. |

### 📊 Dashboards (Role-Based)
| Page | Description |
|------|-------------|
| **Main Dashboard** | Admin/sales dashboard: area/bar/pie charts, timeline filter, stage funnel, KPI stats, PDF export, share. |
| **Accountant Dashboard** | Total disbursed, pending approvals, pending NACH, recent payments chart. |
| **Operations Dashboard** | PDD buckets (1-30, 31-45, 46-60, 61-90, 90+ days), aging analysis, loan list grouped by bucket. |
| **Customer Dashboard** | Customer-facing loan stage tracker with application details and documents. |
| **Customer Portal** | Public application tracker: enter mobile → OTP → view status. |

### 💰 Loan Management
| Page | Description |
|------|-------------|
| **Loans List** | Search, filters, stage timer, bulk actions, share/export, document preview, WhatsApp share. |
| **Create Loan** | Multi-field form: customer/vehicle/financier/payment details, document uploads, RC auto-fetch, EMI calculator. |
| **Loan Detail** | Full view: applicant info, vehicle details, documents, stage timeline, CIBIL report, status update, delete, convert to lead. |
| **Edit Loan** | Edit all loan fields, RC re-fetch, assignment modal, optional co-applicant/guarantor. |
| **Loan Login Details** | Post-creation: assign lender, sales manager, location, remarks. |
| **Loan Payment Request** | Raise payment requests: bill/map requests, payment types, UTR entry. |
| **Offline Disbursement** | Offline form: customer/vehicle/insurance/bank details, document uploads, bulk Excel import. |

### 👥 Lead Management
| Page | Description |
|------|-------------|
| **Leads List** | Search, filters, stage timer, application stage modal, mobile workflow, bulk delete by sourcing person. |
| **Add Lead** | Multi-step wizard: customer/vehicle/loan details, credit report summary, link loan finder, document upload. |
| **Lead Detail** | Customer info, documents, CIBIL report, application stages, clone lead, financier re-apply. |
| **Edit Lead** | Edit existing lead fields. |

### 👤 User & Team Management
| Page | Description |
|------|-------------|
| **User Management** | Full user CRUD: hierarchy view, approve/reject/archive/inactivate/restore, bulk approve, generate refer codes. |
| **Team Users** | Team hierarchy tree: add/remove members, restore users, create users under manager. |

### 🏦 Master Data Management
| Page | Description |
|------|-------------|
| **Banks / NBFC** | CRUD with branches, Excel import, search. |
| **Brokers / DSA** | CRUD with search and loan association. |
| **Branch Management** | CRUD with Google Maps autocomplete, role assignment. |

### 💼 Commissions
| Page | Description |
|------|-------------|
| **Commission List** | Filter by status (paid/pending/on-hold), CSV export. |

### 📈 Reports & Analytics
| Page | Description |
|------|-------------|
| **Reports** | Multi-tab: overview, datewise, teamwise, lenderwise, stagewise with bar/pie/line charts, CSV export. |
| **Reports Page** | Funnel chart, bank/manager/executive drill-down. |
| **Credit Report Viewer** | CIBIL/credit report: fetch by customer ID, display score/details, PDF download. |

### ⚙️ Operations Tools
| Page | Description |
|------|-------------|
| **Operations Leads** | Ops team loan list with PDD tracking, map bill numbers to loans, request payments. |
| **Ops API Tools** | RC lookup, challan lookup, RC-to-mobile, mobile-to-RC, Vahan status with history panel. |

### 🔐 Permissions & Configuration
| Page | Description |
|------|-------------|
| **Field Permissions** | Role-based field-level visibility toggles per module and stage. |
| **Dashboard Permissions** | Page-level access control: which roles can access which pages. |
| **System Config** | Feature toggles: lead timer, document upload, stage rules, and global settings. |
| **Application Stage Management** | Admin view: list loans with stages, update stages, stage statistics. |

### 📂 Accountant Portal
| Page | Description |
|------|-------------|
| **Accountant Dashboard** | Stats overview. |
| **Folio Accounts** | Search, create, delete folios linked to loans and lenders. |
| **Folio Details** | Detailed view of a single folio account. |
| **Folio Ledger** | Loan payment ledger for a specific folio/loan. |
| **Account Payments** | Payment entries: create, edit ledger entries, filter by status/date. |
| **Bank Accounts** | Bank account CRUD. |
| **Disbursement Ledger** | Disbursement ledger with date range and search filters, CSV export. |

### 🚗 Vehicle & Lender Services
| Page | Description |
|------|-------------|
| **Find My Lender** | Find nearby lenders/branches via Google Maps autocomplete, radius search, route mapping. |
| **Find My Car Value** | Estimate car market value by make/model/year using external API. |
| **Link Loan Finder** | Find existing auto loans from bureau data for lead qualification. |
| **Admin Nearby Branches** | Find nearby lender branches with map and export. |
| **RC Template** | Generate and download RC template PDF for a loan. |
| **RC Template Viewer** | Public RC template viewer with QR code, renders shared RC data. |

### 📞 Calling Module
| Page | Description |
|------|-------------|
| **Calling Management** | Statistics, configuration, team management, daily summary, team leaderboard, approval OTP flow. |

### 📋 Other Modules
| Page | Description |
|------|-------------|
| **Insurance Module** | Policy management: list, create. |
| **Expense Management** | Expense CRUD with approval/rejection workflow, user filter. |
| **RC Limits** | DSA/Accountant/Admin views, bank statement import, balance tracking. |
| **Payout Management** | DSA payout management. |
| **Credit Reports** | Standalone credit report viewer with advanced filters (CIBIL score, address, account status, lenders, DPD). |
| **Account Aggregator** | AA integration: initiate sessions, fetch reports, manage consent. |
| **Audit Logs** | View and purge audit trails with filters (user, action, date range). |
| **EMI Calculator** | Loan EMI calculator with sliders for amount, rate, tenure. |
| **API Usage** | Admin: RC verification credits inventory, remaining credits, status. |
| **API Call Logs** | Admin: filter by API type, source, date range; per-user usage stats. |

---

## 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite 5** | Build Tool |
| **Tailwind CSS 3** | Styling |
| **Radix UI / Shadcn/ui** | Component Library |
| **TanStack React Query** | Server State Management |
| **React Router v6** | Routing (lazy-loaded) |
| **React Hook Form + Zod** | Forms & Validation |
| **Recharts** | Charts & Analytics |
| **Axios** | HTTP Client |
| **Lucide React** | Icons |
| **Sonner** | Toast Notifications |

---

## 🛠️ Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 🌐 Environment Variables

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🐳 Docker Deployment

```bash
# Build image
docker build -t finonest-frontend .

# Run container
docker run -p 80:80 finonest-frontend
```

---

## 📁 Project Structure

```
src/
├── pages/              # 50+ page components (routed)
│   ├── Login.tsx
│   ├── Loans.tsx
│   ├── Dashboard.tsx
│   ├── OperationsLeads.tsx
│   ├── AccountantDashboard.tsx
│   └── ...
├── components/         # 60+ reusable components
│   ├── ui/            # 40+ shadcn UI primitives
│   ├── DashboardLayout.tsx
│   ├── LoanPayments.tsx
│   ├── DocumentUpload.tsx
│   └── ...
├── contexts/          # AuthContext, DashboardContext
├── hooks/             # useSwipeGesture, useScrollAnimation, useReport, etc.
├── lib/               # api client, utils, auth helpers
└── ...
```

---

## 👨‍💻 Built By

- **acelion55**
- **sparshjain28**

---

&copy; 2026 Finonest India Pvt Ltd. All rights reserved.
