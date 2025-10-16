import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from '../ProposalCard';
import type { ProposalRequiredResponse } from '@/types/workflow';
import { vi } from 'vitest';

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'proposal.title': '제안',
      'proposal.reasoning': '이유',
      'proposal.estimatedTime': '예상 시간',
      'proposal.steps': '단계',
      'proposal.approve': '승인',
      'proposal.reject': '거부',
      'proposal.showDetails': '상세 보기',
      'proposal.hideDetails': '숨기기',
      'time.minutes': '분',
      'time.seconds': '초',
    };
    return translations[key] || key;
  },
}));

describe('ProposalCard', () => {
  const mockProposal: ProposalRequiredResponse = {
    type: 'PROPOSAL_REQUIRED',
    proposalId: 'test-proposal-123',
    reasoning: '이 작업은 복잡하여 단계별 계획이 필요합니다.',
    planSummary: {
      name: '계산기 앱 생성',
      description: '간단한 계산기 애플리케이션을 만듭니다.',
      steps: [
        {
          id: 'step-1',
          title: 'UI 컴포넌트 생성',
          description: 'React 컴포넌트를 만듭니다',
          tool: 'create_vfs_file',
        },
        {
          id: 'step-2',
          title: '계산 로직 구현',
          description: '계산 함수를 구현합니다',
          tool: 'update_vfs_file',
        },
      ],
      estimatedDuration: 120000, // 2 minutes
    },
    confidence: 0.85,
  };

  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render proposal basic information', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Title, description, reasoning
      expect(screen.getByText(mockProposal.planSummary.name)).toBeInTheDocument();
      expect(screen.getByText(mockProposal.planSummary.description)).toBeInTheDocument();
      expect(screen.getByText(mockProposal.reasoning)).toBeInTheDocument();

      // Confidence badge
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
    });

    it('should render plan summary with steps and duration', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // "2 steps • ~2분 0초"
      expect(screen.getByText(/2 steps/)).toBeInTheDocument();
      expect(screen.getByText(/2분 0초/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByRole('button', { name: /승인/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /거부/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onApprove when approve button is clicked', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /승인/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledTimes(1);
      expect(mockOnApprove).toHaveBeenCalledWith(mockProposal.proposalId);
    });

    it('should call onReject when reject button is clicked', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const rejectButton = screen.getByRole('button', { name: /거부/i });
      fireEvent.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledTimes(1);
      expect(mockOnReject).toHaveBeenCalledWith(mockProposal.proposalId);
    });

    it('should toggle step details visibility', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Initially, step details are hidden
      expect(screen.queryByText('UI 컴포넌트 생성')).not.toBeInTheDocument();

      // Click the toggle button (contains "2 steps")
      const toggleButton = screen.getByRole('button', { name: /2 steps/ });
      fireEvent.click(toggleButton);

      // Now step details should be visible
      expect(screen.getByText('UI 컴포넌트 생성')).toBeInTheDocument();
      expect(screen.getByText('계산 로직 구현')).toBeInTheDocument();

      // Click again to hide
      fireEvent.click(toggleButton);
      expect(screen.queryByText('UI 컴포넌트 생성')).not.toBeInTheDocument();
    });
  });

  describe('Step Details', () => {
    it('should render all step information when expanded', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Expand details
      const toggleButton = screen.getByRole('button', { name: /2 steps/ });
      fireEvent.click(toggleButton);

      // Check all steps are rendered with their details
      expect(screen.getByText('UI 컴포넌트 생성')).toBeInTheDocument();
      expect(screen.getByText('React 컴포넌트를 만듭니다')).toBeInTheDocument();
      expect(screen.getByText('계산 로직 구현')).toBeInTheDocument();
      expect(screen.getByText('계산 함수를 구현합니다')).toBeInTheDocument();

      // Check step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle proposal with no steps', () => {
      const proposalWithNoSteps: ProposalRequiredResponse = {
        ...mockProposal,
        planSummary: {
          ...mockProposal.planSummary,
          steps: [],
        },
      };

      render(
        <ProposalCard
          proposal={proposalWithNoSteps}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText(/0 steps/)).toBeInTheDocument();
    });

    it('should disable buttons when isLoading is true', () => {
      render(
        <ProposalCard
          proposal={mockProposal}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          isLoading={true}
        />
      );

      const approveButton = screen.getByRole('button', { name: /승인|approving/i });
      const rejectButton = screen.getByRole('button', { name: /거부|rejecting/i });

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

});
