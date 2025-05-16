import type { User as FirebaseUser } from "firebase/auth";

export type UserRole = "student" | "teacher";

export interface AppUser extends FirebaseUser {
  role?: UserRole;
  grade?: string;
  division?: string;
  displayName?: string | null; 
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  postedBy: string; // Teacher's name or ID
  timestamp: Date;
  grade?: string; // Target grade
  division?: string; // Target division
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string; // URL to the attached file
  fileName?: string;
  postedBy: string;
  timestamp: Date;
  grade: string;
  division: string;
}

export interface Circular {
  id: string;
  title: string;
  fileUrl?: string;
  fileName?: string;
  postedBy: string;
  timestamp: Date;
}

export interface Textbook {
  id: string;
  title: string;
  subject: string;
  fileUrl: string; // URL to PDF
  fileName?: string;
  postedBy: string;
  grade: string;
}

export interface PhotoGallery {
  id: string;
  title: string;
  images: { url: string; alt?: string }[];
  postedBy: string;
  timestamp: Date;
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
