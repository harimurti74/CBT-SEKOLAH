# Security Specification: Secure Slide CBT Multi-Sekolah

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unmatched paths in `/databases/{database}/documents` are denied by default.
2. **Exam Ownership & Verified Teacher Access**: Only verified Google-authenticated users (`request.auth != null && request.auth.token.email_verified == true`) can create an `/exams/{examId}` (with `ownerUid == request.auth.uid`) or modify `banks`, `images`, `roster`, or delete/reset `submissions` for exams they own (or as bootstrapped admin `batharakresna@yahoo.co.id`).
3. **No Bulk Roster / Submission Scraping (`allow list` Isolation)**: Students open dedicated exam links without logging into Google accounts (`tanpa login akun apapun`). Students are strictly **forbidden** from running `list` queries on `/exams`, `/banks`, `/images`, `/roster`, or `/submissions`. They may only `get` a specific document by its exact ID (`examId`, `subjectId`, `imageId`, their own `noPeserta` roster ID, or their own `submissionId`).
4. **Master Gate & Token Validation**: Every subcollection write (`banks`, `images`, `roster`, `submissions`) verifies `exists(/databases/$(database)/documents/exams/$(examId))`. Student submission creation must supply `token` matching `exams/{examId}.data.token` and `ownerUid` matching `exams/{examId}.data.ownerUid`.
5. **Terminal State Locking**: Once a student submission reaches `status == 'Selesai'` or `'Curang (Disubmit)'`, students cannot modify or overwrite their answers or score. Only the exam owner/admin may reset `status` back to `'Sedang Mengerjakan'` (Reset Login) or delete the document (Reset Total).
6. **Strict Schema, Key Allowlists, Size Bounds & Server Timestamps**: Every document validates exact `hasAll` + `hasOnly` keys, string `.size()` limits, bounded lists, valid ID regex `^[a-zA-Z0-9_\\-]+$`, and `createdAt == request.time` / `updatedAt == request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Exam Create**: Creating `/exams/ex1` with extra field `isSuperAdmin: true`. -> **DENIED** (`hasOnly` rejects ghost key).
2. **Identity Spoofing on Exam Create**: Authenticated user A creates `/exams/ex2` with `ownerUid: "userB"`. -> **DENIED** (`ownerUid == request.auth.uid`).
3. **Email Verification Bypass**: Unverified auth token (`email_verified: false`) with email `batharakresna@yahoo.co.id` attempts to update `/exams/ex1`. -> **DENIED** (`email_verified == true` required).
4. **ID Poisoning Attack**: Creating `/exams/<1500-char-string>` or `/exams/bad..id`. -> **DENIED** (`isValidId` regex + max 128 chars).
5. **Orphaned Subcollection Write**: Creating `/exams/nonexistent/submissions/sub1` where parent exam does not exist. -> **DENIED** (`exists` parent gate).
6. **Forged Token Submission**: Student creates `/exams/ex1/submissions/sub1` with wrong `token: "FAKE12"`. -> **DENIED** (`incoming().token == examData(examId).token`).
7. **Terminal State Tampering**: Student updates `/exams/ex1/submissions/sub1` after `status` is already `'Selesai'` to change `percentage: 100`. -> **DENIED** (`existing().status == 'Sedang Mengerjakan'`).
8. **Submission Identity Hijack**: Student updates active submission changing `noPeserta` or `ownerUid` or `createdAt`. -> **DENIED** (immutability + `affectedKeys().hasOnly(...)`).
9. **Blanket Roster Scraping (`list`)**: Unauthenticated student attempts `list` on `/exams/ex1/roster`. -> **DENIED** (only verified exam owner/admin can `list`).
10. **Client Clock Forgery**: Creating a submission with backdated `createdAt` not equal to `request.time`. -> **DENIED** (`createdAt == request.time`).
11. **Oversized Value / DoS Payload**: Uploading a `QuestionImage` with `dataUrl` exceeding 950,000 bytes or `questions` array > 250 items. -> **DENIED** (`.size()` enforcement).
12. **Privilege Escalation to `/admins`**: Non-admin user attempts to create `/admins/{myUid}`. -> **DENIED** (only existing bootstrapped admin may write `/admins`).
