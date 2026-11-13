import React, { useRef, useState } from 'react';
import { ChatAttachment } from '../types';
import {
  cancelServerUpload,
  processAndUploadAttachment,
} from '../services/fileProcessor';

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    for (const file of files) {
      const tempId = `att_pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const controller = new AbortController();
      abortControllersRef.current[tempId] = controller;

      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          kind: 'binary',
          status: 'processing',
          progress: 2,
          summary: 'Preparando leitura...',
        },
      ]);

      try {
        const finalAtt = await processAndUploadAttachment(
          file,
          (patch) => {
            setAttachments((prev) =>
              prev.map((item) => (item.id === tempId ? { ...item, ...patch, id: tempId } : item))
            );
          },
          controller.signal
        );

        setAttachments((prev) =>
          prev.map((item) => (item.id === tempId ? { ...finalAtt, id: tempId } : item))
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setAttachments((prev) => prev.filter((item) => item.id !== tempId));
        } else {
          setAttachments((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    status: 'error',
                    errorMessage: err?.message || 'Erro ao processar arquivo.',
                  }
                : item
            )
          );
        }
      } finally {
        delete abortControllersRef.current[tempId];
      }
    }
  };

  const removeAttachment = (id: string) => {
    const controller = abortControllersRef.current[id];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[id];
    }
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.uploadId) {
        cancelServerUpload(target.uploadId);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      addFiles(items);
    }
  };

  const isUploadingAny = attachments.some((a) => a.status === 'processing' || a.status === 'uploading');
  const readyAttachments = attachments.filter((a) => a.status === 'ready');

  return {
    attachments,
    isDragging,
    isUploadingAny,
    readyAttachments,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
    openFilePicker,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  };
}
