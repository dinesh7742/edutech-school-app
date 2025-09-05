"use client";

import { useAuth } from "@/context/AuthContext";
import type { StudentProfile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { School, User, Hash, Phone, ArrowRightCircle } from "lucide-react";
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
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-grow">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </CardContent>
        </Card>
    )
  }
  
  if (!profile) return null;

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <Card className="shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-tr from-background to-muted/30 border-primary/10 transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1">
        <CardContent className="p-4 flex items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={profile?.photoUrl} alt={fullName} />
                    <AvatarFallback className="text-2xl bg-muted">
                        {getInitials(profile?.firstName, profile?.lastName)}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-primary">{fullName}</h2>
                    <div className="flex items-center text-sm space-x-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium"><School className="h-4 w-4"/> Grade {profile.grade}-{profile.division}</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium"><Hash className="h-4 w-4"/> GR No: {profile.grNumber || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <Link href="/student/icard" className="group">
                <div className="flex flex-col items-center text-primary/80 hover:text-primary transition-colors">
                    <ArrowRightCircle className="h-8 w-8 transition-transform group-hover:scale-110"/>
                    <span className="text-xs font-semibold">View I-Card</span>
                </div>
            </Link>
        </CardContent>
    </Card>
  );
}
