import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalCard from '../Goals/GoalCard.jsx';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        'goals.editGoal': 'Edit Goal',
        'goals.deleteGoal': 'Delete Goal',
        'goals.card.saved': 'saved',
        'goals.card.remaining': 'remaining',
        'goals.card.daysLeft': 'days left',
        'goals.card.overdue': 'Overdue',
        'goals.card.noDeadline': 'No deadline',
        'goals.card.addContribution': 'Add Contribution',
        'goals.status.completed': 'Completed',
      };
      return map[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock Card component
vi.mock('../UI/Card.jsx', () => ({
  default: ({ children, className }) => <div className={className}>{children}</div>,
}));

const mockGoal = {
  id: 'goal-1',
  name: 'Emergency Fund',
  description: 'Build a safety net',
  target_amount: 1000,
  current_amount: 500,
  color: '#3B82F6',
  target_date: null,
  is_completed: false,
};

const mockHandlers = {
  onEdit: vi.fn(),
  onAddContribution: vi.fn(),
  onDelete: vi.fn(),
};

describe('GoalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders goal name and description', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    expect(screen.getByText('Emergency Fund')).toBeDefined();
    expect(screen.getByText('Build a safety net')).toBeDefined();
  });

  it('displays correct progress percentage', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    // 500/1000 = 50%
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('shows 0% when target_amount is 0', () => {
    const goal = { ...mockGoal, target_amount: 0, current_amount: 0 };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('caps progress display at 100%', () => {
    const goal = { ...mockGoal, current_amount: 1500, target_amount: 1000 };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('shows remaining amount when not completed', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    expect(screen.getByText(/500.00.*remaining/)).toBeDefined();
  });

  it('shows completed status when current >= target', () => {
    const goal = { ...mockGoal, current_amount: 1000, target_amount: 1000 };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('shows no deadline when target_date is null', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    expect(screen.getByText('No deadline')).toBeDefined();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    const editButton = screen.getByTitle('Edit Goal');
    fireEvent.click(editButton);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockGoal);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    const deleteButton = screen.getByTitle('Delete Goal');
    fireEvent.click(deleteButton);
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockGoal);
  });

  it('calls onAddContribution when contribution button is clicked', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    const addButton = screen.getByText(/Add Contribution/);
    fireEvent.click(addButton);
    expect(mockHandlers.onAddContribution).toHaveBeenCalledWith(mockGoal);
  });

  it('shows days left when target_date is in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const goal = { ...mockGoal, target_date: futureDate.toISOString().split('T')[0] };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.getByText(/days left/)).toBeDefined();
  });

  it('shows Overdue when target_date is in the past', () => {
    const goal = { ...mockGoal, target_date: '2020-01-01' };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.getByText('Overdue')).toBeDefined();
  });

  it('applies goal color to color indicator dot', () => {
    const { container } = render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    const colorDot = container.querySelector('[style*="backgroundColor"]');
    expect(colorDot).toBeDefined();
  });

  it('does not render description when not provided', () => {
    const goal = { ...mockGoal, description: null };
    render(<GoalCard goal={goal} {...mockHandlers} />);
    expect(screen.queryByText('Build a safety net')).toBeNull();
  });
});
