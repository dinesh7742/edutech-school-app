
import { WelcomeBoardAttendanceCalendar } from "@/components/shared/WelcomeBoardAttendanceCalendar";

export default function WelcomeBoardPage() {
  return (
    <div className="min-h-screen w-full p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary flex flex-col items-center justify-center">
      <WelcomeBoardAttendanceCalendar />
    </div>
  );
}
