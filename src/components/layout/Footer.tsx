"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {currentYear} PM SHRI MPS VARSHA NAGAR, Vikhroli West, Mumbai 79. All rights reserved.
        </p>
        <p className="mt-1">
          Powered by <Link href="#" className="font-medium hover:text-primary transition-colors">CampusConnect</Link>
        </p>
      </div>
    </footer>
  );
}
