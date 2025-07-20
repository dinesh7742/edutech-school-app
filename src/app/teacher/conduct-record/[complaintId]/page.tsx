
import { Suspense } from 'react';
import { ComplaintDetailsClient } from "@/components/student/ComplaintDetailsClient";
import { Loader2 } from 'lucide-react';

interface ComplaintDetailsPageProps {
    params: {
      complaintId: string;
    };
}

// This page wrapper allows a server component to correctly handle params
// and pass them to the client component responsible for rendering.
export default function TeacherComplaintDetailsPage({ params }: ComplaintDetailsPageProps) {
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
