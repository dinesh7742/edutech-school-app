
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, CalendarDays, User, Award, ShieldCheck, BookUser, Hash, Users, Edit, X } from "lucide-react"; 
import type { StudentProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore"; 
import { MySelfForm } from "@/components/student/MySelfForm"; // Import the form

interface StudentProfileViewProps {
  studentId: string;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => {
  if (value === undefined || value === null || value.trim() === "" || value.trim().toLowerCase() === "not provided") {
    // Show "Not Provided" explicitly if the value passed is "Not Provided" or empty after trim
    return (
      <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-foreground italic">Not Provided</p>
        </div>
      </div>
    );
  }
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
  const [isEditing, setIsEditing] = useState(false); // State for edit mode

  const fetchProfileData = useCallback(async () => {
    if (!studentId) {
      setError("No student ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    console.log("[StudentProfileView] Attempting to fetch profile for studentId:", studentId);
    try {
      const profileDocRef = doc(db, "studentProfiles", studentId);
      const profileDocSnap = await getDoc(profileDocRef);
      
      if (profileDocSnap.exists()) {
        const fetchedData = profileDocSnap.data();
        console.log("[StudentProfileView] Fetched data from Firestore for studentId " + studentId + ":", fetchedData); 
        setProfile({ uid: profileDocSnap.id, ...fetchedData } as StudentProfile);
      } else {
        console.warn("[StudentProfileView] No document found for studentId:", studentId);
        setError("Student profile not found.");
        setProfile(null);
      }
    } catch (err: any) {
      console.error("[StudentProfileView] Error fetching student profile for studentId " + studentId + ":", err);
      setError("Failed to load student profile. Please try again later.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleSaveSuccess = () => {
    setIsEditing(false);
    fetchProfileData(); // Refetch data to show updates
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "??";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not Provided";
    try {
      const date = new Date(dateString + 'T00:00:00'); 
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader className="items-center text-center pb-6">
           <Skeleton className="h-32 w-32 rounded-full" />
           <Skeleton className="h-8 w-1/2 mt-4" />
           <Skeleton className="h-4 w-1/4 mt-2" />
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (error && !isEditing) { // Only show main error if not in edit mode
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
  
  if (!profile && !isEditing) { // Only show if not editing and profile is truly null
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

  if (isEditing) {
    return (
      <MySelfForm 
        studentIdForEdit={studentId} 
        onSaveSuccess={handleSaveSuccess}
        isTeacherEditing={true}
      />
      // Optionally add a cancel button here outside the form, or MySelfForm could have its own.
      // For simplicity, relying on MySelfForm's structure for now.
      // We can add a cancel button here:
      // <Button variant="outline" onClick={() => setIsEditing(false)} className="mt-4">Cancel</Button>
    );
  }


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl overflow-hidden">
      <CardHeader className="items-center text-center pb-6">
        <div className="flex justify-end w-full px-4 pt-2"> {/* Edit button top right */}
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </div>
        <Avatar className="h-32 w-32 border-4 border-background shadow-md">
          <AvatarImage src={profile?.photoUrl || `https://placehold.co/128x128.png?text=${getInitials(profile?.firstName, profile?.lastName)}`} alt={`${profile?.firstName} ${profile?.lastName || ''}`} data-ai-hint="profile avatar"/>
          <AvatarFallback className="text-4xl">{getInitials(profile?.firstName, profile?.lastName)}</AvatarFallback>
        </Avatar>
        <CardTitle className="mt-4 text-3xl font-bold text-primary">
          {profile?.firstName} {profile?.middleName || ''} {profile?.lastName || ''}
        </CardTitle>
        <CardDescription className="text-md">
          Grade: {profile?.grade || "N/A"} {profile?.division || "N/A"}
        </CardDescription>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
            {profile?.email && <Badge variant="outline">{profile.email}</Badge>}
            {profile?.contactNumber && <Badge variant="outline">{profile.contactNumber}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <DetailItem icon={User} label="Full Name" value={`${profile?.firstName || ""} ${profile?.middleName || ''} ${profile?.lastName || ''}`.trim()} />
        <DetailItem icon={User} label="Mother's Name" value={profile?.motherName || "Not Provided"} />
        <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
        <DetailItem icon={Users} label="Gender" value={profile?.gender || "Not Provided"} /> 
        <DetailItem icon={Mail} label="Email" value={profile?.email || "Not Provided"} />
        <DetailItem icon={Phone} label="Contact Number" value={profile?.contactNumber || "Not Provided"} />
        <DetailItem icon={Award} label="Grade & Division" value={profile ? `Grade ${profile.grade} - ${profile.division}` : "N/A"} />
        <DetailItem icon={CalendarDays} label="Religion" value={profile?.religion || "Not Provided"} />
        <DetailItem icon={UserCircle} label="Caste" value={profile?.caste || "Not Provided"} />
        <DetailItem icon={ShieldCheck} label="Aadhar Card Number" value={profile?.aadharCardNumber || "Not Provided"} />
        <DetailItem icon={BookUser} label="PEN Number" value={profile?.penNumber || "Not Provided"} />
        <DetailItem icon={Hash} label="G.R. Number" value={profile?.grNumber || "Not Provided"} />
        <DetailItem icon={MapPin} label="Full Address" value={profile?.fullAddress || "Not Provided"} />
      </CardContent>
       {isEditing && ( // Also show cancel button if StudentProfileView manages the toggle
        <div className="p-6 flex justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
        </div>
      )}
    </Card>
  );
}
