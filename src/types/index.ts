
import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = "student" | "teacher";

export interface AppUser extends FirebaseUser {
  role?: UserRole;
  grade?: string;
  division?: string;
  displayName?: string | null; 
}

export interface Notice {
  id: string; // Document ID from Firestore
  title: string;
  content: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue; // Firestore Timestamp on read, FieldValue on write
  displayDate?: string; // For client-side display after conversion
  grade?: string | null; // Target grade
  division?: string | null; // Target division
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string; // URL to the attached file
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
  fileUrl: string; // URL to PDF
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
  subject: string; // This will be the main title, e.g., "Maths Chapter 5 Revision"
  meetingLink: string;
  description?: string;
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  grade?: string | null;
  division?: string | null;
}

// Attendance Types
export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export interface StudentAttendanceRecord {
  [studentUid: string]: AttendanceStatus;
}

export interface DailyAttendanceLog {
  id?: string; // YYYY-MM-DD_GRADE_DIVISION
  date: string; // YYYY-MM-DD
  grade: string;
  division: string;
  studentRecords: StudentAttendanceRecord;
  markedByTeacherId: string;
  markedByTeacherName: string;
  lastUpdatedAt: Timestamp | FieldValue;
}
