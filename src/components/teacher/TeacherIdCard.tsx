
"use client";

import type { AppUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, Phone, BookOpen, Mail, MapPin, Building, User } from "lucide-react";

interface TeacherIdCardProps {
    teacher: AppUser;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start text-sm space-x-2">
        <Icon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
        <p><span className="font-medium text-muted-foreground">{label}:</span> <span className="text-foreground">{value}</span></p>
    </div>
  )
};


export function TeacherIdCard({ teacher }: TeacherIdCardProps) {
    
    const getInitials = (name?: string | null) => {
        if (!name) return "?";
        const parts = name.split(" ");
        return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="w-full p-4 rounded-lg bg-white text-black shadow-lg border border-gray-200">
            <div className="text-center border-b-2 border-primary pb-2">
                <h3 className="text-xl font-bold text-primary">TEACHER IDENTITY CARD</h3>
                <p className="text-xs text-muted-foreground">PM SHRI MPS VARSHA NAGAR</p>
            </div>
            <div className="flex flex-col items-center gap-4 mt-4">
                <Avatar className="h-32 w-32 rounded-md border-4 border-primary/20 shadow-md">
                    <AvatarImage src={teacher.photoURL || undefined} alt={teacher.displayName || 'Teacher'} className="rounded-md" />
                    <AvatarFallback className="text-4xl rounded-md bg-muted">{getInitials(teacher.displayName)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{teacher.displayName}</p>
                    <div className="flex items-center justify-center text-sm text-muted-foreground gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span>Teacher (Grade: {teacher.grade}-{teacher.division})</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 space-y-3">
                 <DetailRow icon={GraduationCap} label="Qualification" value={teacher.educationQualification} />
                 <DetailRow icon={BookOpen} label="Subject" value={teacher.subjectTaught} />
                 <DetailRow icon={Phone} label="Contact" value={teacher.whatsAppNumber} />
                 <DetailRow icon={Mail} label="Email" value={teacher.email} />
                 <DetailRow icon={MapPin} label="Address" value={teacher.address} />
            </div>
        </div>
    )
}
