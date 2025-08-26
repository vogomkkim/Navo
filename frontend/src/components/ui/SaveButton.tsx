'use client';

import { useSaveDraft } from '@/lib/api'; // Assuming this path is correct

interface SaveButtonProps {
  currentLayout: any; // TODO: Define a more specific type for Layout
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: Error) => void;
}

export function SaveButton({ currentLayout, onSaveSuccess, onSaveError }: SaveButtonProps) {
  const { mutate: saveDraft, isPending, isSuccess, isError, error } = useSaveDraft();

  const handleSaveClick = () => {
    if (!currentLayout) {
      console.warn('Save failed: No layout data');
      // Optionally, call onSaveError with a specific message
      onSaveError?.(new Error('No layout data to save.'));
      return;
    }
    saveDraft(currentLayout, {
      onSuccess: (data) => {
        console.log('Draft saved successfully:', data);
        onSaveSuccess?.(data);
      },
      onError: (err) => {
        console.error('Failed to save draft:', err);
        onSaveError?.(err);
      },
    });
  };

  return (
    <button id="saveBtn" onClick={handleSaveClick} disabled={isPending}>
      {isPending ? 'Saving...' : 'Save'}
    </button>
  );
}