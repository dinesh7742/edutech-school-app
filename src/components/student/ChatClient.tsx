
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import type { ChatMessage, AppUser } from "@/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ChatClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [teacher, setTeacher] = useState<AppUser | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user || !user.grade || !user.division) {
      setIsLoading(false);
      return;
    }

    const findTeacherAndSetupChat = async () => {
      setIsLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("role", "==", "teacher"),
          where("grade", "==", user.grade),
          where("division", "==", user.division)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const teacherDoc = querySnapshot.docs[0];
          const teacherData = teacherDoc.data() as AppUser;
          setTeacher({ ...teacherData, uid: teacherDoc.id });

          // Create a consistent chat ID
          const newChatId = [user.uid, teacherDoc.id].sort().join('_');
          setChatId(newChatId);
        } else {
          toast({ title: "No Teacher Found", description: "Could not find a class teacher assigned to your grade and division.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error finding teacher:", error);
        toast({ title: "Error", description: "Could not initialize chat.", variant: "destructive" });
      }
    };

    findTeacherAndSetupChat();
  }, [user, toast]);

  useEffect(() => {
    if (!chatId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const chatDocRef = doc(db, "chats", chatId);

    const unsubscribe = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data();
        setMessages(chatData.messages || []);
      } else {
        // Chat doesn't exist yet, so no messages
        setMessages([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching chat:", error);
      toast({ title: "Error", description: "Could not load chat messages.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();

  }, [chatId, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user || !teacher || !chatId) return;

    setIsSending(true);
    const messageData: ChatMessage = {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName || "Student",
      timestamp: Timestamp.now(), // FIX: Use client-side timestamp
    };

    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        const existingMessages = chatDoc.data().messages || [];
        await setDoc(chatDocRef, {
          messages: [...existingMessages, messageData],
          lastMessageTimestamp: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(chatDocRef, {
          participants: [user.uid, teacher.uid],
          participantInfo: {
            [user.uid]: { name: user.displayName, role: 'student' },
            [teacher.uid]: { name: teacher.displayName, role: 'teacher' }
          },
          messages: [messageData],
          lastMessageTimestamp: serverTimestamp(),
        });
      }
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="flex flex-row items-center gap-4">
        {teacher ? (
          <Avatar>
            <AvatarImage src={teacher.photoURL || undefined} alt={teacher.displayName || "Teacher"}/>
            <AvatarFallback>{getInitials(teacher.displayName)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="bg-muted rounded-full p-2">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <CardTitle>Chat with {teacher?.displayName || 'your Teacher'}</CardTitle>
          <CardDescription>
            {teacher ? `Class Teacher for Grade ${user?.grade}-${user?.division}` : 'Loading teacher details...'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-[60vh]">
        <div className="flex-grow overflow-y-auto p-4 border rounded-md mb-4 bg-muted/20 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-muted-foreground">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSender = msg.senderId === user?.uid;
              const timestamp = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date();
              return (
                <div key={index} className={`flex items-end gap-2 ${isSender ? "justify-end" : "justify-start"}`}>
                  {!isSender && (
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={teacher?.photoURL || undefined} />
                       <AvatarFallback>{getInitials(teacher?.displayName)}</AvatarFallback>
                     </Avatar>
                  )}
                  <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-background rounded-bl-none border"}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(timestamp, 'p')}
                    </p>
                  </div>
                   {isSender && (
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={user?.photoURL || undefined} />
                       <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                     </Avatar>
                  )}
                </div>
              )
            })
          )}
           <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!teacher || isSending}
          />
          <Button type="submit" disabled={!teacher || isSending || newMessage.trim() === ''}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
