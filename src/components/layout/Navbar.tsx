
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, LayoutDashboard, Menu as MenuIcon, School, Phone, Mail, Hash, MapPin, Building } from "lucide-react";
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

const schoolName = "PM SHRI MPS VARSHA NAGAR";
const contactNumber = "+917506137742";
const emailAddress = "varshanagarmps@gmail.com";
const udiseNumber = "27220600119";
const wardInfo = "S Ward";
const addressInfo = "Veer savarkar marg, Beside Prabodhankar Thakare Garden, Kailas complex, Varsha nagar bus stop Vikhroli west Mumbai - 79";


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
      <Button variant="ghost" asChild className="text-base">
        <Link href={role === 'student' ? '/student/dashboard' : '/teacher/dashboard'}>Dashboard</Link>
      </Button>
      {role === 'student' && (
        <Button variant="ghost" asChild className="text-base">
          <Link href="/student/profile">My Profile</Link>
        </Button>
      )}
       {role === 'teacher' && (
         <>
          <Button variant="ghost" asChild className="text-base">
            <Link href="/teacher/post-content">Post Content</Link>
          </Button>
          <Button variant="ghost" asChild className="text-base">
            <Link href="/teacher/student-data">Student Data</Link>
          </Button>
          <Button variant="ghost" asChild className="text-base">
            <Link href="/teacher/profile">My Profile</Link>
          </Button>
         </>
      )}
    </>
  ) : (
    <>
      <Button variant="ghost" asChild className="text-base">
        <Link href="/login">Login</Link>
      </Button>
      <Button asChild className="text-base">
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );

  const mobileNavLinks = (
    <div className="flex flex-col space-y-2 pt-2"> {/* Reduced pt from 4 to 2 */}
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
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-auto py-3 items-start justify-between"> {/* Changed h-20 to h-auto py-3, items-center to items-start */}
        <Link href="/" className="flex items-start gap-3"> {/* Changed gap-2 to gap-3 */}
          <School className="h-10 w-10 text-primary mt-1 flex-shrink-0" /> {/* Adjusted size to match example image */}
          <div className="max-w-md">
            <span className="block font-semibold text-xl whitespace-nowrap" title="PM SHRI MPS VARSHA NAGAR VIKHROLI WEST MUMBAI 79">
              {schoolName}
            </span>
            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Phone size={12} className="flex-shrink-0" />
                <span>{contactNumber}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail size={12} className="flex-shrink-0" />
                <span>{emailAddress}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hash size={12} className="flex-shrink-0" />
                <span>UDISE: {udiseNumber}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building size={12} className="flex-shrink-0" />
                <span>Ward: {wardInfo}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                <span className="whitespace-normal">{addressInfo}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1 mt-1"> {/* Adjusted space-x-2 to space-x-1, added mt-1 */}
          {navLinks}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
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
        <div className="md:hidden mt-1"> {/* Added mt-1 */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-7 w-7" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
              <div className="p-4">
                <Link href="/" className="flex items-start gap-2 mb-3" onClick={() => setMobileMenuOpen(false)}> {/* Changed mb-4 to mb-3 */}
                  <School className="h-8 w-8 text-primary mt-0.5 flex-shrink-0" /> {/* Adjusted size for mobile */}
                  <div className="max-w-xs">
                    <span className="block font-semibold text-lg">{schoolName}</span>
                     <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Phone size={12} className="flex-shrink-0" />
                            <span>{contactNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Mail size={12} className="flex-shrink-0" />
                            <span>{emailAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Hash size={12} className="flex-shrink-0" />
                            <span>UDISE: {udiseNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Building size={12} className="flex-shrink-0" />
                            <span>Ward: {wardInfo}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                            <span className="whitespace-normal">{addressInfo}</span>
                        </div>
                    </div>
                  </div>
                </Link>
                <hr className="my-3"/> {/* Added separator */}
                {mobileNavLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
