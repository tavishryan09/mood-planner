'use client';

import { useState, useEffect } from 'react';
import { CloseIcon } from '@/components/shared/Icons';

interface NotesModalProps {
  show: boolean;
  onClose: () => void;
  projectName: string;
  notes: string;
  onSave: (notes: string) => Promise<void>;
}

export default function NotesModal({
  show,
  onClose,
  projectName,
  notes,
  onSave
}: NotesModalProps) {
  const [editedNotes, setEditedNotes] = useState(notes);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedNotes(notes);
    setIsEditing(false);
  }, [notes, show]);

  if (!show) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedNotes);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedNotes(notes);
    setIsEditing(false);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <h3 className="font-bold text-lg mb-1">Project Notes</h3>
        <p className="text-sm opacity-70 mb-4">{projectName}</p>

        {isEditing ? (
          <textarea
            className="textarea textarea-bordered w-full min-h-[200px]"
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Enter project notes..."
            autoFocus
          />
        ) : (
          <div
            className="min-h-[200px] p-4 bg-base-200 rounded-lg whitespace-pre-wrap cursor-pointer hover:bg-base-300 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {notes ? notes : (
              <span className="opacity-50">No notes yet. Click to add notes.</span>
            )}
          </div>
        )}

        <div className="modal-action">
          {isEditing ? (
            <>
              <button className="btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Save'
                )}
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={onClose}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
