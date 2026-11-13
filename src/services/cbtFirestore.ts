import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AppConfig, MasterStudent, StudentSubmission } from '../types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'batharakresna@yahoo.co.id';

export function toFirestoreId(raw: string): string {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (normalized || 'default').slice(0, 120);
}

export function getOrCreateLocalExamId(schoolName?: string): string {
  try {
    const existing = localStorage.getItem('cbt_exam_id');
    if (existing && /^[a-zA-Z0-9_-]{3,128}$/.test(existing)) {
      return existing;
    }
  } catch (_) {}

  const slug = toFirestoreId(schoolName || 'sekolah').slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 8);
  const generated = `cbt_${slug}_${rand}`;
  try {
    localStorage.setItem('cbt_exam_id', generated);
  } catch (_) {}
  return generated;
}

function isBootstrappedAdminUser(): boolean {
  return !!auth.currentUser?.emailVerified && auth.currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
}

function stripUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map(item => stripUndefinedDeep(item)) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    });
    return out as T;
  }
  return val;
}

export async function compressImageForFirestore(dataUrl: string, maxChars = 880000): Promise<{ dataUrl: string; sizeKb: number }> {
  if (!dataUrl || dataUrl.length <= maxChars || typeof document === 'undefined') {
    return { dataUrl, sizeKb: Math.round((dataUrl.length * 0.75) / 1024) };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxWidth = 1400;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: dataUrl.slice(0, maxChars), sizeKb: Math.round((maxChars * 0.75) / 1024) });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.82;
        let out = canvas.toDataURL('image/jpeg', quality);
        while (out.length > maxChars && quality > 0.35) {
          quality -= 0.12;
          out = canvas.toDataURL('image/jpeg', quality);
        }
        resolve({ dataUrl: out, sizeKb: Math.round((out.length * 0.75) / 1024) });
      } catch (_) {
        resolve({ dataUrl: dataUrl.slice(0, maxChars), sizeKb: Math.round((maxChars * 0.75) / 1024) });
      }
    };
    img.onerror = () => {
      resolve({ dataUrl: dataUrl.slice(0, maxChars), sizeKb: Math.round((maxChars * 0.75) / 1024) });
    };
    img.src = dataUrl;
  });
}

export interface CloudExamDoc extends AppConfig {
  examId: string;
  ownerUid: string;
  rosterCount: number;
  subjectsCount: number;
  imagesCount: number;
}

export async function fetchExamFromCloud(examId: string): Promise<CloudExamDoc | null> {
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}`;
  try {
    const snap = await getDoc(doc(db, 'exams', safeId));
    if (!snap.exists()) return null;
    return snap.data() as CloudExamDoc;
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    return null;
  }
}

export async function upsertExamToCloud(
  examId: string,
  config: AppConfig,
  counts?: { rosterCount?: number; subjectsCount?: number; imagesCount?: number }
): Promise<CloudExamDoc | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const safeId = toFirestoreId(examId);
  const ref = doc(db, 'exams', safeId);
  const path = `exams/${safeId}`;

  const cleanMapels = (Array.isArray(config.mapels) && config.mapels.length > 0 ? config.mapels : ['TIK'])
    .map(m => String(m).trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 50);
  const cleanKelas = (Array.isArray(config.kelas) && config.kelas.length > 0 ? config.kelas : ['12A'])
    .map(k => String(k).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 100);

  try {
    const existingSnap = await getDoc(ref);
    const existingData = existingSnap.exists() ? (existingSnap.data() as Partial<CloudExamDoc>) : null;

    const baseFields = {
      appTitle: String(config.appTitle || 'SIMULASI UJIAN CBT SLIDE').trim().slice(0, 200),
      schoolName: String(config.schoolName || 'SMA Negeri 1 Wonogiri').trim().slice(0, 200),
      schoolLevel: config.schoolLevel || 'SMA/MA/SMK/MAK',
      token: String(config.token || 'CBT2026').trim().toUpperCase().slice(0, 32),
      gdriveUrl: String(config.gdriveUrl || '').trim().slice(0, 500),
      mapels: cleanMapels,
      kelas: cleanKelas,
      durationMinutes: Math.min(600, Math.max(1, Number(config.durationMinutes) || 90)),
      maxViolations: Math.min(50, Math.max(0, Number(config.maxViolations) ?? 3)),
      shuffleQuestions: Boolean(config.shuffleQuestions),
      verificationMode: config.verificationMode === 'manual' ? 'manual' : 'crosscheck',
      rosterCount: counts?.rosterCount ?? existingData?.rosterCount ?? 0,
      subjectsCount: counts?.subjectsCount ?? existingData?.subjectsCount ?? 0,
      imagesCount: counts?.imagesCount ?? existingData?.imagesCount ?? 0,
      updatedAt: serverTimestamp()
    };

    if (!existingSnap.exists()) {
      await setDoc(ref, {
        examId: safeId,
        ownerUid: user.uid,
        ...baseFields,
        createdAt: serverTimestamp()
      });
      return {
        examId: safeId,
        ownerUid: user.uid,
        ...baseFields
      } as unknown as CloudExamDoc;
    } else {
      await updateDoc(ref, baseFields);
      return {
        examId: safeId,
        ownerUid: existingData?.ownerUid || user.uid,
        ...baseFields
      } as unknown as CloudExamDoc;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

async function resolveExamOwnerUid(examId: string): Promise<string | null> {
  const safeId = toFirestoreId(examId);
  const existing = await fetchExamFromCloud(safeId);
  if (existing?.ownerUid) return existing.ownerUid;
  return auth.currentUser?.uid || null;
}

export async function saveQuestionBankToCloud(
  examId: string,
  config: AppConfig,
  bankItems: any[]
): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const safeId = toFirestoreId(examId);
  let examDoc = await fetchExamFromCloud(safeId);
  if (!examDoc) {
    examDoc = await upsertExamToCloud(safeId, config);
  }
  const ownerUid = examDoc?.ownerUid || user.uid;

  const bySubject: Record<string, any[]> = {};
  bankItems.forEach((q) => {
    const subj = String(q.subject || 'TIK').trim().toUpperCase();
    if (!bySubject[subj]) bySubject[subj] = [];
    if (bySubject[subj].length < 250) {
      bySubject[subj].push(stripUndefinedDeep(q));
    }
  });

  const entries = Object.entries(bySubject);
  for (const [subj, questions] of entries) {
    if (questions.length === 0) continue;
    const subjectId = toFirestoreId(subj);
    const path = `exams/${safeId}/banks/${subjectId}`;
    try {
      await setDoc(doc(db, 'exams', safeId, 'banks', subjectId), {
        examId: safeId,
        subjectId,
        subjectName: subj.slice(0, 128),
        ownerUid,
        questions,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  await upsertExamToCloud(safeId, config, { subjectsCount: entries.length });
  return bankItems.length;
}

export async function fetchAllQuestionBanksFromCloud(examId: string): Promise<any[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}/banks`;
  try {
    const colRef = collection(db, 'exams', safeId, 'banks');
    const q = isBootstrappedAdminUser()
      ? colRef
      : query(colRef, where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    const all: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (Array.isArray(data.questions)) {
        all.push(...data.questions);
      }
    });
    return all;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchSubjectBankForStudent(examId: string, subjectName: string): Promise<any[]> {
  const safeId = toFirestoreId(examId);
  const candidates = Array.from(new Set([
    toFirestoreId(subjectName),
    toFirestoreId('SEMUA MAPEL'),
    toFirestoreId('UMUM')
  ]));

  for (const subjectId of candidates) {
    const path = `exams/${safeId}/banks/${subjectId}`;
    try {
      const snap = await getDoc(doc(db, 'exams', safeId, 'banks', subjectId));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          return data.questions;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }
  }
  return [];
}

export async function saveQuestionImagesToCloud(
  examId: string,
  config: AppConfig,
  images: Array<{ name: string; cleanName: string; type: string; sizeKb: number; dataUrl: string }>
): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const safeId = toFirestoreId(examId);
  let examDoc = await fetchExamFromCloud(safeId);
  if (!examDoc) {
    examDoc = await upsertExamToCloud(safeId, config);
  }
  const ownerUid = examDoc?.ownerUid || user.uid;

  const chunkSize = 8;
  for (let i = 0; i < images.length; i += chunkSize) {
    const chunk = images.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (img) => {
        const imageId = toFirestoreId(img.cleanName || img.name);
        const compressed = await compressImageForFirestore(img.dataUrl);
        const path = `exams/${safeId}/images/${imageId}`;
        try {
          await setDoc(doc(db, 'exams', safeId, 'images', imageId), {
            examId: safeId,
            imageId,
            name: String(img.name || imageId).slice(0, 200),
            cleanName: String(img.cleanName || imageId).slice(0, 150),
            type: String(img.type || 'image/jpeg').slice(0, 60),
            sizeKb: Math.min(1024, Math.max(0, Number(compressed.sizeKb) || 0)),
            dataUrl: compressed.dataUrl,
            ownerUid,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      })
    );
  }

  const allCloudImages = await fetchAllImagesFromCloud(safeId);
  await upsertExamToCloud(safeId, config, { imagesCount: allCloudImages.length });
  return images.length;
}

export async function fetchAllImagesFromCloud(examId: string): Promise<any[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}/images`;
  try {
    const colRef = collection(db, 'exams', safeId, 'images');
    const q = isBootstrappedAdminUser()
      ? colRef
      : query(colRef, where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteImageFromCloud(examId: string, cleanName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = toFirestoreId(examId);
  const imageId = toFirestoreId(cleanName);
  const path = `exams/${safeId}/images/${imageId}`;
  try {
    await deleteDoc(doc(db, 'exams', safeId, 'images', imageId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchQuestionImagesForStudent(
  examId: string,
  lookupKeys: string[]
): Promise<Record<string, { dataUrl: string; name?: string }>> {
  const safeId = toFirestoreId(examId);
  const uniqueIds = Array.from(new Set(lookupKeys.map(k => toFirestoreId(k)).filter(Boolean)));
  const result: Record<string, { dataUrl: string; name?: string }> = {};

  const chunkSize = 15;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (imageId) => {
        const path = `exams/${safeId}/images/${imageId}`;
        try {
          const snap = await getDoc(doc(db, 'exams', safeId, 'images', imageId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.dataUrl) {
              result[imageId] = { dataUrl: data.dataUrl, name: data.name };
              if (data.cleanName) {
                result[String(data.cleanName).toLowerCase().trim()] = { dataUrl: data.dataUrl, name: data.name };
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
            handleFirestoreError(err, OperationType.GET, path);
          }
        }
      })
    );
  }
  return result;
}

export async function saveRosterToCloud(
  examId: string,
  config: AppConfig,
  students: MasterStudent[]
): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const safeId = toFirestoreId(examId);
  let examDoc = await fetchExamFromCloud(safeId);
  if (!examDoc) {
    examDoc = await upsertExamToCloud(safeId, config);
  }
  const ownerUid = examDoc?.ownerUid || user.uid;

  const chunkSize = 20;
  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (st, idx) => {
        const rosterId = toFirestoreId(st.noPeserta);
        const path = `exams/${safeId}/roster/${rosterId}`;
        try {
          await setDoc(doc(db, 'exams', safeId, 'roster', rosterId), {
            examId: safeId,
            rosterId,
            no: Number(st.no) || i + idx + 1,
            name: String(st.name || '').trim().toUpperCase().slice(0, 150),
            noPeserta: String(st.noPeserta || '').trim().slice(0, 64),
            className: String(st.className || '12A').trim().slice(0, 64),
            subject: String(st.subject || 'UMUM').trim().toUpperCase().slice(0, 128),
            ownerUid,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      })
    );
  }

  await upsertExamToCloud(safeId, config, { rosterCount: students.length });
  return students.length;
}

export async function fetchRosterCountFromCloud(examId: string): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}/roster`;
  try {
    const colRef = collection(db, 'exams', safeId, 'roster');
    const q = isBootstrappedAdminUser()
      ? colRef
      : query(colRef, where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchRosterStudentForCrosscheck(
  examId: string,
  noPeserta: string
): Promise<MasterStudent | null> {
  const safeId = toFirestoreId(examId);
  const rosterId = toFirestoreId(noPeserta);
  const path = `exams/${safeId}/roster/${rosterId}`;
  try {
    const snap = await getDoc(doc(db, 'exams', safeId, 'roster', rosterId));
    if (!snap.exists()) return null;
    return snap.data() as MasterStudent;
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    return null;
  }
}

export async function createOrResumeStudentSubmissionInCloud(params: {
  examId: string;
  ownerUid: string;
  token: string;
  schoolName: string;
  studentName: string;
  noPeserta: string;
  className: string;
  subject: string;
  assignedPackage: string;
}): Promise<{
  submissionId: string;
  blocked: boolean;
  message?: string;
  isResuming?: boolean;
  savedAnswers?: Record<number, string | string[]>;
  violationsCount?: number;
}> {
  const safeId = toFirestoreId(params.examId);
  const submissionId = toFirestoreId(`${params.noPeserta}_${params.subject}`);
  const ref = doc(db, 'exams', safeId, 'submissions', submissionId);
  const path = `exams/${safeId}/submissions/${submissionId}`;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const existing = snap.data() as StudentSubmission;
      if (existing.status === 'Selesai' || existing.status === 'Curang (Disubmit)') {
        return {
          submissionId,
          blocked: true,
          message: `Anda sudah menyelesaikan ujian mata pelajaran "${params.subject}" dengan status "${existing.status}". Hubungi guru/proktor jika memerlukan Reset Login.`
        };
      }
      return {
        submissionId,
        blocked: false,
        isResuming: true,
        savedAnswers: existing.answers || {},
        violationsCount: existing.violationsCount || 0
      };
    }

    await setDoc(ref, {
      id: submissionId,
      examId: safeId,
      ownerUid: params.ownerUid,
      token: String(params.token).trim().toUpperCase().slice(0, 32),
      schoolName: String(params.schoolName || '').slice(0, 200),
      studentName: String(params.studentName || '').toUpperCase().slice(0, 150),
      noPeserta: String(params.noPeserta || '').slice(0, 64),
      className: String(params.className || '').slice(0, 64),
      subject: String(params.subject || '').slice(0, 128),
      assignedPackage: String(params.assignedPackage || 'Paket A').slice(0, 50),
      answers: {},
      violationsCount: 0,
      startTime: new Date().toLocaleTimeString('id-ID'),
      submitTime: '',
      score: 0,
      maxScore: 0,
      percentage: 0,
      status: 'Sedang Mengerjakan',
      syncedToGdrive: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { submissionId, blocked: false, isResuming: false };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function submitStudentExamToCloud(params: {
  examId: string;
  submissionId: string;
  answers: Record<number, string | string[]>;
  violationsCount: number;
  submitTime: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'Selesai' | 'Curang (Disubmit)';
  syncedToGdrive: boolean;
}): Promise<void> {
  const safeId = toFirestoreId(params.examId);
  const submissionId = toFirestoreId(params.submissionId);
  const path = `exams/${safeId}/submissions/${submissionId}`;

  const sanitizedAnswers: Record<string, string | string[]> = {};
  Object.entries(params.answers || {}).forEach(([k, v]) => {
    if (v !== undefined) sanitizedAnswers[String(k)] = v;
  });

  try {
    await updateDoc(doc(db, 'exams', safeId, 'submissions', submissionId), {
      answers: sanitizedAnswers,
      violationsCount: Math.min(100, Math.max(0, Number(params.violationsCount) || 0)),
      submitTime: String(params.submitTime || new Date().toLocaleTimeString('id-ID')).slice(0, 64),
      score: Math.max(0, Number(params.score) || 0),
      maxScore: Math.max(0, Number(params.maxScore) || 0),
      percentage: Math.min(100, Math.max(0, Number(params.percentage) || 0)),
      status: params.status,
      syncedToGdrive: Boolean(params.syncedToGdrive),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fetchSubmissionsFromCloud(examId: string): Promise<StudentSubmission[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}/submissions`;
  try {
    const colRef = collection(db, 'exams', safeId, 'submissions');
    const q = isBootstrappedAdminUser()
      ? colRef
      : query(colRef, where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StudentSubmission);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function resetStudentInCloud(
  examId: string,
  submissionId: string,
  resetType: 'login_only' | 'full_reset'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = toFirestoreId(examId);
  const safeSubId = toFirestoreId(submissionId);
  const path = `exams/${safeId}/submissions/${safeSubId}`;
  const ref = doc(db, 'exams', safeId, 'submissions', safeSubId);

  try {
    if (resetType === 'login_only') {
      await updateDoc(ref, {
        status: 'Sedang Mengerjakan',
        updatedAt: serverTimestamp()
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function resetAllSubmissionsInCloud(examId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = toFirestoreId(examId);
  const path = `exams/${safeId}/submissions`;
  try {
    const colRef = collection(db, 'exams', safeId, 'submissions');
    const q = isBootstrappedAdminUser()
      ? colRef
      : query(colRef, where('ownerUid', '==', user.uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearCacheInCloud(
  examId: string,
  config: AppConfig,
  target: 'questions' | 'all'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const safeId = toFirestoreId(examId);

  const deleteCollectionDocs = async (subCol: 'banks' | 'images' | 'roster' | 'submissions') => {
    const path = `exams/${safeId}/${subCol}`;
    try {
      const colRef = collection(db, 'exams', safeId, subCol);
      const q = isBootstrappedAdminUser()
        ? colRef
        : query(colRef, where('ownerUid', '==', user.uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  if (target === 'questions' || target === 'all') {
    await deleteCollectionDocs('banks');
    await deleteCollectionDocs('images');
  }
  if (target === 'all') {
    await deleteCollectionDocs('roster');
    await deleteCollectionDocs('submissions');
  }

  const ownerUid = await resolveExamOwnerUid(safeId);
  if (ownerUid) {
    await upsertExamToCloud(safeId, config, {
      subjectsCount: 0,
      imagesCount: 0,
      ...(target === 'all' ? { rosterCount: 0 } : {})
    });
  }
}
