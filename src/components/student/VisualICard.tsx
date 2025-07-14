
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { StudentProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { School, User, Calendar, MapPin, Phone, Download, Loader2, Hash } from "lucide-react";
import html2canvas from "html2canvas";

const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  udise: "27220600119",
};

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
  <div className="flex items-start text-sm space-x-2">
    <Icon className="w-4 h-4 mt-0.5 text-blue-800 flex-shrink-0" />
    <div className="flex-grow">
      <p className="font-bold text-gray-700">{label}:</p>
      <p className="text-gray-600 leading-tight">{value || "N/A"}</p>
    </div>
  </div>
);


export function VisualICard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const iCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        setLoading(true);
        const profileDocRef = doc(db, "studentProfiles", user.uid);
        const profileDocSnap = await getDoc(profileDocRef);
        if (profileDocSnap.exists()) {
          setProfile(profileDocSnap.data() as StudentProfile);
        } else {
          // Fallback data if profile is not filled out
          setProfile({
            uid: user.uid,
            firstName: user.displayName?.split(' ')[0] || "Student",
            lastName: user.displayName?.split(' ').slice(1).join(' ') || "",
            grade: user.grade || "N/A",
            division: user.division || "N/A",
            email: user.email || "N/A",
            photoUrl: user.photoURL || undefined
          });
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);
  
  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "S";
  };

  const handleDownload = useCallback(() => {
    if (iCardRef.current) {
        setIsDownloading(true);
      html2canvas(iCardRef.current, { 
        useCORS: true,
        scale: 2.5, // Increase resolution for better quality
        backgroundColor: null, // Use component's background
        logging: true,
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = `icard_${profile?.firstName || 'student'}_${profile?.lastName || ''}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setIsDownloading(false);
      }).catch(err => {
        console.error("Error generating I-Card image:", err);
        setIsDownloading(false);
      });
    }
  }, [iCardRef, profile]);

  if (loading) {
    return (
        <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-[26rem] w-[17rem] rounded-lg" />
            <Skeleton className="h-10 w-40" />
        </div>
    );
  }

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        ref={iCardRef}
        className="h-[26rem] w-[17rem] rounded-xl shadow-2xl bg-white flex flex-col"
        style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}
      >
        {/* Header */}
        <div className="bg-blue-700 text-white p-2 text-center flex-grow-0">
          <div className="flex items-center justify-center gap-2">
            <School className="w-6 h-6" />
            <h2 className="text-sm font-bold uppercase tracking-wider">{schoolInfo.name}</h2>
          </div>
          <p className="text-xs opacity-80">{schoolInfo.address}</p>
        </div>

        {/* Main Body */}
        <div className="flex-grow flex flex-col bg-white pt-4 px-3 pb-3">
          {/* Avatar and Name Section */}
          <div className="flex-grow-0 flex flex-col items-center -mt-12">
            <Avatar className="h-28 w-28 border-4 border-blue-200 shadow-lg bg-white">
                <AvatarImage src={profile?.photoUrl} alt={fullName} />
                <AvatarFallback className="text-4xl bg-gray-200 text-gray-600">
                    {getInitials(profile?.firstName, profile?.lastName)}
                </AvatarFallback>
            </Avatar>
            <div className="text-center mt-3">
                <p className="font-extrabold text-xl text-blue-900 uppercase">{fullName}</p>
                <p className="text-base font-semibold text-gray-600">
                    Grade: {profile?.grade} - {profile?.division}
                </p>
            </div>
          </div>
          
          {/* Details Section */}
          <div className="mt-4 space-y-2.5 text-left w-full flex-grow">
              <DetailRow icon={Hash} label="PEN Number" value={profile?.penNumber} />
              <DetailRow icon={Calendar} label="D.O.B" value={profile?.dateOfBirth} />
              <DetailRow icon={Phone} label="Contact" value={profile?.contactNumber} />
              <DetailRow icon={MapPin} label="Address" value={profile?.fullAddress} />
          </div>
        </div>


        {/* Footer */}
        <div className="bg-blue-700 text-white text-center p-1.5 mt-auto flex-grow-0">
            <p className="text-xs font-mono">UDISE: {schoolInfo.udise}</p>
        </div>
      </div>

      <Button onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Download I-Card
      </Button>
    </div>
  );
}
