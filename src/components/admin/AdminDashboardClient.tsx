
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
import type { AppUser, StudentProfile } from "@/types";
import { TeacherIdCard } from "@/components/teacher/TeacherIdCard";


const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  email: "varshanagarmps@gmail.com",
  phone: "+917506137742",
  logoUrl: "https://i.postimg.cc/8P0y0gxz/MCGM-Seal.jpg",
  estd: 1982
};

const billingsData = [
  { date: "Nov 1, 2024", opening: 47000, collection: 52000, expenses: 12000, closing: 87000 },
  { date: "Oct 1, 2024", opening: 49000, collection: 5500, expenses: 7500, closing: 47000 },
  { date: "Sep 1, 2024", opening: 40000, collection: 17000, expenses: 8000, closing: 49000 },
];

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

export function AdminDashboardClient() {
  const { user, signOut } = useAuth();
  const [teachers, setTeachers] = useState<TeacherWithClassStats[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStatsAndTeachers = async () => {
      setLoadingStats(true);
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const studentsQuery = query(collection(db, "studentProfiles"));
        const staffQuery = query(collection(db, "staff"));

        const [teachersSnap, studentsSnap, staffSnap] = await Promise.all([
          getDocs(teachersQuery),
          getDocs(studentsQuery),
          getDocs(staffQuery),
        ]);

        const studentsData = studentsSnap.docs.map(doc => doc.data() as StudentProfile);
        const studentCountsByClass: Record<string, { total: number; boys: number; girls: number }> = {};

        studentsData.forEach(student => {
          const classId = `${student.grade}-${student.division}`;
          if (!studentCountsByClass[classId]) {
            studentCountsByClass[classId] = { total: 0, boys: 0, girls: 0 };
          }
          studentCountsByClass[classId].total++;
          if (student.gender === 'Male') studentCountsByClass[classId].boys++;
          if (student.gender === 'Female') studentCountsByClass[classId].girls++;
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
          staff: staffSnap.size,
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
              <DropdownMenuItem onSelect={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden bg-gradient-to-r from-blue-500 to-yellow-400 text-white">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-orange-500"/>All Teachers ({teachers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
            ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {teachers.map(teacher => (
                <Dialog key={teacher.uid}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-100/50 dark:bg-orange-900/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={teacher.photoURL ?? undefined} />
                        <AvatarFallback>{getInitials(teacher.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto text-base font-semibold text-foreground hover:underline">
                            {teacher.displayName}
                          </Button>
                        </DialogTrigger>
                        <p className="text-xs text-muted-foreground">Class: {teacher.grade}-{teacher.division}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{teacher.classStats.total}</p>
                      <p className="text-xs text-muted-foreground">Students ({teacher.classStats.boys}B, {teacher.classStats.girls}G)</p>
                    </div>
                  </div>
                  <DialogContent className="max-w-md">
                     <DialogHeader>
                      <DialogTitle>Teacher I-Card</DialogTitle>
                     </DialogHeader>
                     <TeacherIdCard teacher={teacher} />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className={cn("shadow-sm", "bg-green-100 dark:bg-green-900/50")}>
                <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                    <p className="text-3xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.students}</p>
                    <Link href="/admin/manage-users" className="text-xs text-primary hover:underline">See Details &gt;</Link>
                </div>
                <div className={cn("p-3 rounded-full", "bg-green-100 dark:bg-green-900/50")}>
                    <GraduationCap className={cn("h-6 w-6", "text-green-500")} />
                </div>
                </CardContent>
            </Card>
            <Card className={cn("shadow-sm", "bg-blue-100 dark:bg-blue-900/50")}>
                <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Staffs</p>
                    <p className="text-3xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : stats.staff}</p>
                    <Link href="#" className="text-xs text-primary hover:underline">See Details &gt;</Link>
                </div>
                <div className={cn("p-3 rounded-full", "bg-blue-100 dark:bg-blue-900/50")}>
                    <Users className={cn("h-6 w-6", "text-blue-500")} />
                </div>
                </CardContent>
            </Card>
            <Card className={cn("shadow-sm", "bg-yellow-100 dark:bg-yellow-900/50")}>
                <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Vehicle</p>
                    <p className="text-3xl font-bold">10</p>
                    <Link href="#" className="text-xs text-primary hover:underline">See Details &gt;</Link>
                </div>
                <div className={cn("p-3 rounded-full", "bg-yellow-100 dark:bg-yellow-900/50")}>
                    <Bus className={cn("h-6 w-6", "text-yellow-500")} />
                </div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary"/>Bills & Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opening</TableHead>
                        <TableHead>Collection</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead>Closing</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {billingsData.map((row) => (
                        <TableRow key={row.date}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.opening.toLocaleString()}</TableCell>
                            <TableCell>{row.collection.toLocaleString()}</TableCell>
                            <TableCell>{row.expenses.toLocaleString()}</TableCell>
                            <TableCell>{row.closing.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
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
