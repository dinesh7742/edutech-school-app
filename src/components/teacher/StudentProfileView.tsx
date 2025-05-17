
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, CalendarDays, User, Award, ShieldCheck, BookUser, Hash, Loader2, UserCircle } from "lucide-react";
import type { StudentProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface StudentProfileViewProps {
  studentId: string;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => {
  if (value === undefined || value === null || value.trim() === "") return null;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!studentId) {
        setError("No student ID provided.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const profileDocRef = doc(db, "studentProfiles", studentId);
        const profileDoc = await getDoc(profileDocRef);
        if (profileDoc.exists()) {
          setProfile({ uid: profileDoc.id, ...profileDoc.data() } as StudentProfile);
        } else {
          setError("Student profile not found.");
          setProfile(null);
        }
      } catch (err: any) {
        console.error("Error fetching student profile:", err);
        setError("Failed to load student profile. Please try again later.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [studentId]);

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "??";
  };

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

  if (error) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{error}</p>
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
          <AvatarImage src={profile.photoUrl || `https://placehold.co/128x128.png?text=${getInitials(profile.firstName, profile.lastName)}`} alt={`${profile.firstName} ${profile.lastName || ''}`} data-ai-hint="profile avatar"/>
          <AvatarFallback className="text-4xl">{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
        </Avatar>
        <CardTitle className="mt-4 text-3xl font-bold text-primary">
          {profile.firstName} {profile.middleName || ''} {profile.lastName || ''}
        </CardTitle>
        <CardDescription className="text-md">
          Grade: {profile.grade} {profile.division}
        </CardDescription>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
            {profile.email && <Badge variant="outline">{profile.email}</Badge>}
            {profile.contactNumber && <Badge variant="outline">{profile.contactNumber}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <DetailItem icon={User} label="Full Name" value={`${profile.firstName} ${profile.middleName || ''} ${profile.lastName || ''}`} />
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
