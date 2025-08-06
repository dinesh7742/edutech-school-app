
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import Image from "next/image";

export interface FileInfo {
  url: string;
  type: 'image' | 'video' | 'pdf' | 'other';
  name: string;
}

interface FileViewerProps {
  fileInfo: FileInfo | null;
  onOpenChange: (open: boolean) => void;
}

export function FileViewer({ fileInfo, onOpenChange }: FileViewerProps) {
  if (!fileInfo) {
    return null;
  }

  const renderContent = () => {
    switch (fileInfo.type) {
      case 'image':
        return (
          <div className="relative w-full h-[80vh]">
            <Image
              src={fileInfo.url}
              alt={fileInfo.name}
              layout="fill"
              objectFit="contain"
            />
          </div>
        );
      case 'video':
        return (
          <video controls autoPlay className="w-full max-h-[80vh] rounded">
            <source src={fileInfo.url} />
            Your browser does not support the video tag.
          </video>
        );
      case 'pdf':
        // Use Google Docs viewer for robust embedding in webviews
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileInfo.url)}&embedded=true`;
        return (
          <iframe
            src={googleDocsUrl}
            className="w-full h-[80vh] border-0"
            title={fileInfo.name}
          />
        );
      default:
        return (
          <div className="p-8 text-center">
            <p className="mb-4">Cannot preview this file type directly.</p>
            <Button asChild>
              <a href={fileInfo.url} download={fileInfo.name}>
                Download File
              </a>
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={!!fileInfo} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-2 sm:p-4">
        <DialogHeader className="flex-shrink-0 flex-row items-center justify-between p-2 border-b">
          <DialogTitle className="truncate">{fileInfo.name}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="flex-grow overflow-auto p-2">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
