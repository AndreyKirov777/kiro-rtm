import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Requirement } from '../types';

interface SearchBarProps {
  requirements: Requirement[];
  onSearchResults: (results: Requirement[]) => void;
  placeholder?: string;
  debounceMs?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  requirements,
  onSearchResults,
  placeholder = 'Search requirements...',
  debounceMs = 300,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Memoize filtered results
  const filteredResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return requirements;
    }

    const query = debouncedQuery.toLowerCase();
    return requirements.filter((req) => {
      // Search across multiple fields
      const searchableText = [
        req.displayId,
        req.title,
        req.description,
        req.type,
        req.status,
        req.priority,
        ...req.tags,
        ...Object.values(req.customFields).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : String(v)
        ),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [debouncedQuery, requirements]);

  // Notify parent of filtered results
  useEffect(() => {
    onSearchResults(filteredResults);
  }, [filteredResults, onSearchResults]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search requirements"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {debouncedQuery && (
        <div className="mt-2 text-sm text-gray-600">
          Found {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
