
"use client";
import { Suspense } from 'react';
import { OtherApplicationForm } from "@/components/student/OtherApplicationForm";
import { useSearchParams } from "next/navigation";
import { otherApplicationTypeLabels, type OtherApplicationType } from "@/types";
import { Loader2, FileSignature } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function SubmitPageContent() {
  const searchParams = useSearchParams();
  const formType = searchParams.get("formType") as OtherApplicationType | null;

  if (!formType || !otherApplicationTypeLabels[formType]) {
    return (
      <Card className="shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Invalid Application Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The selected application type is not valid. Please go back and select a valid form.</p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/student/other-applications">Go Back</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  const formTitle = otherApplicationTypeLabels[formType];

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <FileSignature className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Submit: {formTitle}</h1>
      </div>
      <OtherApplicationForm formType={formType} formTitle={formTitle} />
    </div>
  );
}

export default function OtherApplicationSubmitPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading form...</div>}>
      <SubmitPageContent />
    </Suspense>
  );
}

// Minimal Button and CardContent for Suspense fallback or error states if needed outside main component
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {asChild?: boolean; variant?: string}) => <button {...props}>{children}</button>;
const CardContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const Link = ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>;
