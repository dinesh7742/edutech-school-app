
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
import Image from "next/image";

const schoolInfo = {
  nameLine1: "PM SHRI MPS",
  nameLine2: "VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  logoUrl: "https://i.postimg.cc/8P0y0gxz/MCGM_Seal.jpg", // Using existing school seal
  principalSignatureUrl: "https://i.postimg.cc/RVTd9gV3/principal-sign.png",
};

const DetailRow = ({ label, value }: { label: string, value?: string }) => (
  <div>
    <span className="font-bold text-white/90">{label}</span>
    <span className="text-white"> - {value || "N/A"}</span>
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
        scale: 3, // Increase resolution for better quality
        backgroundColor: null, 
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
            <Skeleton className="h-[28rem] w-[18rem] rounded-lg" />
            <Skeleton className="h-10 w-40" />
        </div>
    );
  }

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim().toUpperCase();

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        ref={iCardRef}
        className="h-[28rem] w-[18rem] rounded-2xl shadow-2xl bg-white flex flex-col overflow-hidden relative"
        style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}
      >
        {/* Background Waves */}
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-0 left-0 w-[200%] h-full bg-blue-500/80 rounded-br-[100%]" style={{top: '40%', left: '-50%'}}></div>
            <div className="absolute top-0 left-0 w-[200%] h-full bg-blue-600 rounded-br-[100%]" style={{top: '45%', left: '-50%'}}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <p className="text-2xl font-black text-pink-600 tracking-wide">{schoolInfo.nameLine1}</p>
                    <p className="text-lg font-bold text-blue-900 -mt-1">{schoolInfo.nameLine2}</p>
                    <div className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-md mt-1 inline-block">
                        {schoolInfo.address}
                    </div>
                </div>
                <div className="bg-white p-1 rounded-full shadow-md">
                    <Image src={schoolInfo.logoUrl} alt="School Logo" width={48} height={48} className="rounded-full"/>
                </div>
            </div>

            {/* Photo */}
            <div className="flex justify-center my-4">
                <div className="bg-white p-1.5 rounded-lg shadow-lg border-2 border-pink-300">
                    <Image 
                        src={profile?.photoUrl || `https://placehold.co/150x150/E9D5FF/4C1D95?text=${getInitials(profile?.firstName, profile?.lastName)}`}
                        alt={fullName}
                        width={130}
                        height={130}
                        className="rounded-md object-cover bg-pink-100"
                        data-ai-hint="profile photo"
                    />
                </div>
            </div>

            {/* Details */}
            <div className="mt-auto text-left text-sm space-y-1.5 text-white">
                <p className="text-2xl font-extrabold tracking-wider">{fullName}</p>
                <DetailRow label="Father's Name" value={profile?.motherName ? profile.motherName.replace(/.+\s/, '') : 'N/A'}/>
                <DetailRow label="Aadhaar" value={profile?.aadharCardNumber} />
                <DetailRow label="Roll No." value={profile?.penNumber} />
                <DetailRow label="D.O.B." value={profile?.dateOfBirth ? format(new Date(profile.dateOfBirth + 'T00:00:00'), "dd-MM-yyyy") : "N/A"} />
                <DetailRow label="Address" value={profile?.fullAddress} />
                <div className="flex items-center gap-2 bg-white text-blue-600 font-bold px-3 py-1 rounded-full w-fit mt-2 shadow-inner">
                    <Phone className="h-4 w-4"/>
                    <span>{profile?.contactNumber || "N/A"}</span>
                </div>
            </div>
            
            {/* Vertical Class & Signature */}
            <div className="absolute right-2 bottom-4 flex flex-col items-center">
                 <p className="text-pink-600 font-extrabold text-xl" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Class - {profile?.grade}
                 </p>
                 <Image src={schoolInfo.principalSignatureUrl} alt="Principal Signature" width={80} height={40} className="mt-4" />
                 <p className="text-xs font-bold text-gray-700">Principal</p>
            </div>

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
