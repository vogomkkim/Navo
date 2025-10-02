/**
 * @file Confidence Badge Component
 * Displays AI confidence score with visual indicators
 */

import { getConfidenceInfo, type ConfidenceInfo } from '@/types/workflow';

interface ConfidenceBadgeProps {
  confidence: number;
  showPercentage?: boolean;
  showMessage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceBadge({
  confidence,
  showPercentage = true,
  showMessage = false,
  size = 'md',
}: ConfidenceBadgeProps) {
  const info = getConfidenceInfo(confidence);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
  };

  const dotColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`
          inline-flex items-center gap-2 rounded-full border font-medium
          ${sizeClasses[size]}
          ${colorClasses[info.color]}
        `}
      >
        {/* Confidence dot indicator */}
        <span
          className={`
            h-2 w-2 rounded-full
            ${dotColorClasses[info.color]}
          `}
          aria-hidden="true"
        />

        {/* Label */}
        <span>{info.label}</span>

        {/* Percentage */}
        {showPercentage && (
          <span className="font-semibold">{info.percentage}%</span>
        )}
      </div>

      {/* Optional message */}
      {showMessage && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {info.message}
        </p>
      )}
    </div>
  );
}
