"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { School, LogOut, User, LayoutDashboard, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState } from "react";

const schoolName = "PM SHRI MPS VARSHA NAGAR"; // Shortened for brevity in UI

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
      {/* Add more role-specific links here if needed */}
    </>
  ) : null;

  const navLinks = user ? (
    <>
      <Button variant="ghost" asChild>
        <Link href={role === 'student' ? '/student/dashboard' : '/teacher/dashboard'}>Dashboard</Link>
      </Button>
      {role === 'student' && (
        <Button variant="ghost" asChild>
          <Link href="/student/profile">My Profile</Link>
        </Button>
      )}
       {role === 'teacher' && (
         <>
          <Button variant="ghost" asChild>
            <Link href="/teacher/post-content">Post Content</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/teacher/student-data">Student Data</Link>
          </Button>
         </>
      )}
    </>
  ) : (
    <>
      <Button variant="ghost" asChild>
        <Link href="/login">Login</Link>
      </Button>
      <Button asChild>
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );
  
  const mobileNavLinks = (
    <div className="flex flex-col space-y-2 pt-4">
      {user ? (
        <>
          <Link href={role === 'student' ? '/student/dashboard' : '/teacher/dashboard'} className="block px-4 py-2 text-sm hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          {role === 'student' && <Link href="/student/profile" className="block px-4 py-2 text-sm hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>}
          {role === 'teacher' && (
            <>
              <Link href="/teacher/post-content" className="block px-4 py-2 text-sm hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Post Content</Link>
              <Link href="/teacher/student-data" className="block px-4 py-2 text-sm hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Student Data</Link>
            </>
          )}
          <Button variant="ghost" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start px-4 py-2 text-sm">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </>
      ) : (
        <>
          <Link href="/login" className="block px-4 py-2 text-sm hover:bg-accent rounded-md" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          <Link href="/signup" className="block px-4 py-2 text-sm hover:bg-accent rounded-md bg-primary text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
        </>
      )}
    </div>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <School className="h-7 w-7 text-primary" />
          <span className="font-semibold text-lg whitespace-nowrap truncate" title="PM SHRI MPS VARSHA NAGAR VIKHROLI WEST MUMBAI 79">{schoolName}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {navLinks}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
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
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="p-4">
                <Link href="/" className="flex items-center gap-2 mb-4" onClick={() => setMobileMenuOpen(false)}>
                  <School className="h-6 w-6 text-primary" />
                  <span className="font-semibold text-md">{schoolName}</span>
                </Link>
                {mobileNavLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
