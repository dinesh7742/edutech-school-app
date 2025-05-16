
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
  dueDate?: string; // Keep dueDate if it's part of homework logic
  subject?: string; // Keep subject if it's part of homework logic
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
  timestamp: Timestamp | FieldValue; // Added for sorting or tracking
  grade: string;
}

export interface PhotoGalleryAlbum { // Renamed for clarity
  id: string;
  title: string;
  description?: string;
  images: { url: string; alt?: string }[];
  postedByUid: string;
  postedByName: string;
  eventDate?: string; // Keep eventDate
  timestamp: Timestamp | FieldValue; // Added for sorting or tracking
}

export interface StudentProfile {
  uid: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  grade: string;
  division: string;
  contactNumber?: string;
  aadharCardNumber?: string;
  penNumber?: string; // Parichay Education Number / Permanent Education Number
  grNumber?: string; // General Register Number
  religion?: string;
  caste?: string;
  fullAddress?: string;
  photoUrl?: string;
  email?: string;
}
