export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Exam Create',
    operation: 'create',
    path: '/exams/exam_01',
    payload: { examId: 'exam_01', isSuperAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidExam checks data.keys().hasAll(...) && data.keys().hasOnly(...)'
  },
  {
    id: 2,
    name: 'Identity Spoofing on Exam Create',
    operation: 'create',
    path: '/exams/exam_02',
    payload: { examId: 'exam_02', ownerUid: 'victim_uid' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().ownerUid == request.auth.uid'
  },
  {
    id: 3,
    name: 'Email Verification Spoof Attack',
    operation: 'update',
    path: '/exams/exam_01',
    payload: { email: 'batharakresna@yahoo.co.id', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() requires request.auth.token.email_verified == true'
  },
  {
    id: 4,
    name: 'ID Poisoning Guard',
    operation: 'create',
    path: `/exams/${'a'.repeat(200)}`,
    payload: { examId: 'a'.repeat(200) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(id) enforces length <= 128 and ^[a-zA-Z0-9_\\-]+$'
  },
  {
    id: 5,
    name: 'Orphaned Submission Write',
    operation: 'create',
    path: '/exams/nonexistent_exam/submissions/sub_01',
    payload: { examId: 'nonexistent_exam', id: 'sub_01' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'examExists(examId) checks exists(/databases/$(database)/documents/exams/$(examId))'
  },
  {
    id: 6,
    name: 'Forged Exam Token on Submission Create',
    operation: 'create',
    path: '/exams/exam_01/submissions/sub_02',
    payload: { examId: 'exam_01', id: 'sub_02', token: 'WRONG_TOKEN' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().token == examData(examId).token'
  },
  {
    id: 7,
    name: 'Terminal State Tampering After Exam Finished',
    operation: 'update',
    path: '/exams/exam_01/submissions/sub_finished',
    payload: { percentage: 100, status: 'Selesai' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "existing().status == 'Sedang Mengerjakan'"
  },
  {
    id: 8,
    name: 'Immutable Field Mutation on Submission Update',
    operation: 'update',
    path: '/exams/exam_01/submissions/sub_active',
    payload: { noPeserta: '999999', ownerUid: 'hijacker' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'affectedKeys().hasOnly(...) and immutable checks on noPeserta/ownerUid/createdAt'
  },
  {
    id: 9,
    name: 'Unauthenticated Roster List Scraping',
    operation: 'list',
    path: '/exams/exam_01/roster',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list requires isVerifiedUser() and ownerUid/admin check'
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/exams/exam_01/submissions/sub_03',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time && incoming().updatedAt == request.time'
  },
  {
    id: 11,
    name: 'Oversized Image Payload / Array Exhaustion',
    operation: 'create',
    path: '/exams/exam_01/images/img_huge',
    payload: { dataUrlLength: 1200000 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'data.dataUrl.size() <= 950000'
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    operation: 'create',
    path: '/admins/attacker_uid',
    payload: { uid: 'attacker_uid', email: 'attacker@example.com' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Only bootstrapped admin may write /admins/{uid}'
  }
];
