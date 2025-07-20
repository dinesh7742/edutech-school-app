
import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = "student" | "teacher" | "admin";

export interface AppUser extends FirebaseUser {
  role?: UserRole;
  grade?: string;
  division?: string;
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  whatsAppNumber?: string | null; // Added for teacher's WhatsApp number
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

export interface HomeworkAttachment {
  name: string;
  url: string;
  type: 'image' | 'video' | 'pdf' | 'other';
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  attachments?: HomeworkAttachment[]; // Replaces fileUrl and fileName
  postedByUid: string;
  postedByName: string;
  timestamp: Timestamp | FieldValue;
  displayDate?: string;
  dueDate?: string; // YYYY-MM-DD
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
  coverImageUrl?: string; // Can store Data URI
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
  images: { url: string; alt?: string }[]; // URLs could be Data URIs
  postedByUid: string;
  postedByName: string;
  eventDate?: string; // YYYY-MM-DD
  timestamp: Timestamp | FieldValue;
}

export interface StudentProfile {
  uid: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  motherName?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  dateOfBirth?: string; // YYYY-MM-DD
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
  photoUrl?: string; // Can store Data URI
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
  date: string; // YYYY-MM-DD
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
  leaveStartDate: string; // YYYY-MM-DD
  leaveEndDate: string; // YYYY-MM-DD
  reason: string;
  applicationDate: Timestamp | FieldValue; // Firestore Server Timestamp
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
  applicationTimestamp: Timestamp | FieldValue; 
  status: RequestStatus;
  reviewedByTeacherId?: string;
  reviewedByTeacherName?: string;
  reviewTimestamp?: Timestamp | FieldValue;
  teacherComments?: string;
}

export type OtherApplicationType = 
  | "ProgressReportRequest"
  | "ReExamRequest"
  | "TCApplication"
  | "DuplicateTCRequest"
  | "BonafideCertificateRequest";

export const otherApplicationTypeLabels: Record<OtherApplicationType, string> = {
  ProgressReportRequest: "Progress Report Request",
  ReExamRequest: "Re-exam / Re-test Request",
  TCApplication: "Transfer Certificate (TC) Application",
  DuplicateTCRequest: "Duplicate TC Request",
  BonafideCertificateRequest: "Bonafide Certificate Request",
};

export interface OtherStudentApplication {
  id?: string;
  studentUid: string;
  studentName: string;
  grade: string;
  division: string;
  formType: OtherApplicationType;
  reasonOrDetails: string;
  applicationTimestamp: Timestamp | FieldValue;
  status: RequestStatus;
  reviewedByTeacherId?: string;
  reviewedByTeacherName?: string;
  reviewTimestamp?: Timestamp | FieldValue;
  teacherComments?: string;
}

export type ComplaintStatus = "Pending Acknowledgment" | "Acknowledged";
export const complaintTypes = [
    'Disobedience',
    'Homework not done',
    'Misbehaving with classmates',
    'Breaking school rules',
    'Bad language',
    'Other'
] as const;
export type ComplaintType = typeof complaintTypes[number];

export interface Complaint {
  id?: string;
  studentUid: string;
  studentName: string;
  grade: string;
  division: string;
  incidentDate: string; // YYYY-MM-DD
  teacherUid: string;
  teacherName: string;
  subject: string;
  complaintTypes: ComplaintType[];
  otherComplaintType?: string;
  description: string;
  actionTaken: string;
  status: ComplaintStatus;
  createdAt: Timestamp | FieldValue;
  
  // Parent/Student acknowledgment fields
  acknowledgedBy?: "Parent" | "Student";
  acknowledgmentTimestamp?: Timestamp | FieldValue;
  parentRemarks?: string;
  parentSignature?: string; // Can be a name string or data URI of a signature
}
