
"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import type { ChatMessage, AppUser, Attachment } from "@/types";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Paperclip, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const MAX_ATTACHMENT_SIZE_BYTES = 1024 * 1024; // 1MB

export function ChatClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [participantInfo, setParticipantInfo] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markMessagesAsRead = async (chatId: string, currentMessages: ChatMessage[]) => {
      if (!user) return;
      const batch = writeBatch(db);
      const chatDocRef = doc(db, "chats", chatId);
      let needsUpdate = false;

      const updatedMessages = currentMessages.map(msg => {
          if (msg.senderId !== user.uid && !msg.readBy?.includes(user.uid)) {
              needsUpdate = true;
              return { ...msg, readBy: [...(msg.readBy || []), user.uid] };
          }
          return msg;
      });

      if (needsUpdate) {
          batch.update(chatDocRef, { messages: updatedMessages });
          try {
              await batch.commit();
          } catch (error) {
              console.error("Error marking messages as read: ", error);
          }
      }
  };

  useEffect(() => {
    if (user?.grade && user?.division) {
      const newChatId = `group_chat_${user.grade}_${user.division}`;
      setChatId(newChatId);
    } else {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    if (!chatId) return;
    
    setIsLoading(true);
    const chatDocRef = doc(db, "chats", chatId);

    const unsubscribe = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data();
        const currentMessages = chatData.messages || [];
        setMessages(currentMessages);
        setParticipantInfo(chatData.participantInfo || {});
        if(user) markMessagesAsRead(chatId, currentMessages);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching chat:", error);
      toast({ title: "Error", description: "Could not load chat messages.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();

  }, [chatId, toast, user]);

  const handleAttachmentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `Please select a file smaller than ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024}MB.`,
          variant: "destructive"
        });
        return;
      }
      setAttachmentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((newMessage.trim() === "" && !attachmentFile) || !user || !chatId) return;

    setIsSending(true);
    
    let attachmentData: Attachment | null = null;
    if (attachmentFile && attachmentPreview) {
        attachmentData = {
            url: attachmentPreview,
            type: attachmentFile.type,
            name: attachmentFile.name,
        };
    }

    const messageData: ChatMessage = {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName || "Student",
      timestamp: Timestamp.now(),
      attachment: attachmentData,
      readBy: [user.uid],
    };

    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        const existingMessages = chatDoc.data().messages || [];
        await setDoc(chatDocRef, {
          messages: [...existingMessages, messageData],
          lastMessageTimestamp: serverTimestamp(),
          lastMessageText: newMessage.trim() || `Attachment: ${attachmentFile?.name}`,
        }, { merge: true });
      } else {
        // If chat doesn't exist, this implies a logic issue as student should be part of one.
        // For now, let's prevent creating a new one from student side to avoid orphaned chats.
        toast({ title: "Chat Error", description: "This group chat has not been initialized by your teacher yet.", variant: "destructive" });
      }
      setNewMessage("");
      removeAttachment();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: `Could not send message. ${error.message.includes('exceeds the maximum') ? 'The attachment is too large.' : ''}`, variant: "destructive" });
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
        <div className="bg-muted rounded-full p-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <CardTitle>Class Group Chat</CardTitle>
          <CardDescription>
            {user ? `Grade ${user.grade}-${user.division}` : 'Loading...'}
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
              const senderInfo = participantInfo[msg.senderId];
              const timestamp = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date();

              return (
                <div key={index} className={`flex items-end gap-2 ${isSender ? "justify-end" : "justify-start"}`}>
                  {!isSender && (
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={senderInfo?.photoURL || undefined} />
                       <AvatarFallback>{getInitials(senderInfo?.name)}</AvatarFallback>
                     </Avatar>
                  )}
                  <div className={`max-w-xs md:max-w-md p-1 rounded-2xl ${isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-background rounded-bl-none border"}`}>
                    <div className="p-2">
                       {!isSender && <p className="text-xs font-semibold text-primary mb-1">{senderInfo?.name || 'User'}</p>}
                      {msg.attachment && msg.attachment.type.startsWith("image/") && (
                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                            <Image src={msg.attachment.url} alt={msg.attachment.name} width={200} height={200} className="rounded-lg object-cover" />
                        </a>
                      )}
                      {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                      <p className={`text-xs mt-1 text-right ${isSender ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(timestamp, 'p')}
                      </p>
                    </div>
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
        
        {attachmentPreview && (
            <div className="relative mb-2 p-2 border rounded-md w-fit">
                <Image src={attachmentPreview} alt="attachment preview" width={80} height={80} className="rounded" />
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={removeAttachment}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-5 w-5" />
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAttachmentChange}
            />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!chatId || isSending}
          />
          <Button type="submit" disabled={!chatId || isSending || (newMessage.trim() === '' && !attachmentFile)}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
