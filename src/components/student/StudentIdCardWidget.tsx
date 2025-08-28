
"use client";

import { useAuth } from "@/context/AuthContext";
import type { StudentProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { School, User, Hash, Phone } from "lucide-react";
import Link from "next/link";

interface StudentIdCardWidgetProps {
  profile: StudentProfile | null;
  loading: boolean;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => (
  <div className="flex items-center text-sm space-x-2">
    <Icon className="w-4 h-4 text-primary/80 flex-shrink-0" />
    <span className="font-medium text-muted-foreground">{label}:</span>
    <span className="font-semibold text-foreground truncate">{value || "N/A"}</span>
  </div>
);

export function StudentIdCardWidget({ profile, loading }: StudentIdCardWidgetProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "S";
  };

  if (loading) {
    return (
        <Card className="shadow-lg rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-grow">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </CardContent>
        </Card>
    )
  }
  
  if (!profile) return null;

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <Card className="shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-tr from-background to-muted/30 border-primary/10">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
             <Link href="/student/icard">
                <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-md transition-transform duration-300 hover:scale-105">
                    <AvatarImage src={profile?.photoUrl} alt={fullName} />
                    <AvatarFallback className="text-4xl bg-muted">
                        {getInitials(profile?.firstName, profile?.lastName)}
                    </AvatarFallback>
                </Avatar>
            </Link>
            <div className="space-y-3 flex-grow text-center sm:text-left">
                <h2 className="text-2xl font-bold text-primary">{fullName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <DetailRow icon={School} label="Class" value={`${profile.grade}-${profile.division}`} />
                    <DetailRow icon={Hash} label="G.R. No." value={profile.grNumber} />
                    <DetailRow icon={User} label="Mother's Name" value={profile.motherName} />
                    <DetailRow icon={Phone} label="Contact" value={profile.contactNumber} />
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
