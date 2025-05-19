
import { LateArrivalForm } from "@/components/student/LateArrivalForm";
import { AlertTriangle } from "lucide-react";

export default function StudentLateArrivalPage() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Late Arrival / Early Departure Request</h1>
      </div>
      <LateArrivalForm />
    </div>
  );
}
