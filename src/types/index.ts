
import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = "student" | "teacher" | "admin";

export interface AppUser extends FirebaseUser {
  role?: UserRole;
  grade?: string;
  division?: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  grade?: string | null;
  division?: string | null;
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  dueDate?: string;
  subject?: string;
  grade: string;
  division: string;
}

export interface HomeworkSubmission {
  id?: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  grade: string;
  division: string;
  homeworkTitle: string;
  completedAt: Timestamp | FieldValue;
  status: 'completed';
}


export interface Circular {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  grade?: string | null;
  division?: string | null;
}

export interface Textbook {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  coverImageUrl?: string;
  fileName?: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  grade: string;
}

export interface PhotoGalleryAlbum {
  id: string;
  title: string;
  description?: string;
  images: { url: string; alt?: string }[];
  postedByUid: string;
  postedByName: string;
  eventDate?: string;
  timestamp: Timestamp | FieldValue;
}

export interface StudentProfile {
  uid: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  grade: string;
  division: string;
  contactNumber?: string;
  aadharCardNumber?: string;
  penNumber?: string;
  grNumber?: string;
  religion?: string;
  caste?: string;
  fullAddress?: string;
  photoUrl?: string;
  email?: string;
}

export interface LiveClass {
  id: string;
  subject: string;
  meetingLink: string;
  description?: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  grade?: string | null;
  division?: string | null;
}

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export interface StudentAttendanceRecord {
  [studentUid: string]: AttendanceStatus;
}

export interface DailyAttendanceLog {
  id?: string;
  date: string;
  grade: string;
  division: string;
  studentRecords: StudentAttendanceRecord;
  markedByTeacherId: string;
  markedByTeacherName: string;
  lastUpdatedAt: Timestamp | FieldValue;
}

export type LeaveApplicationStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveApplication {
  id?: string;
  studentUid: string;
  studentName: string;
  grade: string;
  division: string;
  leaveStartDate: string;
  leaveEndDate: string;
  reason: string;
  applicationDate: Timestamp | FieldValue;
  status: LeaveApplicationStatus;
  reviewedByTeacherId?: string;
  reviewedByTeacherName?: string;
  reviewTimestamp?: Timestamp | FieldValue;
  teacherComments?: string;
}

export interface SchoolForm {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  dataAiHint: string;
}

export type LateArrivalRequestType = "Late Arrival" | "Early Departure";
export type RequestStatus = "Pending" | "Approved" | "Rejected";

export interface LateArrivalApplication {
  id?: string;
  studentUid: string;
  studentName: string;
  grade: string;
  division: string;
  requestDate: string; // YYYY-MM-DD of the incident
  type: LateArrivalRequestType;
  time: string; // HH:MM format
  reason: string;
  applicationTimestamp: Timestamp | FieldValue; // When the request was submitted
  status: RequestStatus;
  reviewedByTeacherId?: string;
  reviewedByTeacherName?: string;
  reviewTimestamp?: Timestamp | FieldValue;
  teacherComments?: string;
}
