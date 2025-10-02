/**
 * @file Hook for handling workflow proposals
 * Manages proposal state and approval/rejection actions
 */

import { useState, useCallback } from 'react';
import type { ProposalRequiredResponse } from '@/types/workflow';
import { useAuth } from '@/app/context/AuthContext';

interface UseProposalHandlerReturn {
  activeProposal: ProposalRequiredResponse | null;
  isProcessing: boolean;
  setActiveProposal: (proposal: ProposalRequiredResponse | null) => void;
  approveProposal: (proposalId: string) => Promise<any>;
  rejectProposal: (proposalId: string) => Promise<void>;
}

export function useProposalHandler(projectId: string | null): UseProposalHandlerReturn {
  const [activeProposal, setActiveProposal] = useState<ProposalRequiredResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { token } = useAuth();

  const approveProposal = useCallback(async (proposalId: string) => {
    if (!projectId || !token) {
      console.error('Missing projectId or token');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/workflow/approve-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ proposalId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve proposal');
      }

      const result = await response.json();
      console.log('✅ Proposal approved:', result);

      // Clear the proposal after approval
      setActiveProposal(null);

      // Return the result so ChatSection can handle SSE connection
      return result;

    } catch (error) {
      console.error('❌ Failed to approve proposal:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, token]);

  const rejectProposal = useCallback(async (proposalId: string) => {
    if (!projectId || !token) {
      console.error('Missing projectId or token');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/workflow/reject-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ proposalId }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject proposal');
      }

      console.log('✅ Proposal rejected');

      // Clear the proposal after rejection
      setActiveProposal(null);

    } catch (error) {
      console.error('❌ Failed to reject proposal:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, token]);

  return {
    activeProposal,
    isProcessing,
    setActiveProposal,
    approveProposal,
    rejectProposal,
  };
}
