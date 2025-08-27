'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  initialText: string;
  onSave: (newText: string) => void;
  className?: string;
}

export function EditableText({
  initialText,
  onSave,
  className,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onSave(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onSave(text);
    } else if (e.key === 'Escape') {
      setText(initialText); // Revert to original on escape
      setIsEditing(false);
    }
  };

  return (
    <div className={className} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          ref={inputRef}
          className="inline-editor" // Apply original inline-editor styles
        />
      ) : (
        <span data-editable="true">{text}</span>
      )}
    </div>
  );
}
