
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const schedule = {
  Mon: [
    { period: 1, subject: 'English', from: '12:55 PM', to: '01:30 PM' },
    { period: 2, subject: 'Maths', from: '01:30 PM', to: '02:05 PM' },
    { period: 3, subject: 'EVS', from: '02:05 PM', to: '02:40 PM' },
    { period: 4, subject: 'Marathi', from: '02:40 PM', to: '03:10 PM' },
    { period: 5, subject: 'RECESS', from: '03:10 PM', to: '03:35 PM' },
    { period: 6, subject: 'Drawing', from: '03:35 PM', to: '04:05 PM' },
    { period: 7, subject: 'WE', from: '04:05 PM', to: '04:35 PM' },
    { period: 8, subject: 'WE', from: '04:35 PM', to: '05:05 PM' },
    { period: 9, subject: 'Marathi', from: '05:05 PM', to: '05:35 PM' },
    { period: 10, subject: 'Maths', from: '05:35 PM', to: '06:05 PM' },
  ],
  Tue: [
    { period: 1, subject: 'English', from: '12:55 PM', to: '01:30 PM' },
    { period: 2, subject: 'Maths', from: '01:30 PM', to: '02:05 PM' },
    { period: 3, subject: 'EVS', from: '02:05 PM', to: '02:40 PM' },
    { period: 4, subject: 'Marathi', from: '02:40 PM', to: '03:10 PM' },
    { period: 5, subject: 'RECESS', from: '03:10 PM', to: '03:35 PM' },
    { period: 6, subject: 'English', from: '03:35 PM', to: '04:05 PM' },
    { period: 7, subject: 'English', from: '04:05 PM', to: '04:35 PM' },
    { period: 8, subject: 'Maths', from: '04:35 PM', to: '05:05 PM' },
    { period: 9, subject: 'EVS', from: '05:05 PM', to: '05:35 PM' },
    { period: 10, subject: 'Intelligence', from: '05:35 PM', to: '06:05 PM' },
  ],
  Wed: [
    { period: 1, subject: 'English', from: '12:55 PM', to: '01:30 PM' },
    { period: 2, subject: 'Maths', from: '01:30 PM', to: '02:05 PM' },
    { period: 3, subject: 'EVS', from: '02:05 PM', to: '02:40 PM' },
    { period: 4, subject: 'Marathi', from: '02:40 PM', to: '03:10 PM' },
    { period: 5, subject: 'RECESS', from: '03:10 PM', to: '03:35 PM' },
    { period: 6, subject: 'Drawing', from: '03:35 PM', to: '04:05 PM' },
    { period: 7, subject: 'WE', from: '04:05 PM', to: '04:35 PM' },
    { period: 8, subject: 'Maths', from: '04:35 PM', to: '05:05 PM' },
    { period: 9, subject: 'English', from: '05:05 PM', to: '05:35 PM' },
    { period: 10, subject: 'PT', from: '05:35 PM', to: '06:05 PM' },
  ],
  Thu: [
    { period: 1, subject: 'English', from: '12:55 PM', to: '01:30 PM' },
    { period: 2, subject: 'Maths', from: '01:30 PM', to: '02:05 PM' },
    { period: 3, subject: 'EVS', from: '02:05 PM', to: '02:40 PM' },
    { period: 4, subject: 'EVS', from: '02:40 PM', to: '03:10 PM' },
    { period: 5, subject: 'RECESS', from: '03:10 PM', to: '03:35 PM' },
    { period: 6, subject: 'English', from: '03:35 PM', to: '04:05 PM' },
    { period: 7, subject: 'English', from: '04:05 PM', to: '04:35 PM' },
    { period: 8, subject: 'EVS', from: '04:35 PM', to '05:05 PM' },
    { period: 9, subject: 'Scout', from: '05:05 PM', to: '05:35 PM' },
    { period: 10, subject: 'Marathi', from: '05:35 PM', to: '06:05 PM' },
  ],
  Fri: [
    { period: 1, subject: 'English', from: '12:55 PM', to: '01:30 PM' },
    { period: 2, subject: 'Maths', from: '01:30 PM', to: '02:05 PM' },
    { period: 3, subject: 'EVS', from: '02:05 PM', to: '02:40 PM' },
    { period: 4, subject: 'Marathi', from: '02:40 PM', to: '03:10 PM' },
    { period: 5, subject: 'RECESS', from: '03:10 PM', to: '03:35 PM' },
    { period: 6, subject: 'Drawing', from: '03:35 PM', to: '04:05 PM' },
    { period: 7, subject: 'WE', from: '04:05 PM', to: '04:35 PM' },
    { period: 8, subject: 'English', from: '04:35 PM', to: '05:05 PM' },
    { period: 9, subject: 'EVS', from: '05:05 PM', to: '05:35 PM' },
    { period: 10, subject: 'PT', from: '05:35 PM', to: '06:05 PM' },
  ],
  Sat: [
    { period: 1, subject: 'English', from: '11:45 AM', to: '12:20 PM' },
    { period: 2, subject: 'Maths', from: '12:20 PM', to: '12:50 PM' },
    { period: 3, subject: 'EVS', from: '12:50 PM', to: '01:20 PM' },
    { period: 4, subject: 'RECESS', from: '01:20 PM', to: '01:45 PM' },
    { period: 5, subject: 'Marathi', from: '01:45 PM', to: '02:15 PM' },
    { period: 6, subject: 'WE', from: '02:15 PM', to: '02:45 PM' },
    { period: 7, subject: 'WE', from: '02:45 PM', to: '03:15 PM' },
    { period: 8, subject: 'PT', from: '03:15 PM', to: '03:45 PM' },
  ],
  Sun: [],
};

type Day = keyof typeof schedule;

// Helper to convert "hh:mm AM/PM" to a comparable number (e.g., 1330 for 1:30 PM)
const timeToNumber = (timeStr: string): number => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) { // Midnight case
    hours = 0;
  }
  
  return hours * 100 + minutes;
};


export function TimeTableWidget() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'short' }) as Day;
  const todaysSchedule = schedule[dayOfWeek] || [];
  
  const currentPeriodIndex = todaysSchedule.findIndex(p => {
      const fromTime = timeToNumber(p.from);
      const toTime = timeToNumber(p.to);
      const currentTime = now.getHours() * 100 + now.getMinutes();
      return currentTime >= fromTime && currentTime < toTime;
  });
  
  if (user?.grade !== '4' || user?.division !== 'A') {
    return null; // Only show for Grade 4A
  }

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <Clock className="h-6 w-6" /> Today's Schedule ({dayOfWeek})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todaysSchedule.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">It's Sunday! Enjoy your day off.</p>
        ) : (
          <div className="space-y-2">
            {todaysSchedule.map((period, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md transition-all border-2",
                  index === currentPeriodIndex 
                    ? 'animate-blinking-colors shadow-lg scale-105' 
                    : 'bg-muted/50 border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={period.subject === 'RECESS' ? 'destructive' : 'secondary'} className="w-24 justify-center text-sm">{period.from}</Badge>
                  <p className="font-semibold text-lg">{period.subject}</p>
                </div>
                {index === currentPeriodIndex && (
                  <Badge variant="highlight" className="text-sm">Ongoing</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
