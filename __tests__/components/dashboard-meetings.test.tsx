import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardMeetings } from '@/components/dashboard-meetings';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';

// Mock lib/swr to avoid next/cache Web API globals issue in jsdom
jest.mock('@/lib/swr', () => ({
  invalidateMeetings: jest.fn(),
  invalidateTodaysSchedule: jest.fn(),
}));

// Mock the server actions
jest.mock('@/app/actions', () => ({
  createMeeting: jest.fn(),
  updateMeeting: jest.fn(),
  getClients: jest.fn().mockResolvedValue([
    { id: 'client-1', display_name: 'Test Client' },
    { id: 'client-2', display_name: 'Another Client' },
  ]),
}));

// Mock the google-meet lib
jest.mock('@/lib/google-meet', () => ({
  createGoogleMeetLink: jest.fn().mockReturnValue('https://meet.google.com/test-meet'),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock window.prompt
Object.defineProperty(window, 'prompt', {
  value: jest.fn(),
  writable: true,
});

const mockMeetings = [
  {
    id: 'meeting-1',
    title: 'Team Standup',
    start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    end_time: new Date(Date.now() + 5400000).toISOString(), // 1.5 hours from now
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    project: { id: 'proj-1', name: 'Project Alpha' },
    client: null,
  },
  {
    id: 'meeting-2',
    title: 'Client Call',
    start_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    end_time: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
    meeting_link: null,
    project: null,
    client: { id: 'client-1', display_name: 'Acme Corp' },
  },
];

describe('DashboardMeetings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders meetings container with header', () => {
    render(<DashboardMeetings meetings={mockMeetings} />);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
  });

  it('displays meeting count badge', () => {
    render(<DashboardMeetings meetings={mockMeetings} />);

    // Should show count of 2 meetings
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders empty state when no meetings', () => {
    render(<DashboardMeetings meetings={[]} />);

    expect(screen.getByText('No meetings scheduled')).toBeInTheDocument();
    expect(screen.getByText('Instant Meet')).toBeInTheDocument();
  });

  it('displays meeting titles', () => {
    render(<DashboardMeetings meetings={mockMeetings} />);

    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Client Call')).toBeInTheDocument();
  });

  it('shows Join button for meetings with links', () => {
    render(<DashboardMeetings meetings={mockMeetings} />);

    const joinButtons = screen.getAllByText('Join');
    expect(joinButtons.length).toBeGreaterThan(0);
  });

  it('opens popover when Meet button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardMeetings meetings={mockMeetings} />);

    // Find and click the Meet button
    const meetButton = screen.getByTitle('Meeting options');
    await user.click(meetButton);

    // Should show popover content
    expect(screen.getByText('Start Instant Meeting')).toBeInTheDocument();
    expect(screen.getByText('Schedule New Meeting')).toBeInTheDocument();
  });

  it('opens Google Meet when Start Instant Meeting is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardMeetings meetings={mockMeetings} />);

    const meetButton = screen.getByTitle('Meeting options');
    await user.click(meetButton);

    const instantMeetButton = screen.getByText('Start Instant Meeting');
    await user.click(instantMeetButton);

    expect(mockWindowOpen).toHaveBeenCalledWith('https://meet.google.com/test-meet', '_blank');
  });

  it('opens new meeting modal when Schedule New Meeting is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardMeetings meetings={mockMeetings} />);

    const meetButton = screen.getByTitle('Meeting options');
    await user.click(meetButton);

    const scheduleButton = screen.getByText('Schedule New Meeting');
    await user.click(scheduleButton);

    // Should show the modal
    await waitFor(() => {
      expect(screen.getByText('Quick Schedule')).toBeInTheDocument();
    });
  });

  it('shows New Meeting button in empty state', () => {
    render(<DashboardMeetings meetings={[]} />);

    expect(screen.getByText('New Meeting')).toBeInTheDocument();
  });
});

describe('NewMeetingModalInline', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnMeetingCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open is true', async () => {
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    expect(screen.getByText('Quick Schedule')).toBeInTheDocument();
    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <NewMeetingModalInline
        open={false}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    expect(screen.queryByText('Quick Schedule')).not.toBeInTheDocument();
  });

  it('shows meeting type toggle buttons', async () => {
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('shows client selector when Client type is selected', async () => {
    const user = userEvent.setup();
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    const clientButton = screen.getByText('Client');
    await user.click(clientButton);

    await waitFor(() => {
      expect(screen.getByText('Select client...')).toBeInTheDocument();
    });
  });

  it('shows date picker button', () => {
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    // Should show today's date in the button
    expect(
      screen.getByRole('button', { name: /pick a date|mon|tue|wed|thu|fri|sat|sun/i })
    ).toBeInTheDocument();
  });

  it('shows Schedule Meeting submit button', () => {
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    expect(screen.getByRole('button', { name: /schedule meeting/i })).toBeInTheDocument();
  });

  it('shows meeting link input field', () => {
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    expect(screen.getByText('Meeting Link')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste google meet/i)).toBeInTheDocument();
  });

  it('calls onMeetingCreated when form is submitted successfully', async () => {
    const { createMeeting } = jest.requireMock('@/app/actions');
    createMeeting.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'new-meeting-id',
        title: 'Internal Meeting',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        meeting_link: null,
      },
    });

    const user = userEvent.setup();
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /schedule meeting/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnMeetingCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-meeting-id',
          title: 'Internal Meeting',
        })
      );
    });
  });

  it('shows error message when creation fails', async () => {
    const { createMeeting } = jest.requireMock('@/app/actions');
    createMeeting.mockResolvedValueOnce({
      success: false,
      error: 'Failed to create meeting',
    });

    const user = userEvent.setup();
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /schedule meeting/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create meeting')).toBeInTheDocument();
    });

    expect(mockOnMeetingCreated).not.toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    const { createMeeting } = jest.requireMock('@/app/actions');
    // Make the promise never resolve to keep loading state
    createMeeting.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(
      <NewMeetingModalInline
        open={true}
        onOpenChange={mockOnOpenChange}
        onMeetingCreated={mockOnMeetingCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /schedule meeting/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Scheduling...')).toBeInTheDocument();
    });
  });
});

describe('DashboardMeetings Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds new meeting to list when created via modal', async () => {
    const { createMeeting } = jest.requireMock('@/app/actions');
    const newMeetingTime = new Date(Date.now() + 86400000); // tomorrow
    createMeeting.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'new-meeting-id',
        title: 'New Team Sync',
        start_time: newMeetingTime.toISOString(),
        end_time: new Date(newMeetingTime.getTime() + 3600000).toISOString(),
        meeting_link: 'https://meet.google.com/new-meet',
      },
    });

    const user = userEvent.setup();
    render(<DashboardMeetings meetings={mockMeetings} />);

    // Initially should have 2 meetings
    expect(screen.getByText('2')).toBeInTheDocument();

    // Open popover and click Schedule New Meeting
    const meetButton = screen.getByTitle('Meeting options');
    await user.click(meetButton);

    const scheduleButton = screen.getByText('Schedule New Meeting');
    await user.click(scheduleButton);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Quick Schedule')).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /schedule meeting/i });
    await user.click(submitButton);

    // Wait for the meeting to be added
    await waitFor(() => {
      expect(screen.getByText('New Team Sync')).toBeInTheDocument();
    });

    // Should now show 3 meetings
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
