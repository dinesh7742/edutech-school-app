
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, LayoutDashboard, Menu as MenuIcon, School, Phone, Mail, Info, Building, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // Added SheetHeader, SheetTitle
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState } from "react";
import Image from "next/image";

// School Information
const schoolName = "PM SHRI MPS VARSHA NAGAR";
const contactNumber = "+917506137742";
const emailAddress = "varshanagarmps@gmail.com";
const udiseNumber = "27220600119";
const wardInfo = "S ward";
const addressInfo = "Veer savarkar marg,Beside Prabodhankar Thakare Garden,Kailas complex, Varsha nagar bus stop Vikhroli west Mumbai - 79";

const headerImageUrl = "https://placehold.co/1230x220.png";


export function Navbar() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const commonLinks = user ? (
    <>
      <DropdownMenuItem onSelect={() => router.push(role === 'student' ? '/student/dashboard' : '/teacher/dashboard')}>
        <LayoutDashboard className="mr-2 h-4 w-4" />
        Dashboard
      </DropdownMenuItem>
      {role === 'student' && (
        <DropdownMenuItem onSelect={() => router.push('/student/profile')}>
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
      )}
      {role === 'teacher' && (
        <DropdownMenuItem onSelect={() => router.push('/teacher/profile')}>
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
      )}
    </>
  ) : null;

  const navLinks = user ? (
    <>
      <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
        <Link href={role === 'student' ? '/student/dashboard' : '/teacher/dashboard'}>Dashboard</Link>
      </Button>
      {role === 'student' && (
        <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
          <Link href="/student/profile">My Profile</Link>
        </Button>
      )}
       {role === 'teacher' && (
         <>
          <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
            <Link href="/teacher/post-content">Post Content</Link>
          </Button>
          <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
            <Link href="/teacher/student-data">Student Data</Link>
          </Button>
          <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
            <Link href="/teacher/profile">My Profile</Link>
          </Button>
         </>
      )}
    </>
  ) : (
    <>
      <Button variant="ghost" asChild className="text-base text-primary-foreground hover:text-primary-foreground/80">
        <Link href="/login">Login</Link>
      </Button>
      <Button asChild className="text-base bg-background text-foreground hover:bg-background/90">
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );

  const mobileNavLinks = (
    <div className="flex flex-col space-y-2 pt-2">
      {user ? (
        <>
          <Link href={role === 'student' ? '/student/dashboard' : '/teacher/dashboard'} className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          {role === 'student' && <Link href="/student/profile" className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>}
          {role === 'teacher' && (
            <>
              <Link href="/teacher/post-content" className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Post Content</Link>
              <Link href="/teacher/student-data" className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Student Data</Link>
              <Link href="/teacher/profile" className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
            </>
          )}
          <Button variant="ghost" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start px-4 py-2 text-base">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </>
      ) : (
        <>
          <Link href="/login" className="block px-4 py-2 text-base hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          <Link href="/signup" className="block px-4 py-2 text-base hover:bg-accent rounded-md bg-primary text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
        </>
      )}
    </div>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground">
      <div className="container flex h-auto min-h-[80px] py-3 items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
            <Image src={headerImageUrl} alt={`${schoolName} Header`} width={1230} height={220} className="block h-14 sm:h-16 w-auto object-contain" priority data-ai-hint="school banner"/>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-primary-foreground hover:bg-primary-foreground/10">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">{role}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {commonLinks}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <MenuIcon className="h-7 w-7" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-card text-card-foreground flex flex-col p-0">
              <SheetHeader className="p-4 border-b text-left">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <School className="h-6 w-6 text-primary" /> 
                  {schoolName}
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 flex-grow overflow-y-auto">
                {mobileNavLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

