import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from '../ConfidenceBadge';

describe('ConfidenceBadge', () => {
  describe('Confidence Levels', () => {
    it('should display High Confidence label and percentage for 95%+', () => {
      render(<ConfidenceBadge confidence={0.98} />);

      expect(screen.getByText('High Confidence')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });

    it('should display Medium Confidence label and percentage for 75-94%', () => {
      render(<ConfidenceBadge confidence={0.85} />);

      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display Low Confidence label and percentage for <75%', () => {
      render(<ConfidenceBadge confidence={0.60} />);

      expect(screen.getByText('Low Confidence')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% confidence', () => {
      render(<ConfidenceBadge confidence={0} />);

      expect(screen.getByText('Low Confidence')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle 100% confidence', () => {
      render(<ConfidenceBadge confidence={1} />);

      expect(screen.getByText('High Confidence')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should round percentage to nearest integer', () => {
      render(<ConfidenceBadge confidence={0.856} />);

      // 0.856 * 100 = 85.6, should round to 86
      expect(screen.getByText('86%')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should hide percentage when showPercentage is false', () => {
      render(<ConfidenceBadge confidence={0.85} showPercentage={false} />);

      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });

    it('should show message when showMessage is true', () => {
      render(<ConfidenceBadge confidence={0.85} showMessage={true} />);

      expect(
        screen.getByText(
          'The AI is reasonably confident, but your review is recommended.'
        )
      ).toBeInTheDocument();
    });
  });
});
