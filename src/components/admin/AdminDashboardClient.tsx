
"use client";

import { useState, useEffect } from "react";
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
  ArrowRight,
  Landmark,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function AdminDashboardClient() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    staff: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
        const staffQuery = query(collection(db, "staff"));

        const [teachersSnap, studentsSnap, staffSnap] = await Promise.all([
          getCountFromServer(teachersQuery),
          getCountFromServer(studentsQuery),
          getCountFromServer(staffQuery),
        ]);

        setStats({
          teachers: teachersSnap.data().count,
          students: studentsSnap.data().count,
          staff: staffSnap.data().count,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Teachers",
      count: stats.teachers,
      icon: User,
      color: "bg-orange-100 dark:bg-orange-900/50",
      iconColor: "text-orange-500",
      link: "#",
    },
    {
      title: "Total Students",
      count: stats.students,
      icon: GraduationCap,
      color: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-500",
      link: "/admin/manage-users",
    },
    {
      title: "Total Staffs",
      count: stats.staff,
      icon: Users,
      color: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-500",
      link: "#",
    },
    {
      title: "Total Vehicle",
      count: 10, // Static data
      icon: Bus,
      color: "bg-yellow-100 dark:bg-yellow-900/50",
      iconColor: "text-yellow-500",
      link: "#",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* School Info Banner */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title} className={cn("shadow-sm", card.color)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                <p className="text-3xl font-bold">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin"/> : card.count}</p>
                <Link href={card.link} className="text-xs text-primary hover:underline">See Details &gt;</Link>
              </div>
              <div className={cn("p-3 rounded-full", card.color)}>
                <card.icon className={cn("h-6 w-6", card.iconColor)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Bills & Payment and Exam Results */}
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
