# Feedback Analytics Panel & Student 'My Feedback' Interactive Hub

An integrated feedback intelligence system featuring a Recharts analytics panel for Administrators and Coordinators, alongside a dedicated 'My Feedback' communication hub for students to track status workflows and post follow-up replies on their submitted issues.

> [!IMPORTANT] User Review & Critical Decisions
> - **Confirmed Feedback Analytics Filtering**: All-time metrics summary with live category and status filters.
> - **Confirmed Student Interaction**: Interactive conversation thread on the 'My Feedback' tab, enabling students to send follow-up replies to coordinator responses in addition to tracking status badges.

---

## 1. Overview & Core Concept

- **Feedback Analytics Panel (Admin & Coordinator)**: Provides real-time visual telemetry on student issues, feature requests, and concerns using Recharts. Features an interactive Bar Chart of issue categories (Bugs, Feature Requests, General Inquiries, Portal Complaints) and an interactive Pie Chart showing the distribution across lifecycle states (`Submitted`, `Under Review`, `In Progress`, `Resolved`, `Closed`).
- **Student 'My Feedback' Hub (Student Dashboard)**: A dedicated tab in the Student Dashboard displaying all past submissions with clean typographic metadata, color-coded workflow status badges, coordinator responses, and an interactive message reply input so students can provide further context or confirm resolution.
- **Unified Data Consistency**: Connects directly to `/api/feedback` with real-time state synchronization, CSV/PDF report downloads, and optimistic UI updates.

---

## 2. User Experience & Visual Design

### A. Admin & Coordinator Analytics Experience
1. **Interactive Metrics Overview**:
   - High-level KPI summary cards (Total Submissions, Open Issues, In Progress, Resolution Rate, Average Satisfaction Rating).
   - Category Bar Chart (`BarChart` from Recharts) with customized tooltips, grid lines, and responsive aspect containers.
   - Status Distribution Donut/Pie Chart (`PieChart` with `Cell` colors mapped to semantic workflow stages).
2. **Dynamic Filter Bar**:
   - Filter pills/segmented controls to toggle between categories and status scopes without page reloads.
   - Quick export buttons (`Download PDF`, `Export CSV`) reflecting currently filtered datasets.

### B. Student 'My Feedback' Hub Experience
1. **Status Scannability**:
   - Clear listing of student's past feedback items showing title, category, date submitted, and status badge:
     - `Submitted` (Cool Slate / Blue)
     - `Under Review` (Amber / Warning)
     - `In Progress` (Indigo / Primary)
     - `Resolved` (Emerald / Success)
     - `Closed` (Muted Neutral)
2. **Interactive Conversation Thread**:
   - Expandable ticket view revealing coordinator official responses and timestamps.
   - Follow-up message composer allowing students to post additional details or feedback directly to coordinators.
   - Direct "New Feedback" creation button opening a streamlined submission modal.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Recharts Visualization with Responsive Containers**
  - *Chosen Approach*: Implement SVG-based `ResponsiveContainer`, `BarChart`, and `PieChart` with custom accessible tooltips and theme-aware colors.
  - *Why*: Provides fluid resizing on desktop (1440px) and mobile without layout clipping or jitter.
  - *Alternatives Considered*: Canvas-based charts (harder to style with Tailwind tokens and less accessible).
- **Decision 2: Student Follow-Up Replies in Existing Feedback Data Structure**
  - *Chosen Approach*: Support an array of follow-up messages (`responses: [{ id, authorRole, authorName, message, timestamp }]`) within each feedback record while maintaining backward compatibility with single `response` strings.
  - *Why*: Enables real two-way dialogue without requiring migration to external comment schemas.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│                                                             │
│   ┌───────────────────────────┐ ┌─────────────────────────┐ │
│   │  Admin / Coordinator Hub  │ │    Student Dashboard    │ │
│   │                           │ │                         │ │
│   │  FeedbackAnalyticsPanel   │ │   MyFeedbackSection     │ │
│   │  - Recharts BarChart      │ │   - Status Badges       │ │
│   │  - Recharts PieChart      │ │   - Coordinator Notes   │ │
│   │  - CSV / PDF Export       │ │   - Follow-up Thread    │ │
│   └─────────────┬─────────────┘ └────────────┬────────────┘ │
└─────────────────┼────────────────────────────┼──────────────┘
                  │                            │
                  ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Server (/api/feedback)              │
│                                                             │
│   GET  /api/feedback         -> Fetch all feedback records   │
│   POST /api/feedback         -> Create student feedback     │
│   POST /api/feedback/:id/reply -> Student follow-up reply   │
│   PUT  /api/feedback/:id/status -> Status & coordinator note │
│   GET  /api/feedback/export/csv -> Sanitized CSV download   │
└─────────────────────────────────────────────────────────────┘
```

### Component & State Mapping
- `FeedbackAnalyticsPanel.tsx`: Accepts `feedbackList: FeedbackItem[]`, computes category counts and status frequency maps, and renders responsive Recharts diagrams with hover tooltips and CSV/PDF export actions.
- `MyFeedbackSection.tsx`: Filters feedback records to current logged-in student, displays card list with status badges, renders accordion thread with coordinator answers, and provides a follow-up reply textarea with POST handler to `/api/feedback/:id/reply`.
- `server.ts`: In-memory persistent feedback array with helper handlers for `/api/feedback/:id/reply`, `/api/feedback/:id/status`, and safe CSV/PDF generation.
