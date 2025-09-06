
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Sparkles, BookOpen, FlaskConical, Landmark, Cake, Loader2, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import type { DailySpecialOutput } from '@/ai/flows/get-daily-special';
import { specialDays } from '@/lib/special-days';

type DailyEvent = DailySpecialOutput['events'][0];

const eventIcons: Record<DailyEvent['type'], React.ElementType> = {
  Historical: Landmark,
  Science: FlaskConical,
  Arts: BookOpen,
  Anniversary: Cake,
  Other: Sparkles,
};

const eventColors: Record<DailyEvent['type'], string> = {
  Historical: "bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/20",
  Science: "bg-green-500/10 text-green-800 dark:text-green-200 border-green-500/20",
  Arts: "bg-purple-500/10 text-purple-800 dark:text-purple-200 border-purple-500/20",
  Anniversary: "bg-pink-500/10 text-pink-800 dark:text-pink-200 border-pink-500/20",
  Other: "bg-gray-500/10 text-gray-800 dark:text-gray-200 border-gray-500/20",
};

export function TodaySpecial() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextEvent = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % (dailyEvents.length || 1));
  }, [dailyEvents.length]);

  const prevEvent = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + dailyEvents.length) % (dailyEvents.length || 1));
  };
  
  useEffect(() => {
      if (dailyEvents.length > 1) {
          const intervalId = setInterval(() => {
              nextEvent();
          }, 5000); // Change slide every 5 seconds
          return () => clearInterval(intervalId);
      }
  }, [dailyEvents.length, nextEvent]);

  useEffect(() => {
    setIsLoading(true);
    const now = new Date();
    setCurrentDate(now);
    
    // Get today's date in MM-DD format
    const todayString = format(now, "MM-dd");
    
    // Look up the event in our static list
    const eventsForToday = specialDays[todayString] || [];
    setDailyEvents(eventsForToday);
    
    setIsLoading(false);

  }, []);

  if (!currentDate) {
    return (
      <Card className="shadow-lg rounded-2xl bg-muted text-card-foreground my-6 p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Today's Date...</p>
      </Card>
    );
  }

  const formattedDate = currentDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const currentEvent = dailyEvents[currentIndex];
  const EventIcon = currentEvent ? eventIcons[currentEvent.type] : Sparkles;
  const eventFrameColor = currentEvent ? eventColors[currentEvent.type] : eventColors['Other'];

  return (
    <Card className="shadow-2xl rounded-2xl bg-gradient-to-br from-card to-background/50 text-card-foreground my-6 overflow-hidden border-2 border-primary/20">
      <CardHeader className="p-6 bg-primary/10">
        <CardTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
          <CalendarDays className="h-7 w-7" data-ai-hint="calendar date" />
          Today's Date & Special
        </CardTitle>
        <p className="text-lg text-muted-foreground pt-1">{formattedDate}</p>
      </CardHeader>
      <CardContent className="p-6 relative">
        <div className="mb-4 text-center">
            <div className="inline-block border-2 border-primary rounded-lg px-4 py-2">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Pin className="h-5 w-5"/>
                    Special Event of the Day
                </h3>
            </div>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Finding something interesting for today...</p>
          </div>
        ) : dailyEvents.length > 0 && currentEvent ? (
          <div className={cn("flex flex-col sm:flex-row items-center gap-6 min-h-[120px] p-4 rounded-lg border-2", eventFrameColor)}>
            <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-white/50">
               <EventIcon className="h-10 w-10" />
            </div>
            <div className="text-center sm:text-left flex-grow">
              <Badge variant="secondary" className="mb-2">{currentEvent.type}</Badge>
              <h3 className="text-xl font-bold">{currentEvent.eventName}</h3>
              <p className="text-base mt-1">{currentEvent.description}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground min-h-[120px] flex items-center justify-center">
            <p>No special events listed for today. It's a great day to make your own history!</p>
          </div>
        )}

        {dailyEvents.length > 1 && (
            <>
            <Button variant="ghost" size="icon" onClick={prevEvent} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full">
                <ChevronLeft className="h-6 w-6"/>
            </Button>
            <Button variant="ghost" size="icon" onClick={nextEvent} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full">
                <ChevronRight className="h-6 w-6"/>
            </Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                {dailyEvents.map((_, index) => (
                    <button key={index} onClick={() => setCurrentIndex(index)} className={`h-2 w-2 rounded-full transition-colors ${index === currentIndex ? 'bg-primary' : 'bg-muted'}`}/>
                ))}
            </div>
            </>
        )}

      </CardContent>
    </Card>
  );
}
