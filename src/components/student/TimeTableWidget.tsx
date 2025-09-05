
"use client";

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Book, Forward } from 'lucide-react';
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
    { period: 8, subject: 'EVS', from: '04:35 PM', to: '05:05 PM' },
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
const days: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const periods = Array.from({ length: 10 }, (_, i) => i + 1);

const timeToNumber = (timeStr: string): number => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) { 
    hours = 0;
  }
  
  return hours * 100 + minutes;
};

const AnalogClock = memo(function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondsStyle = { transform: `translateX(-50%) rotate(${seconds * 6}deg)` };
  const minutesStyle = { transform: `translateX(-50%) rotate(${minutes * 6 + seconds * 0.1}deg)` };
  const hoursStyle = { transform: `translateX(-50%) rotate(${hours * 30 + minutes * 0.5}deg)` };

  return (
    <div className="relative w-24 h-24 rounded-full border-4 border-primary bg-white shadow-lg flex-shrink-0">
      {/* Numbers */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i + 1) * 30;
        const x = 50 + 40 * Math.sin(angle * Math.PI / 180);
        const y = 50 - 40 * Math.cos(angle * Math.PI / 180);
        return (
          <div
            key={i}
            className="absolute text-center text-primary font-bold text-xs"
            style={{
              top: `${y}%`,
              left: `${x}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {i + 1}
          </div>
        );
      })}
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />

      {/* Hands */}
      <div className="absolute w-full h-full">
        <div className="absolute bottom-1/2 left-1/2 w-1 h-8 bg-primary rounded-t-full origin-bottom" style={hoursStyle} />
      </div>
      <div className="absolute w-full h-full">
        <div className="absolute bottom-1/2 left-1/2 w-0.5 h-10 bg-gray-700 rounded-t-full origin-bottom" style={minutesStyle} />
      </div>
       <div className="absolute w-full h-full">
        <div className="absolute bottom-1/2 left-1/2 w-px h-10 bg-red-600 origin-bottom" style={secondsStyle} />
      </div>
    </div>
  );
});

export function TimeTableWidget() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [visiblePeriod, setVisiblePeriod] = useState<'now' | 'next'>('now');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute for period change
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    const periodToggle = setInterval(() => {
        setVisiblePeriod(prev => prev === 'now' ? 'next' : 'now');
    }, 3000); // Toggle every 3 seconds
    return () => clearInterval(periodToggle);
  }, []);

  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'short' }) as Day;
  const todaysSchedule = schedule[dayOfWeek] || [];
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const currentPeriod = todaysSchedule.find(p => {
    const fromTime = timeToNumber(p.from);
    const toTime = timeToNumber(p.to);
    return currentTime >= fromTime && currentTime < toTime;
  });

  const nextPeriod = todaysSchedule.find(p => {
    const fromTime = timeToNumber(p.from);
    return fromTime > currentTime;
  });

  if (user?.grade !== '4' || user?.division !== 'A') {
    return null; // Only show for Grade 4A
  }
  
  if (dayOfWeek === 'Sun') {
      return (
        <Card className="shadow-2xl rounded-2xl border-4 border-primary/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between border-b-2 border-primary/10 p-4">
                <div className="inline-block border-2 border-primary rounded-lg px-4 py-2">
                    <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Clock className="h-6 w-6" /> Class Timetable
                    </CardTitle>
                </div>
            </CardHeader>
          <CardContent>
             <p className="text-center text-muted-foreground py-10 font-semibold">It's Sunday! Enjoy your day off.</p>
          </CardContent>
        </Card>
      )
  }

  return (
    <Card className="shadow-2xl rounded-2xl border-4 border-primary/20 bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 border-primary/10 p-4">
        <div className="space-y-1">
            <div className="inline-block border-2 border-primary rounded-lg px-4 py-2">
                <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Clock className="h-6 w-6" /> Class Timetable
                </CardTitle>
            </div>
            <CardDescription className="pl-2">Weekly schedule for Grade {user.grade}-{user.division}</CardDescription>
        </div>
        <AnalogClock />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-6 h-28 relative">
          <div className={cn("p-4 rounded-lg border w-full h-full absolute top-0 left-0 transition-opacity duration-500",
            visiblePeriod === 'now' ? "opacity-100 bg-green-100 dark:bg-green-900/50 border-green-500/30" : "opacity-0"
          )}>
            <h3 className="font-bold text-lg text-green-800 dark:text-green-200 flex items-center gap-2"><Book /> Now</h3>
            {currentPeriod ? (
              <>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{currentPeriod.subject}</p>
                <p className="text-sm text-muted-foreground">{currentPeriod.from} - {currentPeriod.to}</p>
              </>
            ) : (
              <p className="text-muted-foreground mt-2">No lecture currently in session.</p>
            )}
          </div>
          <div className={cn("p-4 rounded-lg border w-full h-full absolute top-0 left-0 transition-opacity duration-500",
            visiblePeriod === 'next' ? "opacity-100 bg-blue-100 dark:bg-blue-900/50 border-blue-500/30" : "opacity-0"
          )}>
            <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200 flex items-center gap-2"><Forward /> Next</h3>
            {nextPeriod ? (
               <>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{nextPeriod.subject}</p>
                <p className="text-sm text-muted-foreground">{nextPeriod.from} - {nextPeriod.to}</p>
              </>
            ) : (
               <p className="text-muted-foreground mt-2">No more lectures today.</p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-primary/10">
                <th className="border border-gray-300 p-2 font-semibold text-primary">Period</th>
                {days.map(day => (
                  <th key={day} className={cn("border border-gray-300 p-2 font-semibold text-primary", day === dayOfWeek && 'bg-primary/20')}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(periodNum => (
                <tr key={periodNum} className="text-center">
                  <td className="border border-gray-300 p-2 font-medium bg-muted/50">{periodNum}</td>
                  {days.map(day => {
                    const periodData = schedule[day]?.find(p => p.period === periodNum);
                    const isCurrent = day === dayOfWeek && periodData?.period === currentPeriod?.period;
                    
                    return (
                      <td 
                        key={`${day}-${periodNum}`} 
                        className={cn(
                          "border border-gray-300 p-2",
                          periodData?.subject === 'RECESS' ? 'bg-red-100/50 font-semibold' : 'bg-white',
                          isCurrent && 'animate-blinking-colors shadow-inner scale-105 z-10 relative'
                        )}
                      >
                        {periodData ? (
                          <div className="flex flex-col text-xs sm:text-sm">
                            <span className="font-bold">{periodData.subject}</span>
                            <span className="text-muted-foreground">{periodData.from}</span>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
