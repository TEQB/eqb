# UniPastQ / EQB — All Features (Plain Language)

> A community-driven past exam questions archive for university students.
> Students register with their university email, upload and download past questions, and earn access by contributing.

---

## How It Works — A Self-Sustaining System

This platform is designed to be **self-sustaining**: it grows and thrives entirely through student contributions.

**The core idea:** Every student benefits from past questions, but past questions only exist if students share them. So the platform enforces a simple rule — *if you want to access questions, you must also contribute questions.*

### The Contribution Cycle

1. A student joins the platform and gets a **grace period** to explore.
2. After that period, if they haven't uploaded any past question papers, their access is **paused** (they see an "Upload Wall").
3. To regain access, they upload at least one past exam paper from their collection.
4. Their upload is **AI-moderated** to ensure quality, then published for everyone.
5. They can now browse and download freely — until the next obligation window expires.
6. This cycle repeats: **to keep accessing, keep contributing.**

### Why This Works

- **No central effort required:** The admin team doesn't need to source question papers. Students provide them organically.
- **Scales with users:** The more students join, the more questions get uploaded, making the platform more valuable.
- **Quality through moderation:** AI checks every upload for relevance and quality, so the archive stays useful.
- **Fairness:** Every student who benefits also contributes — no freeloading.

In short, the platform is built to **run itself**. The admin panel exists mainly for oversight and edge cases, but the day-to-day growth is driven entirely by the student community.

---

## 1. Public / Authentication Features

### Landing Page
- Anyone can visit the landing page and search for courses by name or course code.
- No login required to browse course listings or search.

### Registration (Sign Up)
- Students register with their **university email address** (e.g. `@my365.dmu.ac.uk`, `@stu.uk.edu.ng`).
- They select their **faculty**, **programme of study**, and **current level** (100–500/600).
- After submitting the registration form, a **verification email** is sent to their university inbox.
- The account is not active until the email is verified.

### Email Verification
- Students click a link in the verification email.
- They are taken to a "Verify Email" page where they enter their email and the verification code sent to them.

### Set Password
- After verification, students are prompted to **set a password** for their account.
- Passwords must meet minimum security requirements.

### Login
- Registered students log in with their email and password.
- The system supports **"Remember Me"** for extended sessions.
- A **"Forgot Password"** flow allows password reset via email.

### Password Reset
- Students request a password reset by entering their email.
- A reset link/code is sent to their inbox.
- They can then set a new password.

---

## 2. Student Features (After Login)

### Dashboard
- Shows a **welcome message** with the student's name.
- Displays **quick stats**: how many questions uploaded, how many downloaded.
- Shows **recent activity**: latest questions viewed or uploaded.
- Displays the **upload obligation status** — whether they need to upload or not.

### Browse Courses
- Browse all available courses organised by **academic level** (100, 200, 300, 400, 500, etc.).
- Filter courses by **faculty** and **programme** using dropdown menus.
- Click a course card to view its questions.

### Course Detail Page
- Lists all questions (past exam papers) for a selected course.
- Each entry shows: course name, code, year, semester, type (exam/test), and number of pages.
- Results are **paginated** (e.g. 20 per page) with next/previous navigation.
- A search bar lets students search within the course's questions.

### View a Question (Past Exam Paper)
- Opens a dedicated page showing the full question details.
- **Inline preview** of the document/image using a custom viewer.
- Students can **download** the original file.
- They can **upvote/downvote** the question's usefulness.
- They can **rate** the question's quality (1–5 stars) and see the average rating.
- A **discussion section** lets students post comments and reply to others.
- The **approval status** (live, rejected) is visible to the student who uploaded it.

### Upload Questions
- Students upload past exam papers as **PDF or image files** (PNG, JPG, etc.).
- They select the **course**, **year**, **semester**, and **type** (exam, test, mid-semester, etc.).
- They can optionally add a title and description.
- **Upload limit**: a maximum number of uploads per day/week is enforced.
- After uploading, the file goes through **AI moderation** before it becomes visible to others.

### Upload Obligation / Upload Wall
- The system has a **"fair share" rule**: if a student has not uploaded any questions within a set time window (e.g. 30 days), their account is **locked**.
- When locked, the student cannot browse or download questions until they upload at least one.
- This is enforced by the **UploadWall** / **ObligationBanner** components.
- An exception page exists for when the obligation cannot be fulfilled (e.g. no matching courses).

### Explore Page
- Shows **recent uploads from other students** across all courses.
- Includes a **search bar** to find specific questions.
- Helps students discover new content.

### Feedback Form
- Students can submit **feedback, suggestions, or bug reports**.
- Feedback is sent to the admin team for review.

### Profile / Account Settings
- Students can **view and edit** their profile details (name, programme, level, etc.).
- They can see their **upload history** and **download history**.
- They can **change their password**.

---

## 3. AI Moderation System

### How Moderation Works
- Every uploaded question is automatically checked by an **AI content moderator** before being published.
- The system can use one of three AI providers: **Gemini** (Google), **Groq**, or **NVIDIA**.
- The moderator checks:
  - **Relevance**: Is the file actually about the selected course?
  - **Image clarity**: Are scanned images clear enough to read?
  - **Answer quality**: Does it look like a proper exam paper?
  - **Text quality**: Is the text readable and well-formed?
  - **Profanity / inappropriate content**: Does the file contain offensive material?
- Each check returns a score and explanation.

### Moderation Results
- **Auto-approved**: If all checks pass, the question goes live immediately.
- **Flagged**: If some checks raise concerns, the question is sent to admin for manual review.
- **Rejected**: If clearly inappropriate, the question is rejected and the uploader is notified.

### Notifications
- Students receive **email notifications** when their upload is approved or rejected.
- The notification includes feedback from the moderator on why it was rejected (if applicable).

---

## 4. Admin Panel Features

> The admin panel is accessed via a **secret URL path** (not publicly linked).

### Admin Dashboard
- Overview of the entire platform:
  - **Total students**, **total questions**, **total courses**, **total feedback submissions**.
  - **Charts and graphs** showing uploads over time, active students, etc.
  - **Recent activity** log (latest uploads, registrations, etc.).

### Manage Questions
- **View all questions** in a table with filters (status, course, date, uploader).
- **Approve** pending questions to make them live.
- **Reject** questions with a reason.
- **Edit** question metadata (course, year, semester, type, etc.).
- **Upload replacement files** if the original is poor quality.
- **Delete** questions permanently.

### Manage Courses
- **View all courses** in a searchable, paginated table.
- **Create new courses** (name, code, faculty, programme, level).
- **Shared courses**: a course can be linked to multiple programmes (e.g. "Mathematics 101" under both Engineering and Science).
- **Edit** course details.
- **Upload course materials** directly.
- **Delete** courses (with caution — this removes linked questions).

### Manage Students
- **View all students** with their details (name, email, programme, level, status).
- **Search and filter** students by name, email, faculty, programme, or level.
- **Deactivate** a student's account (prevents login).
- **Activate** a deactivated account.
- **Delete** a student account and all their data.
- View a student's **upload history** and enforce or waive the upload obligation per student.

### Manage Feedback
- **View all feedback** submissions in a table.
- **Mark feedback as read**.
- **Delete** feedback entries.

### System Settings
- Configure **global platform settings**:
  - **Upload window**: how many days before a student must upload (obligation period).
  - **Max uploads per day/week**: limit how many files a student can upload.
  - **Max upload size**: maximum file size for uploads.
  - **Allowed file types**: which formats are accepted (PDF, PNG, JPG, etc.).
  - **Moderation settings**: which AI provider to use, confidence thresholds, etc.
  - **Site name, logo, favicon**: customise the platform branding.

### Admin Management
- **View all admin accounts**.
- **Add new admins** by email.
- **Remove admins** from the system.
- Admins cannot delete themselves (prevents lockout).

### Analytics & Reports
- **Monthly trend charts**: uploads, registrations, active students.
- **Breakdowns by faculty, programme, and level**.
- **Top-contributing students** leaderboard.
- **Export reports** as CSV for external analysis.

### Bulk Upload
- Upload **multiple questions at once** via a CSV/XLSX file or ZIP archive.
- The system parses the file and creates multiple question entries.
- Useful for importing large sets of past papers from partner universities.

### Data Import
- Import **course and question data** from external sources or partner databases.
- Map external data fields to the platform's format.

### Email Templates
- **View and edit** the content of all automated emails:
  - Verification email, password reset, upload approved/rejected, etc.
  - Uses a simple rich-text editor or text area.
- Changes take effect immediately.

### Activity Log
- A **complete log** of every action taken on the platform:
  - Who uploaded what, who approved/rejected, who logged in, etc.
  - Searchable by user, action type, or date range.
  - Helps with auditing and troubleshooting.

### System Logs
- **Technical logs** from the server (errors, warnings, debug info).
- Useful for developers to diagnose issues.

### Test Email
- A tool to **send a test email** to verify that email delivery is working correctly.
- Enter a recipient email and send a sample message.

---

## 5. Technical / System Features

### Database
- All data stored in **PostgreSQL** (via Supabase).
- **Row-Level Security (RLS)** policies control what each user can see and do.
- Tables: students, admins, courses, questions, feedback, settings, activity logs, email templates, etc.

### File Storage
- Uploaded files (PDFs and images) are stored in **cloud storage** (Supabase Storage / S3-compatible).
- Each file has a unique path and is served with access controls.
- Approved files are publicly accessible; pending/rejected files are not.

### Authentication
- Handled by **Supabase Auth**.
- Supports email/password login, email verification, and password reset.
- Session management with refresh tokens.

### Email Notifications
- Emails are sent using **Resend** (or a custom SMTP server).
- Templates are stored in the database and can be edited from the admin panel.
- Types: verification, welcome, password reset, upload approved, upload rejected.

### Activity Logging
- Every important user action is recorded:
  - Uploads, downloads, logins, admin actions, moderation decisions.
  - Stored with timestamp, user ID, action type, and metadata.
- Viewable in the admin Activity Log page.

### API Route Protection
- Public routes: landing, login, register, verify, password reset.
- Protected routes: student pages (require valid session + upload obligation check).
- Admin routes: require admin session (separate from student auth).
- Rate limiting on auth endpoints to prevent abuse.

---

## 6. User Roles & Permissions Summary

| Role | Can Do |
|------|--------|
| **Visitor** (not logged in) | View landing page, search/browse courses, view course list |
| **Student** (verified) | Login, browse courses, view/download questions, upload questions, vote/rate, comment, submit feedback, manage profile |
| **Student** (locked) | Cannot browse or download until they upload a question |
| **Admin** | Everything students can do + manage questions/courses/students/feedback/settings/admins, view analytics, import/export data, edit email templates, view logs, send test emails |

---

## 7. Key Workflows

### Student Onboarding
1. Visit landing page
2. Register with university email + select faculty/programme/level
3. Verify email via code sent to inbox
4. Set password
5. Login and start using the platform

### Upload & Moderation Workflow
1. Student uploads a question file (PDF/image) with metadata
2. File is stored securely (not yet public)
3. AI moderation runs checks (relevance, clarity, quality, profanity)
4. If approved → question goes live immediately, student gets email
5. If flagged → admin reviews manually, approves or rejects
6. If rejected → student gets email with reason

### Upload Obligation Workflow
1. System tracks the date of each student's last upload
2. If a configuration setting (e.g. 30 days) is exceeded → student is locked
3. Locked student sees an "Upload Wall" instead of normal pages
4. Student must upload at least one question to unlock
5. Once uploaded, access is restored immediately

### Admin Moderation Workflow
1. Admin logs in via secret URL
2. Dashboard shows stats and pending items
3. Admin reviews flagged questions (preview file + AI report)
4. Approves or rejects each question with optional note
5. Student is notified via email of the decision
