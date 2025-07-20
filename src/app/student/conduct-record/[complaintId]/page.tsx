
"use client";

import { Suspense } from 'react';
import { ComplaintDetailsClient } from "@/components/student/ComplaintDetailsClient";
import { Loader2 } from 'lucide-react';

interface ComplaintDetailsPageProps {
    params: {
      complaintId: string;
    };
}

export default function ComplaintDetailsPage({ params }: ComplaintDetailsPageProps) {
  return (
    <Suspense fallback={
        <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading complaint details...
        </div>
    }>
      <ComplaintDetailsClient complaintId={params.complaintId} />
    </Suspense>
  );
}
