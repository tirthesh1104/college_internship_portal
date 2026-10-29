# MITCORER IPTS — System Requirements Specification

## 1. System Overview
The **Internship Performance Tracking System (IPTS) / MITCORER Internship Hub** is an integrated web application for MAEER’s MIT College of Railway Engineering and Research, Barshi. It digitizes the entire student internship lifecycle, coordinator evaluations, administrative governance, accreditation compliance, and community learning.

## 2. Core Stakeholders & Roles
1. **Student**:
   - Self-registration with email validation, roll number uniqueness, department, and division.
   - Explore verified domestic & international opportunities, submit applications, upload offer letters.
   - Weekly progress report submissions with task summaries, technical skills, evidence links, GitHub repos.
   - Document uploads with 5MB validation (PDF, JPG, PNG) and secure storage.
   - Career passport, AI Assistant, team finder, community posts, leaderboard, points, and streak badges.
2. **Coordinator**:
   - Scoped departmental oversight (e.g. Tirthesh Gutte for Computer Science & Engineering).
   - Fast login via Secret Key (`Coord@123`).
   - Review and score weekly progress reports; assign improvement tasks and deadlines.
   - Conduct technical skill assessments; verify documents and compliance files.
   - Approve internship completions and sign off on completion certificates.
   - Monitor inactive students (no reports for 14 days).
3. **Administrator / Principal**:
   - Central institutional governance (Prof. Meghraj Chougoule).
   - Fast login via Secret Key (`Admin@123`).
   - Department-wide analytics, opportunity approvals, coordinator scoping.
   - 5 Recharts visualizations (Enrollment by Year, Discipline Distribution, Internship Status Donut, Domain Breakdown, 8-Week Submission Trends).
   - 10-row live preview with accredited CSV exports for Students, Internships, Reports, and Opportunities.
   - Complete system security and audit trail.

## 3. UI/UX & Theming
- **Global Light / Dark Theme Toggle**: Prominently mounted at the top-right of the main header, persisting across sessions in `localStorage`.
- **Official Institutional Branding**: High-resolution "Internship and Technical Opportunities" badge logo displayed across public hero, headers, sidebars, and authentication cards.
- **Zero Pill Discipline & Clean Typography**: Inter typeface, clear visual hierarchy, accessible contrast.
