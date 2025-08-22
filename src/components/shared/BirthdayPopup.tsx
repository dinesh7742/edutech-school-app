
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X, Cake, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { StudentProfile } from '@/types';
import { getBirthdayWish } from '@/ai/flows/get-birthday-wish';
import Confetti from 'react-confetti';

interface BirthdayPopupProps {
  student: StudentProfile;
  onClose: () => void;
}

export function BirthdayPopup({ student, onClose }: BirthdayPopupProps) {
  const [wish, setWish] = useState<string>("");
  const [loadingWish, setLoadingWish] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const generateWish = async () => {
      setLoadingWish(true);
      try {
        const result = await getBirthdayWish({ studentName: student.firstName });
        setWish(result.wish);
      } catch (error) {
        console.error("Error generating birthday wish:", error);
        setWish(`Happy Birthday, ${student.firstName}! Wishing you a day as special as you are.`);
      } finally {
        setLoadingWish(false);
      }
    };

    generateWish();
  }, [student.firstName]);
  
  useEffect(() => {
    // Start confetti a little after the dialog opens
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "S";
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400}/>}
      <DialogContent className="max-w-md w-full p-0 overflow-hidden border-4 border-yellow-300 shadow-2xl rounded-2xl">
        <div className="relative bg-gradient-to-br from-pink-400 to-purple-500 text-white p-6 pt-12 flex flex-col items-center text-center">
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white">
                <X className="h-5 w-5" />
            </Button>
          <Sparkles className="absolute top-4 left-4 h-8 w-8 text-yellow-300 animate-pulse" />
          <Sparkles className="absolute top-10 right-8 h-5 w-5 text-yellow-300 animate-pulse delay-500" />
          <Sparkles className="absolute bottom-4 left-8 h-6 w-6 text-yellow-300 animate-pulse delay-300" />

          <Avatar className="h-32 w-32 border-4 border-white shadow-lg -mb-16">
            <AvatarImage src={student.photoUrl} alt={student.firstName} />
            <AvatarFallback className="text-4xl">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
          </Avatar>
        </div>
        <div className="bg-white p-6 pt-20 flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold text-primary">Happy Birthday!</h2>
          <h3 className="text-2xl font-semibold text-secondary">{student.firstName} {student.lastName}</h3>
          
          <div className="my-6 text-center">
            {loadingWish ? (
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Crafting a special wish...</span>
              </div>
            ) : (
              <p className="text-lg italic text-gray-700">"{wish}"</p>
            )}
          </div>
          
          <div className="flex justify-center items-end gap-4 mt-4">
              <Image src="https://i.postimg.cc/k45Jy2CM/6016995.png" alt="Birthday Candles" width={80} height={80} data-ai-hint="birthday candles" />
              <Image src="https://i.postimg.cc/tJ0X72R1/birthday-cake-3d-rendering-icon-illustration-free-png.png" alt="Birthday Cake" width={120} height={120} data-ai-hint="birthday cake" />
          </div>

          <Button onClick={onClose} className="mt-8">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
