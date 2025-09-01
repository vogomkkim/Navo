'use client';

interface SaveButtonProps {
  currentLayout: any; // TODO: Define a more specific type for Layout
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: Error) => void;
}

export function SaveButton({
  currentLayout,
  onSaveSuccess,
  onSaveError,
}: SaveButtonProps) {
  const handleSaveClick = () => {
    if (!currentLayout) {
      console.warn('Save failed: No layout data');
      onSaveError?.(new Error('No layout data to save.'));
      return;
    }

    // TODO: Implement actual save functionality
    console.log('Saving layout:', currentLayout);
    onSaveSuccess?.({ message: 'Layout saved successfully' });
  };

  return (
    <button id="saveBtn" onClick={handleSaveClick}>
      저장
    </button>
  );
}
