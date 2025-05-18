
import { LeaveApplicationForm } from "@/components/student/LeaveApplicationForm";

export default function ApplyLeavePage() {
  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Apply for Leave</h1>
      <LeaveApplicationForm />
    </div>
  );
}
