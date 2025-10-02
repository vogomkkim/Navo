/**
 * @file Proposal Card Component
 * Displays a workflow proposal for user approval
 */

'use client';

import { useState } from 'react';
import type { ProposalRequiredResponse } from '@/types/workflow';
import { ConfidenceBadge } from './ConfidenceBadge';
import { t } from '@/lib/i18n';

interface ProposalCardProps {
  proposal: ProposalRequiredResponse;
  onApprove: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  isLoading?: boolean;
}

export function ProposalCard({
  proposal,
  onApprove,
  onReject,
  isLoading = false,
}: ProposalCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleApprove = () => {
    onApprove(proposal.proposalId);
  };

  const handleReject = () => {
    onReject(proposal.proposalId);
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `~${minutes}${t('time.minutes')} ${seconds}${t('time.seconds')}`;
    }
    return `~${seconds}${t('time.seconds')}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {proposal.planSummary.name}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {proposal.planSummary.description}
          </p>
        </div>

        {/* Confidence Badge */}
        <div className="ml-4">
          <ConfidenceBadge confidence={proposal.confidence} size="md" />
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="mb-4 rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">{t('proposal.reasoning')}:</span>{' '}
              {proposal.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
        >
          <span>
            {proposal.planSummary.steps.length} steps •{' '}
            {formatDuration(proposal.planSummary.estimatedDuration)}
          </span>
          <svg
            className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3">
            {proposal.planSummary.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex gap-3 rounded-md bg-gray-50 p-3 dark:bg-gray-700/50"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    Tool: <code className="rounded bg-gray-200 px-1 dark:bg-gray-600">{step.tool}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-800"
        >
          {isLoading ? t('proposal.approving') : `✓ ${t('proposal.approve')}`}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          {isLoading ? t('proposal.rejecting') : `✗ ${t('proposal.reject')}`}
        </button>
      </div>
    </div>
  );
}
