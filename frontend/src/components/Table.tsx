import React, { useState } from 'react';
import Button from './Button';

export interface Column<T> {
  key: string;
  header?: string;
  label?: string;
  /** Render cell: (row) => node or (value, row) => node. Table calls with (value, row) or (row) for 1-arg. */
  render?: ((value: any, row: T) => React.ReactNode) | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

type SortDirection = 'asc' | 'desc' | null;

function Table<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor = (row: T) => (row as { id?: string }).id ?? String(row),
  onRowClick,
  pagination,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };
  
  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);
  
  return (
    <div className="w-full">
      <div className="table-responsive">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      {column.header ?? column.label}
                      {sortKey === column.key && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ) : (
                    column.header ?? column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
  ? column.render.length >= 2
    ? (column.render as (value: unknown, row: T) => React.ReactNode)(row[column.key], row)
    : (column.render as (row: T) => React.ReactNode)(row)
  : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="stack-mobile px-6 py-3 bg-white border-t justify-between">
          <div className="text-sm text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
