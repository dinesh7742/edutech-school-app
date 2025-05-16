import { StudentProfileView } from "@/components/teacher/StudentProfileView";

interface StudentProfilePageProps {
  params: {
    studentId: string;
  };
}

export default function TeacherStudentProfilePage({ params }: StudentProfilePageProps) {
  return (
    <div className="py-4">
      <StudentProfileView studentId={params.studentId} />
    </div>
  );
}
