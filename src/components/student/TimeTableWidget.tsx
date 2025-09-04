
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const schedule = {
  Mon: [
    { period: 1, subject: 'English', from: '12:55', to: '13:30' },
    { period: 2, subject: 'Maths', from: '13:30', to: '14:05' },
    { period: 3, subject: 'EVS', from: '14:05', to: '14:40' },
    { period: 4, subject: 'Marathi', from: '14:40', to: '15:10' },
    { period: 5, subject: 'RECESS', from: '15:10', to: '15:35' },
    { period: 6, subject: 'Drawing', from: '15:35', to: '16:05' },
    { period: 7, subject: 'WE', from: '16:05', to: '16:35' },
    { period: 8, subject: 'WE', from: '16:35', to: '17:05' },
    { period: 9, subject: 'Marathi', from: '17:05', to: '17:35' },
    { period: 10, subject: 'Maths', from: '17:35', to: '18:05' },
  ],
  Tue: [
    { period: 1, subject: 'English', from: '12:55', to: '13:30' },
    { period: 2, subject: 'Maths', from: '13:30', to: '14:05' },
    { period: 3, subject: 'EVS', from: '14:05', to: '14:40' },
    { period: 4, subject: 'Marathi', from: '14:40', to: '15:10' },
    { period: 5, subject: 'RECESS', from: '15:10', to: '15:35' },
    { period: 6, subject: 'English', from: '15:35', to: '16:05' },
    { period: 7, subject: 'English', from: '16:05', to: '16:35' },
    { period: 8, subject: 'Maths', from: '16:35', to: '17:05' },
    { period: 9, subject: 'EVS', from: '17:05', to: '17:35' },
    { period: 10, subject: 'Intelligence', from: '17:35', to: '18:05' },
  ],
  Wed: [
    { period: 1, subject: 'English', from: '12:55', to: '13:30' },
    { period: 2, subject: 'Maths', from: '13:30', to: '14:05' },
    { period: 3, subject: 'EVS', from: '14:05', to: '14:40' },
    { period: 4, subject: 'Marathi', from: '14:40', to: '15:10' },
    { period: 5, subject: 'RECESS', from: '15:10', to: '15:35' },
    { period: 6, subject: 'Drawing', from: '15:35', to: '16:05' },
    { period: 7, subject: 'WE', from: '16:05', to: '16:35' },
    { period: 8, subject: 'Maths', from: '16:35', to: '17:05' },
    { period: 9, subject: 'English', from: '17:05', to: '17:35' },
    { period: 10, subject: 'PT', from: '17:35', to: '18:05' },
  ],
  Thu: [
    { period: 1, subject: 'English', from: '12:55', to: '13:30' },
    { period: 2, subject: 'Maths', from: '13:30', to: '14:05' },
    { period: 3, subject: 'EVS', from: '14:05', to: '14:40' },
    { period: 4, subject: 'EVS', from: '14:40', to: '15:10' },
    { period: 5, subject: 'RECESS', from: '15:10', to: '15:35' },
    { period: 6, subject: 'English', from: '15:35', to: '16:05' },
    { period: 7, subject: 'English', from: '16:05', to: '16:35' },
    { period: 8, subject: 'EVS', from: '16:35', to: '17:05' },
    { period: 9, subject: 'Scout', from: '17:05', to: '17:35' },
    { period: 10, subject: 'Marathi', from: '17:35', to: '18:05' },
  ],
  Fri: [
    { period: 1, subject: 'English', from: '12:55', to: '13:30' },
    { period: 2, subject: 'Maths', from: '13:30', to: '14:05' },
    { period: 3, subject: 'EVS', from: '14:05', to: '14:40' },
    { period: 4, subject: 'Marathi', from: '14:40', to: '15:10' },
    { period: 5, subject: 'RECESS', from: '15:10', to: '15:35' },
    { period: 6, subject: 'Drawing', from: '15:35', to: '16:05' },
    { period: 7, subject: 'WE', from: '16:05', to: '16:35' },
    { period: 8, subject: 'English', from: '16:35', to: '17:05' },
    { period: 9, subject: 'EVS', from: '17:05', to: '17:35' },
    { period: 10, subject: 'PT', from: '17:35', to: '18:05' },
  ],
  Sat: [
    { period: 1, subject: 'English', from: '11:45', to: '12:20' },
    { period: 2, subject: 'Maths', from: '12:20', to: '12:50' },
    { period: 3, subject: 'EVS', from: '12:50', to: '13:20' },
    { period: 4, subject: 'RECESS', from: '13:20', to: '13:45' },
    { period: 5, subject: 'Marathi', from: '13:45', to: '14:15' },
    { period: 6, subject: 'WE', from: '14:15', to: '14:45' },
    { period: 7, subject: 'WE', from: '14:45', to: '15:15' },
    { period: 8, subject: 'PT', from: '15:15', to: '15:45' },
  ],
  Sun: [],
};

type Day = keyof typeof schedule;

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
      const fromTime = parseInt(p.from.replace(':', ''), 10);
      const toTime = parseInt(p.to.replace(':', ''), 10);
      const currentTime = parseInt(now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0'), 10);
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
                  "flex items-center justify-between p-3 rounded-md transition-all",
                  index === currentPeriodIndex ? 'bg-primary/20 animate-blinking-colors shadow-lg scale-105' : 'bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={period.subject === 'RECESS' ? 'destructive' : 'secondary'} className="w-16 justify-center text-sm">{period.from}</Badge>
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
