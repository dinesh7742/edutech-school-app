
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  User,
  GraduationCap,
  Bus,
  Bell,
  LogOut,
  MapPin,
  Mail,
  Phone,
  BarChart,
  Landmark,
  Loader2,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
  } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import type { AppUser, StudentProfile, LeaveApplication } from "@/types";
import { TeacherIdCard } from "@/components/teacher/TeacherIdCard";
import { format, parseISO } from "date-fns";


const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  email: "varshanagarmps@gmail.com",
  phone: "+917506137742",
  logoUrl: "https://i.postimg.cc/8P0y0gxz/MCGM-Seal.jpg",
  estd: 1982
};

const chartData = [
    { name: 'Passed', value: 783, fill: 'hsl(var(--chart-1))' },
    { name: 'Failed', value: 119, fill: 'hsl(var(--chart-2))' },
]

interface TeacherWithClassStats extends AppUser {
  classStats: {
    total: number;
    boys: number;
    girls: number;
  }
}

interface GradeStats {
    [grade: string]: number;
}


export function AdminDashboardClient() {
  const { user, signOutUser } = useAuth();
  const [teachers, setTeachers] = useState<TeacherWithClassStats[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    teachers: 0,
    teachersOnLeave: 0,
    gradeStats: {} as GradeStats,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStatsAndTeachers = async () => {
      setLoadingStats(true);
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const studentsQuery = query(collection(db, "studentProfiles"));
        const staffQuery = query(collection(db, "staff"));

        const today = format(new Date(), "yyyy-MM-dd");
        // Updated query to fetch all approved leave applications
        const leaveQuery = query(
          collection(db, "leaveApplications"),
          where("status", "==", "Approved")
        );


        const [teachersSnap, studentsSnap, staffSnap, leaveSnap] = await Promise.all([
          getDocs(teachersQuery),
          getDocs(studentsQuery),
          getDocs(staffQuery),
          getDocs(leaveQuery),
        ]);

        // Filter leave applications on the client-side for the date
        const todaysLeaveApps = leaveSnap.docs.filter(doc => {
            const data = doc.data() as LeaveApplication;
            // A leave is active if today is between start and end date (inclusive)
            return data.leaveStartDate <= today && today <= data.leaveEndDate;
        });

        const studentsData = studentsSnap.docs.map(doc => doc.data() as StudentProfile);
        const studentCountsByClass: Record<string, { total: number; boys: number; girls: number }> = {};
        const gradeStats: GradeStats = {};

        studentsData.forEach(student => {
          const classId = `${student.grade}-${student.division}`;
          if (!studentCountsByClass[classId]) {
            studentCountsByClass[classId] = { total: 0, boys: 0, girls: 0 };
          }
          studentCountsByClass[classId].total++;
          if (student.gender === 'Male') studentCountsByClass[classId].boys++;
          if (student.gender === 'Female') studentCountsByClass[classId].girls++;
          
          if (student.grade) {
              gradeStats[student.grade] = (gradeStats[student.grade] || 0) + 1;
          }
        });

        const teachersData: TeacherWithClassStats[] = teachersSnap.docs.map(doc => {
          const teacher = doc.data() as AppUser;
          const classId = `${teacher.grade}-${teacher.division}`;
          return {
            ...teacher,
            classStats: studentCountsByClass[classId] || { total: 0, boys: 0, girls: 0 }
          };
        });

        setTeachers(teachersData);
        setStats({
          students: studentsSnap.size,
          staff: teachersSnap.size + staffSnap.size,
          teachers: teachersSnap.size,
          teachersOnLeave: todaysLeaveApps.length,
          gradeStats,
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStatsAndTeachers();
  }, []);
  
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const statCards = [
    {
      title: "Total Students",
      value: loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.students,
      icon: GraduationCap,
      color: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-500",
      link: "/admin/manage-users",
    },
     {
      title: "Total Teachers",
      value: loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.teachers,
      icon: User,
      color: "bg-orange-100 dark:bg-orange-900/50",
      iconColor: "text-orange-500",
      link: "/admin/manage-staff",
    },
    {
      title: "Total Staff",
      value: loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.staff,
      icon: Users,
      color: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-500",
      link: "/admin/manage-staff",
    },
    {
      title: "Teachers on Leave Today",
      value: loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.teachersOnLeave,
      icon: UserCheck,
      color: "bg-yellow-100 dark:bg-yellow-900/50",
      iconColor: "text-yellow-500",
      link: "/teacher/leave-applications",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
          Welcome to {schoolInfo.name}
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Admin"}/>
                        <AvatarFallback>{user?.displayName?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                        <p className="text-sm font-medium">{schoolInfo.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.displayName}</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={signOutUser}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden bg-gradient-to-r from-blue-500 to-yellow-400 text-white border border-border">
        <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">{schoolInfo.name} (Estd: {schoolInfo.estd})</h2>
                <div className="flex items-center gap-2"><MapPin className="h-5 w-5"/>{schoolInfo.address}</div>
                <div className="flex items-center gap-2"><Mail className="h-5 w-5"/>{schoolInfo.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-5 w-5"/>{schoolInfo.phone}</div>
            </div>
            <div className="flex-shrink-0">
                <Image src={schoolInfo.logoUrl} alt="School Logo" width={100} height={100} className="rounded-full bg-white p-2" data-ai-hint="school logo"/>
            </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
            <Card key={card.title} className={cn("shadow-sm border border-border", card.color)}>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                            <p className="text-3xl font-bold">{card.value}</p>
                        </div>
                        <div className={cn("p-3 rounded-full flex-shrink-0", card.color)}>
                            <card.icon className={cn("h-6 w-6", card.iconColor)} />
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-4 w-full bg-background/50 border-primary/20 hover:bg-background/80">
                        <Link href={card.link} >
                            See Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary"/>Student Statistics</CardTitle>
          </CardHeader>
          <CardContent>
             {loadingStats ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
             ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: 8 }, (_, i) => i + 1).map(grade => (
                                <TableHead key={grade} className="text-center">Grade {grade}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                           {Array.from({ length: 8 }, (_, i) => i + 1).map(grade => (
                                <TableCell key={grade} className="text-center font-bold text-lg">
                                    {stats.gradeStats[grade] || 0}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
             )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border border-border">
            <CardHeader>
                <CardTitle>Exam Results</CardTitle>
                <CardDescription>The Terminal Examination 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                             {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                         <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
