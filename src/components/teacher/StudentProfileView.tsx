"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, CalendarDays, User, Award, ShieldCheck, BookUser, Hash } from "lucide-react";
import type { StudentProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Mock function to fetch student profile
async function fetchStudentProfile(studentId: string): Promise<StudentProfile | null> {
  // In a real app, this would fetch from Firestore:
  // const docRef = doc(db, "studentProfiles", studentId);
  // const docSnap = await getDoc(docRef);
  // if (docSnap.exists()) return docSnap.data() as StudentProfile; else return null;

  // Mock data:
  const MOCK_STUDENTS: StudentProfile[] = [
    { uid: "student1", firstName: "Aarav", middleName: "Kumar", lastName: "Sharma", grade: "5", division: "A", email: "aarav.s@example.com", photoUrl: "https://placehold.co/128x128.png?text=AS", contactNumber: "9876543210", aadharCardNumber: "xxxx-xxxx-1234", penNumber: "PEN123XYZ", grNumber: "GR987", religion: "Hindu", caste: "Brahmin", fullAddress: "123 Sunshine Apts, Vikhroli West, Mumbai" },
    { uid: "student2", firstName: "Priya", lastName: "Patel", grade: "5", division: "B", email: "priya.p@example.com", photoUrl: "https://placehold.co/128x128.png?text=PP", contactNumber: "9876543211", aadharCardNumber: "xxxx-xxxx-5678", penNumber: "PEN456ABC", grNumber: "GR654", religion: "Hindu", caste: "Patel", fullAddress: "456 Moonlight Towers, Ghatkopar East, Mumbai" },
  ];
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(MOCK_STUDENTS.find(s => s.uid === studentId) || null);
    }, 500);
  });
}

interface StudentProfileViewProps {
  studentId: string;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
};

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      const data = await fetchStudentProfile(studentId);
      setProfile(data);
      setLoading(false);
    }
    if (studentId) {
      getProfile();
    }
  }, [studentId]);

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader className="items-center text-center border-b pb-6">
           <Skeleton className="h-32 w-32 rounded-full" />
           <Skeleton className="h-8 w-1/2 mt-4" />
           <Skeleton className="h-4 w-1/4 mt-2" />
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">Student Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">The requested student profile could not be found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl overflow-hidden">
      <CardHeader className="items-center text-center border-b pb-6 bg-secondary/30">
        <Avatar className="h-32 w-32 border-4 border-background shadow-md">
          <AvatarImage src={profile.photoUrl || `https://placehold.co/128x128.png?text=${profile.firstName[0]}${profile.lastName[0]}`} alt={`${profile.firstName} ${profile.lastName}`} data-ai-hint="profile avatar"/>
          <AvatarFallback className="text-4xl">{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
        </Avatar>
        <CardTitle className="mt-4 text-3xl font-bold text-primary">
          {profile.firstName} {profile.middleName} {profile.lastName}
        </CardTitle>
        <CardDescription className="text-md">
          Grade: {profile.grade} {profile.division}
        </CardDescription>
        <div className="flex gap-2 mt-2">
            <Badge variant="outline">{profile.email}</Badge>
            {profile.contactNumber && <Badge variant="outline">{profile.contactNumber}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <DetailItem icon={User} label="Full Name" value={`${profile.firstName} ${profile.middleName || ''} ${profile.lastName}`} />
        <DetailItem icon={Mail} label="Email" value={profile.email} />
        <DetailItem icon={Phone} label="Contact Number" value={profile.contactNumber} />
        <DetailItem icon={Award} label="Grade & Division" value={`Grade ${profile.grade} - ${profile.division}`} />
        <DetailItem icon={CalendarDays} label="Religion" value={profile.religion} />
        <DetailItem icon={UserCircle} label="Caste" value={profile.caste} />
        <DetailItem icon={ShieldCheck} label="Aadhar Card Number" value={profile.aadharCardNumber} />
        <DetailItem icon={BookUser} label="PEN Number" value={profile.penNumber} />
        <DetailItem icon={Hash} label="G.R. Number" value={profile.grNumber} />
        <DetailItem icon={MapPin} label="Full Address" value={profile.fullAddress} />
      </CardContent>
    </Card>
  );
}
