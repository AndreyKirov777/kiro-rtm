import React, { useState, useEffect, useRef } from 'react';
import { Attachment } from '../types';
import MockApiClient from '../services/MockApiClient';
import { Button } from './Button';

interface AttachmentListProps {
  requirementId: string;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ requirementId }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [requirementId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await MockApiClient.getAttachments(requirementId);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        await MockApiClient.uploadAttachment(requirementId, files[i]);
      }
      await loadAttachments();
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await MockApiClient.deleteAttachment(attachmentId);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete attachment. Please try again.');
    }
  };

  const handleDownload = (attachment: Attachment) => {
    // Mock download - in real implementation, this would download from server
    alert(`Downloading: ${attachment.filename}\n\nIn a real implementation, this would download the file from: ${attachment.storagePath}`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📎';
  };

  if (loading) {
    return <div>Loading attachments...</div>;
  }

  return (
    <div className="attachment-list">
      <h3 style={{ marginBottom: '1rem' }}>Attachments ({attachments.length})</h3>

      {/* Upload area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          marginBottom: '1.5rem',
          padding: '2rem',
          border: `2px dashed ${dragActive ? '#007bff' : '#ccc'}`,
          borderRadius: '4px',
          backgroundColor: dragActive ? '#f0f8ff' : '#f8f9fa',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <p style={{ margin: 0, color: '#666' }}>Uploading files...</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📎</div>
            <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Drop files here or click to browse
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              Upload documents, images, or any file type
            </p>
          </div>
        )}
      </div>

      {/* Attachments list */}
      {attachments.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No attachments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{ fontSize: '2rem' }}>
                  {getFileIcon(attachment.mimeType)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {attachment.filename}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {formatFileSize(attachment.sizeBytes)} • Uploaded {formatDate(attachment.uploadedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  onClick={() => handleDownload(attachment)}
                  variant="secondary"
                  size="small"
                >
                  Download
                </Button>
                <Button
                  onClick={() => handleDelete(attachment.id)}
                  variant="danger"
                  size="small"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
