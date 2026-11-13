import React from 'react';
import {
  FileText,
  FileCode,
  FileArchive,
  Film,
  Music,
  FileSpreadsheet,
  File as FileIcon,
  Image as ImageIcon,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AttachmentKind, ChatAttachment } from '../types';
import { formatFileSize } from '../services/fileProcessor';

export function AttachmentKindIcon({ kind, className = 'w-4 h-4' }: { kind: AttachmentKind; className?: string }) {
  switch (kind) {
    case 'image':
      return <ImageIcon className={`${className} text-emerald-500`} />;
    case 'code':
      return <FileCode className={`${className} text-sky-500`} />;
    case 'archive':
      return <FileArchive className={`${className} text-amber-500`} />;
    case 'video':
      return <Film className={`${className} text-purple-500`} />;
    case 'audio':
      return <Music className={`${className} text-pink-500`} />;
    case 'office':
      return <FileSpreadsheet className={`${className} text-indigo-500`} />;
    case 'pdf':
    case 'text':
      return <FileText className={`${className} text-[#d97757]`} />;
    default:
      return <FileIcon className={`${className} text-neutral-400`} />;
  }
}

interface AttachmentTrayProps {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}

export const AttachmentTray: React.FC<AttachmentTrayProps> = ({ attachments, onRemove }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-2 mb-1 border-b border-neutral-200/60 dark:border-neutral-700/50">
      {attachments.map((att) => {
        const isBusy = att.status === 'processing' || att.status === 'uploading';
        const isError = att.status === 'error';

        return (
          <div
            key={att.id}
            className={`relative group flex items-center gap-2.5 p-2 pr-7 rounded-xl border text-left max-w-[240px] transition-all ${
              isError
                ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800/60'
                : 'bg-white dark:bg-[#1f1f1d] border-neutral-200 dark:border-neutral-700/80 shadow-xs'
            }`}
          >
            {/* Preview / Icon */}
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/70 dark:border-neutral-700/60">
              {att.kind === 'image' && att.imageDataUrl ? (
                <img src={att.imageDataUrl} alt={att.name} className="w-full h-full object-cover" />
              ) : isError ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : isBusy ? (
                <Loader2 className="w-4 h-4 text-[#d97757] animate-spin" />
              ) : (
                <AttachmentKindIcon kind={att.kind} />
              )}
            </div>

            {/* Metadata */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100 truncate" title={att.name}>
                {att.name}
              </p>
              {isError ? (
                <p className="text-[10px] text-red-600 dark:text-red-400 truncate" title={att.errorMessage}>
                  {att.errorMessage || 'Erro no arquivo'}
                </p>
              ) : isBusy ? (
                <div className="space-y-1 mt-0.5">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {att.status === 'processing' ? 'Lendo arquivo...' : `Enviando ${att.progress ?? 0}%`}
                  </p>
                  <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#d97757] transition-all duration-150"
                      style={{ width: `${Math.max(8, att.progress ?? 8)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {att.summary || formatFileSize(att.size)}
                </p>
              )}
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemove(att.id)}
              className="absolute top-1.5 right-1.5 p-0.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Remover anexo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
