import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SearchBar from './SearchBar';
import { Requirement } from '../types';

const mockRequirements: Requirement[] = [
  {
    id: 'req-1',
    displayId: 'REQ-001',
    projectId: 'proj-1',
    parentId: null,
    title: 'User Authentication',
    description: 'The system shall provide secure authentication',
    type: 'system_requirement',
    status: 'approved',
    priority: 'critical',
    version: 1,
    tags: ['security'],
    customFields: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'req-2',
    displayId: 'REQ-002',
    projectId: 'proj-1',
    parentId: null,
    title: 'Data Encryption',
    description: 'The system shall encrypt data at rest',
    type: 'system_requirement',
    status: 'draft',
    priority: 'high',
    version: 1,
    tags: ['security', 'encryption'],
    customFields: {},
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
];

describe('SearchBar', () => {
  it('renders search input', () => {
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    expect(screen.getByPlaceholderText('Search requirements...')).toBeInTheDocument();
  });

  it('filters requirements based on search query', async () => {
    jest.useFakeTimers();
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'encryption' } });
    act(() => { jest.advanceTimersByTime(350); });

    await waitFor(() => {
      const lastCall = mockOnSearchResults.mock.calls[mockOnSearchResults.mock.calls.length - 1];
      expect(lastCall[0]).toHaveLength(1);
      expect(lastCall[0][0].id).toBe('req-2');
    });
    jest.useRealTimers();
  });

  it('shows all requirements when search is cleared', async () => {
    jest.useFakeTimers();
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'encryption' } });
    act(() => { jest.advanceTimersByTime(350); });
    fireEvent.change(searchInput, { target: { value: '' } });
    act(() => { jest.advanceTimersByTime(350); });

    await waitFor(() => {
      const lastCall = mockOnSearchResults.mock.calls[mockOnSearchResults.mock.calls.length - 1];
      expect(lastCall[0]).toHaveLength(2);
    });
    jest.useRealTimers();
  });

  it('displays result count', async () => {
    jest.useFakeTimers();
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'authentication' } });
    act(() => { jest.advanceTimersByTime(350); });

    await waitFor(() => {
      expect(screen.getByText(/Found 1 result/)).toBeInTheDocument();
    });
    jest.useRealTimers();
  });
});
