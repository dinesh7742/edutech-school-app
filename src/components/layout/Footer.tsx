
"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-6 text-center text-sm text-muted-foreground">
        <p>
          copyright@Dinesh Sardar (BMC teacher)
        </p>
        <p className="mt-1">
          Powered by <Link href="#" className="font-medium hover:text-primary transition-colors">Edutech</Link>
        </p>
      </div>
    </footer>
  );
}
