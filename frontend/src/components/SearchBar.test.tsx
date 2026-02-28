import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('filters requirements based on search query', () => {
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'encryption' } });

    // Should be called with filtered results
    expect(mockOnSearchResults).toHaveBeenCalled();
    const lastCall = mockOnSearchResults.mock.calls[mockOnSearchResults.mock.calls.length - 1];
    expect(lastCall[0]).toHaveLength(1);
    expect(lastCall[0][0].id).toBe('req-2');
  });

  it('shows all requirements when search is cleared', () => {
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'encryption' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    const lastCall = mockOnSearchResults.mock.calls[mockOnSearchResults.mock.calls.length - 1];
    expect(lastCall[0]).toHaveLength(2);
  });

  it('displays result count', () => {
    const mockOnSearchResults = jest.fn();
    render(
      <SearchBar
        requirements={mockRequirements}
        onSearchResults={mockOnSearchResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search requirements...');
    fireEvent.change(searchInput, { target: { value: 'authentication' } });

    expect(screen.getByText(/Found 1 result/)).toBeInTheDocument();
  });
});
