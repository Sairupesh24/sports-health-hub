import React, { useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Send, Paperclip, X, Loader2, FileSpreadsheet, FileText, Image as ImageIcon, FileArchive, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMessengerFiles, type AttachmentItem } from "@/services/messengerService";

interface OrgUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  placeholder?: string;
  onSend: (content: string, contentHtml: string, attachments?: AttachmentItem[]) => void;
  onTypingChange: (isTyping: boolean) => void;
  users: OrgUser[];
  disabled?: boolean;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["xlsx", "xls", "csv"].includes(ext || "")) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  }
  if (["doc", "docx", "pdf", "txt", "rtf"].includes(ext || "")) {
    return <FileText className="h-4 w-4 text-blue-600" />;
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")) {
    return <ImageIcon className="h-4 w-4 text-purple-600" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) {
    return <FileArchive className="h-4 w-4 text-amber-600" />;
  }
  return <FileCode className="h-4 w-4 text-slate-500" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MessageInput: React.FC<Props> = ({ placeholder, onSend, onTypingChange, users, disabled }) => {
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasText, setHasText] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false }),
      Placeholder.configure({
        placeholder: disabled ? "This channel is read-only" : placeholder || "Type a message...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[36px] max-h-36 overflow-y-auto text-xs sm:text-sm text-slate-900 leading-relaxed px-1",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const hasContentNow = text.trim().length > 0;
      setHasText(hasContentNow);

      if (hasContentNow && !isTyping.current) {
        isTyping.current = true;
        onTypingChange(true);
      }
      if (!hasContentNow && isTyping.current) {
        isTyping.current = false;
        onTypingChange(false);
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        if (isTyping.current) {
          isTyping.current = false;
          onTypingChange(false);
        }
      }, 3000);
    },
    onDestroy: () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
  });

  const handleSend = useCallback(async () => {
    if (!editor || disabled || uploading) return;
    const content = editor.getText().trim();
    const contentHtml = editor.getHTML();
    if (!content && pendingFiles.length === 0) return;

    let uploadedAttachments: AttachmentItem[] | undefined = undefined;

    if (pendingFiles.length > 0) {
      setUploading(true);
      try {
        const uploadRes = await uploadMessengerFiles(pendingFiles);
        if (uploadRes && Array.isArray(uploadRes.files)) {
          uploadedAttachments = uploadRes.files.map((f) => ({
            file_name: f.file_name,
            file_url: f.file_url,
            file_size: f.file_size,
            mime_type: f.mime_type,
          }));
        }
      } catch (err) {
        console.error("Failed to upload attachments:", err);
        alert("Failed to upload attached files. Please try again.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    onSend(content, contentHtml === "<p></p>" ? "" : contentHtml, uploadedAttachments);
    editor.commands.clearContent();
    setHasText(false);
    setPendingFiles([]);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTypingChange(false);
    }
  }, [editor, onSend, onTypingChange, pendingFiles, disabled, uploading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setPendingFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (disabled) {
    return (
      <div className="px-4 py-3 text-xs text-slate-400 italic text-center bg-slate-50">
        This channel is read-only (automated notifications only)
      </div>
    );
  }

  const hasContent = hasText || (editor?.getText().trim().length ?? 0) > 0 || pendingFiles.length > 0;

  return (
    <div className="px-2.5 sm:px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-white">
      {/* Selected file attachment previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
          {pendingFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 shadow-2xs group"
            >
              {getFileIcon(file.name)}
              <div className="flex flex-col">
                <span className="max-w-[130px] sm:max-w-[160px] truncate font-semibold text-slate-800 text-[11px]">
                  {file.name}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded-md hover:bg-slate-200/50 transition-colors"
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mobile uploading alert */}
      {uploading && (
        <div className="flex sm:hidden items-center gap-1.5 text-teal-600 font-bold text-[11px] mb-1.5 px-1 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading attachment...
        </div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 sm:px-3 py-1 sm:py-2 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20 transition-all shadow-2xs">
        {/* File Attach Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-teal-600 transition-colors pb-1 flex-shrink-0 p-1"
          title="Attach file (Excel, Word, PDF, Image, etc.)"
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />

        {/* TipTap Editor */}
        <div className="flex-1 min-w-0" onKeyDown={handleKeyDown}>
          <EditorContent editor={editor} />
        </div>

        {/* Send Button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!hasContent || uploading}
          className={cn(
            "h-8 w-8 sm:h-7 sm:w-7 rounded-xl flex-shrink-0 transition-all mb-0.5",
            hasContent && !uploading
              ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs active:scale-95"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-slate-400 mt-1 px-1 font-medium hidden sm:flex items-center justify-between">
        <span>
          Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-slate-600 font-mono text-[9px]">Enter</kbd> to send ·{" "}
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-slate-600 font-mono text-[9px]">Shift + Enter</kbd> for new line
        </span>
        {uploading && (
          <span className="text-teal-600 font-bold flex items-center gap-1 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading attachment...
          </span>
        )}
      </p>
    </div>
  );
};

export default MessageInput;
