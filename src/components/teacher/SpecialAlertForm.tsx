
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@radix-ui/react-zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { SpecialAlert } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone, CheckCircle } from "lucide-react";

const specialAlertSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long.").max(100),
  message: z.string().min(10, "Message must be at least 10 characters long.").max(500),
  isActive: z.boolean(),
});

type SpecialAlertFormValues = z.infer<typeof specialAlertSchema>;

export function SpecialAlertForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, reset, watch, formState: { errors } } = useForm<SpecialAlertFormValues>({
    resolver: zodResolver(specialAlertSchema),
    defaultValues: {
      title: "",
      message: "",
      isActive: false,
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    const fetchCurrentAlert = async () => {
      setIsLoading(true);
      const alertDocRef = doc(db, "site_config", "special_alert");
      const docSnap = await getDoc(alertDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as SpecialAlert;
        reset({
          title: data.title,
          message: data.message,
          isActive: data.isActive,
        });
      }
      setIsLoading(false);
    };
    fetchCurrentAlert();
  }, [reset]);

  const onSubmit: SubmitHandler<SpecialAlertFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You are not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const alertData: SpecialAlert = {
      ...data,
      postedByUid: user.uid,
      postedByName: user.displayName || "Teacher",
      timestamp: serverTimestamp(),
    };

    try {
      const alertDocRef = doc(db, "site_config", "special_alert");
      await setDoc(alertDocRef, alertData);
      toast({
        title: "Special Alert Updated",
        description: `The alert has been successfully ${data.isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error: any) {
      console.error("Error updating special alert:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update the special alert.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading current alert status...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
          <Megaphone className="h-8 w-8" />
          Manage Special Alert
        </CardTitle>
        <CardDescription>
          Create or update a special pop-up message that will be shown to all students upon logging in. 
          Use this for urgent announcements like school closures or event reminders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Alert Title *</Label>
            <Input id="title" {...register("title")} placeholder="e.g., School Closed Tomorrow" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Alert Message *</Label>
            <Textarea id="message" {...register("message")} placeholder="e.g., Due to heavy rainfall, the school will remain closed on..." rows={4} />
            {errors.message && <p className="text-sm text-destructive mt-1">{errors.message.message}</p>}
          </div>

          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">Activate Alert</Label>
              <p className="text-sm text-muted-foreground">
                Turn this on to show the alert to all students. Turn it off to hide it.
              </p>
            </div>
          </div>
          {errors.isActive && <p className="text-sm text-destructive mt-1">{errors.isActive.message}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isActive ? 'Post or Update Active Alert' : 'Save as Inactive / Deactivate'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
