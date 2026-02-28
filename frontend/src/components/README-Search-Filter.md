# Search, Filter, and Saved Views Components

This document describes the search, filter, and saved views functionality implemented for the Requirements Management & Traceability application.

## Components

### SearchBar

A full-text search component that filters requirements across multiple fields.

**Features:**
- Real-time search across title, description, type, status, priority, tags, and custom fields
- Clear button to reset search
- Result count display
- Case-insensitive matching

**Usage:**
```tsx
<SearchBar
  requirements={requirements}
  onSearchResults={(filtered) => setFilteredRequirements(filtered)}
  placeholder="Search requirements..."
/>
```

**Props:**
- `requirements: Requirement[]` - Array of requirements to search
- `onSearchResults: (results: Requirement[]) => void` - Callback with filtered results
- `placeholder?: string` - Optional placeholder text (default: "Search requirements...")

### FilterPanel

A comprehensive filtering panel with multiple filter criteria.

**Features:**
- Filter by status (Draft, In Review, Approved, Deprecated)
- Filter by type (Stakeholder Need, System Requirement, Software Requirement, etc.)
- Filter by priority (Critical, High, Medium, Low)
- Filter by coverage status (Passed, Failed, Not Run, No Test)
- Filter by tags (dynamically extracted from requirements)
- Filter by custom fields (dynamically extracted from requirements)
- Multiple filter combinations
- Active filter count badge
- Clear all filters button

**Usage:**
```tsx
<FilterPanel
  requirements={requirements}
  onFilterChange={(filtered) => setFilteredRequirements(filtered)}
  availableUsers={users}
/>
```

**Props:**
- `requirements: Requirement[]` - Array of requirements to filter
- `onFilterChange: (filtered: Requirement[]) => void` - Callback with filtered results
- `availableUsers?: Array<{ id: string; name: string }>` - Optional list of users for assignee filter

**Filter Logic:**
- All filters within a category use OR logic (e.g., status=draft OR status=approved)
- Filters across categories use AND logic (e.g., status=draft AND priority=high)
- Custom field filters use partial string matching

### SavedViews

A component for saving and loading filter/sort configurations.

**Features:**
- Save current filter and sort configuration with name and description
- Store views in localStorage
- Load saved views with one click
- Delete saved views
- Share views with team members (mock implementation)
- View filter summary display

**Usage:**
```tsx
<SavedViews
  currentFilters={filters}
  currentSort={{ by: 'displayId', order: 'asc' }}
  onLoadView={(view) => applyView(view)}
  currentUserId={user.id}
/>
```

**Props:**
- `currentFilters: FilterConfig` - Current filter configuration
- `currentSort: { by: string; order: 'asc' | 'desc' }` - Current sort configuration
- `onLoadView: (view: SavedView) => void` - Callback when view is loaded
- `currentUserId: string` - Current user ID for view ownership

**Storage:**
- Views are stored in localStorage under the key `saved_views`
- Each view includes: id, name, description, filters, sort, timestamps, and sharing status

## Types

### FilterConfig

```typescript
interface FilterConfig {
  status: RequirementStatus[];
  type: RequirementType[];
  priority: Priority[];
  tags: string[];
  assignee: string[];
  coverageStatus: CoverageStatus[];
  customFields: Record<string, string>;
}
```

### SavedView

```typescript
interface SavedView {
  id: string;
  name: string;
  description: string;
  filters: FilterConfig;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  createdAt: string;
  createdBy: string;
  shared: boolean;
}
```

## Integration

The components are integrated into `RequirementListPage.tsx`:

1. **SearchBar** filters the base requirement list
2. **FilterPanel** applies additional filters to the search results
3. **SavedViews** allows saving and loading filter/sort combinations
4. Results are displayed in either table or tree view

## Requirements Satisfied

- **Requirement 23.1-23.4**: Full-text search across all requirement fields
- **Requirement 24.1-24.8**: Multi-criteria filtering (status, type, priority, tags, assignee, custom fields, coverage status)
- **Requirement 25.1-25.4**: Save and share views with filter and sort configurations

## Future Enhancements

When connecting to the real backend API:

1. **Server-side search**: Move search logic to backend with PostgreSQL full-text search
2. **Server-side filtering**: Apply filters in database queries for better performance
3. **Persistent saved views**: Store views in database instead of localStorage
4. **Real sharing**: Implement actual view sharing with team members via API
5. **Advanced filters**: Add date range filters, numeric comparisons, and complex boolean logic
6. **Search highlighting**: Highlight matching terms in search results
7. **Filter presets**: Provide common filter combinations as quick-access presets
