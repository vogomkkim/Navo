'use client';

interface InfoDisplayProps {
  infoText: string;
}

export function InfoDisplay({ infoText }: InfoDisplayProps) {
  return (
    <div id="info">{infoText}</div>
  );
}