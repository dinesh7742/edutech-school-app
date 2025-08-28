
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, X, Cake, Sparkles, Trophy, Share2 } from 'lucide-react';
import type { StudentProfile } from '@/types';
import { getBirthdayWish } from '@/ai/flows/get-birthday-wish';
import Confetti from 'react-confetti';
import { useToast } from "@/hooks/use-toast";

interface BirthdayPopupProps {
  student: StudentProfile;
  onClose: () => void;
}

export function BirthdayPopup({ student, onClose }: BirthdayPopupProps) {
  const [wish, setWish] = useState<string>("");
  const [loadingWish, setLoadingWish] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const generateWish = async () => {
      setLoadingWish(true);
      try {
        const result = await getBirthdayWish({ studentName: student.firstName });
        setWish(result.wish);
      } catch (error) {
        console.error("Error generating birthday wish:", error);
        setWish(`Wishing you a day as special as you are, filled with joy and laughter!`);
      } finally {
        setLoadingWish(false);
      }
    };

    generateWish();
  }, [student.firstName]);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = () => {
    const shareText = `Happy Birthday ${student.firstName}! ${wish}`;
    if (navigator.share) {
      navigator.share({
        title: 'Birthday Wish!',
        text: shareText,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Birthday wish copied! You can now paste it to share.",
        });
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400}/>}
      <DialogContent className="max-w-sm w-full p-0 overflow-visible border-none bg-transparent shadow-none">
        <div className="relative">
            <div className="bg-background rounded-t-xl pt-10 pb-16 text-center relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                         <Trophy className="h-12 w-12 text-primary" />
                    </div>
                </div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full">
                <svg viewBox="0 0 1440 320" className="w-full h-full">
                    <path fill="hsl(var(--primary))" fillOpacity="1" d="M0,160L120,176C240,192,480,224,720,224C960,224,1200,192,1320,176L1440,160L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
                </svg>
            </div>
            
            <div className="relative bg-primary p-6 rounded-b-xl text-primary-foreground text-center">
                 <h2 className="text-2xl font-bold">Congratulations!</h2>
                 <h3 className="text-xl font-semibold opacity-90">Happy Birthday, {student.firstName}!</h3>
                 
                <div className="my-4 text-center min-h-[4rem] flex items-center justify-center">
                    {loadingWish ? (
                    <div className="flex items-center justify-center space-x-2 text-primary-foreground/80">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Crafting a special wish...</span>
                    </div>
                    ) : (
                    <p className="text-sm opacity-80">"{wish}"</p>
                    )}
                </div>
                
                <Button onClick={handleShare} className="w-full bg-background/20 hover:bg-background/30 text-primary-foreground rounded-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
            </div>

            <div
                className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 h-0 w-0 border-x-8 border-x-transparent border-t-[10px]"
                style={{ borderTopColor: 'hsl(var(--primary))' }}
            />
            
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white z-10">
                <X className="h-5 w-5" />
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
