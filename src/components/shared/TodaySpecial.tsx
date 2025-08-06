
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Sparkles } from 'lucide-react';

export interface SpecialDay {
  date: string; // YYYY-MM-DD
  name: string;
  description?: string;
}

// Expanded list of special days and festivals for 2025.
// In a real application, this would come from a database or API.
export const specialDays2025: SpecialDay[] = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-13', name: 'Lohri' },
  { date: '2025-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2025-01-15', name: 'Uttarayan' },
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-02-12', name: 'Vasant Panchami' },
  { date: '2025-02-26', name: 'Mahashivratri' },
  { date: '2025-03-14', name: 'Holi' },
  { date: '2025-03-15', name: 'Holi (Dhuleti)' },
  { date: '2025-03-29', name: 'Gudi Padwa / Ugadi' },
  { date: '2025-03-30', name: 'Ramadan Begins (Tentative)' },
  { date: '2025-04-06', name: 'Ram Navami' },
  { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti / Tamil New Year / Vishu' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-20', name: 'Easter Sunday' },
  { date: '2025-04-29', name: 'Eid-ul-Fitr (Tentative)' },
  { date: '2025-05-01', name: 'Maharashtra Day / May Day' },
  { date: '2025-05-05', name: 'Buddha Purnima' },
  { date: '2025-06-06', name: 'Eid-ul-Adha (Bakrid) (Tentative)' },
  { date: '2025-06-29', name: 'Rath Yatra' },
  { date: '2025-07-06', name: 'Ashadi Ekadashi' },
  { date: '2025-08-09', name: 'Raksha Bandhan' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-08-18', name: 'Janmashtami' },
  { date: '2025-08-29', name: 'Ganesh Chaturthi' },
  { date: '2025-09-08', name: 'Onam' },
  { date: '2025-09-23', name: 'Navratri Begins' },
  { date: '2025-10-02', name: 'Gandhi Jayanti / Dussehra' },
  { date: '2025-10-21', name: 'Diwali (Lakshmi Puja)' },
  { date: '2025-10-22', name: 'Diwali (Govardhan Puja)' },
  { date: '2025-10-23', name: 'Bhai Dooj' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti' },
  { date: '2025-12-25', name: 'Christmas Day' },
];

export function TodaySpecial() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [todaySpecialEvent, setTodaySpecialEvent] = useState<SpecialDay | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);

    const year = now.getFullYear();
    // Only use 2025 special days if current year is 2025 for this demo
    if (year === 2025) {
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const day = now.getDate().toString().padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        const event = specialDays2025.find(sd => sd.date === todayString);
        setTodaySpecialEvent(event || null);
    } else {
        setTodaySpecialEvent(null); // No special event for other years in this demo
    }

  }, []); // Empty dependency array ensures this runs once on mount client-side

  if (!currentDate) {
    // Render a placeholder or skeleton while date is being determined client-side
    return (
      <Card className="shadow-lg rounded-lg bg-card text-card-foreground my-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Today's Date & Special
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">Loading date...</p>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = currentDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="shadow-lg rounded-lg bg-card text-card-foreground my-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <CalendarDays className="mr-2 h-6 w-6 text-primary" data-ai-hint="calendar date" />
          Today's Date & Special
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium mb-2">{formattedDate}</p>
        {todaySpecialEvent ? (
          <div className="mt-2 p-3 rounded-md bg-primary/10 border border-primary/30">
            <p className="text-xl font-semibold text-primary flex items-center">
              <Sparkles className="mr-2 h-5 w-5" data-ai-hint="stars celebration" />
              {todaySpecialEvent.name}
            </p>
            {todaySpecialEvent.description && (
              <p className="text-sm text-muted-foreground mt-1">{todaySpecialEvent.description}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No special event listed for today (for 2025 in this demo).</p>
        )}
      </CardContent>
    </Card>
  );
}
