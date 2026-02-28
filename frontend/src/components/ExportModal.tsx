import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';

type ExportFormat = 'csv' | 'json' | 'pdf' | 'reqif';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const AVAILABLE_FIELDS = [
  { id: 'displayId', label: 'Display ID', required: true },
  { id: 'title', label: 'Title', required: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'type', label: 'Type', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'priority', label: 'Priority', required: false },
  { id: 'version', label: 'Version', required: false },
  { id: 'tags', label: 'Tags', required: false },
  { id: 'createdAt', label: 'Created Date', required: false },
  { id: 'updatedAt', label: 'Updated Date', required: false },
  { id: 'createdBy', label: 'Created By', required: false },
  { id: 'updatedBy', label: 'Updated By', required: false },
  { id: 'customFields', label: 'Custom Fields', required: false },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.filter(f => f.required).map(f => f.id)
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleFieldToggle = (fieldId: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
    if (field?.required) return; // Can't deselect required fields

    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);

    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock export - create a blob and download
    const mockData = generateMockExportData(format, selectedFields);
    const blob = new Blob([mockData], {
      type: getMimeType(format),
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requirements-export-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    onClose();
  };

  const getMimeType = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'pdf':
        return 'application/pdf';
      case 'reqif':
        return 'application/xml';
      default:
        return 'text/plain';
    }
  };

  const generateMockExportData = (format: ExportFormat, fields: string[]): string => {
    if (format === 'csv') {
      const headers = fields.join(',');
      const rows = [
        'REQ-001,User Authentication,Implement user login with email and password,System Requirement,Approved,High,1,security;auth,2024-01-15,2024-02-20,john@example.com,jane@example.com,{}',
        'REQ-002,Password Reset,Allow users to reset forgotten passwords,System Requirement,In Review,Medium,2,security,2024-01-16,2024-02-21,john@example.com,john@example.com,{}',
        'REQ-003,Two-Factor Authentication,Add 2FA support for enhanced security,System Requirement,Draft,High,1,security;auth,2024-01-17,2024-01-17,jane@example.com,jane@example.com,{}',
      ];
      return `${headers}\n${rows.join('\n')}`;
    }

    if (format === 'json') {
      const mockRequirements = [
        {
          displayId: 'REQ-001',
          title: 'User Authentication',
          description: 'Implement user login with email and password',
          type: 'System Requirement',
          status: 'Approved',
          priority: 'High',
          version: 1,
          tags: ['security', 'auth'],
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-02-20T14:30:00Z',
          createdBy: 'john@example.com',
          updatedBy: 'jane@example.com',
          customFields: {},
        },
        {
          displayId: 'REQ-002',
          title: 'Password Reset',
          description: 'Allow users to reset forgotten passwords',
          type: 'System Requirement',
          status: 'In Review',
          priority: 'Medium',
          version: 2,
          tags: ['security'],
          createdAt: '2024-01-16T10:00:00Z',
          updatedAt: '2024-02-21T09:15:00Z',
          createdBy: 'john@example.com',
          updatedBy: 'john@example.com',
          customFields: {},
        },
      ];

      // Filter fields
      const filteredRequirements = mockRequirements.map((req) => {
        const filtered: any = {};
        fields.forEach((field) => {
          if (field in req) {
            filtered[field] = (req as any)[field];
          }
        });
        return filtered;
      });

      return JSON.stringify(filteredRequirements, null, 2);
    }

    if (format === 'pdf') {
      return 'Mock PDF content - In a real implementation, this would be a PDF binary';
    }

    if (format === 'reqif') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<REQ-IF xmlns="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd">
  <THE-HEADER>
    <REQ-IF-HEADER IDENTIFIER="mock-export">
      <CREATION-TIME>2024-02-28T10:00:00Z</CREATION-TIME>
      <TITLE>Requirements Export</TITLE>
    </REQ-IF-HEADER>
  </THE-HEADER>
  <CORE-CONTENT>
    <REQ-IF-CONTENT>
      <SPEC-OBJECTS>
        <SPEC-OBJECT IDENTIFIER="REQ-001">
          <VALUES>
            <ATTRIBUTE-VALUE-STRING THE-VALUE="User Authentication">
              <DEFINITION>
                <ATTRIBUTE-DEFINITION-STRING IDENTIFIER="Title"/>
              </DEFINITION>
            </ATTRIBUTE-VALUE-STRING>
          </VALUES>
        </SPEC-OBJECT>
      </SPEC-OBJECTS>
    </REQ-IF-CONTENT>
  </CORE-CONTENT>
</REQ-IF>`;
    }

    return '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Requirements">
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Export Format
          </label>
          <Select
            value={format}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormat(e.target.value as ExportFormat)}
            disabled={isExporting}
          >
            <option value="csv">CSV (Comma-Separated Values)</option>
            <option value="json">JSON (JavaScript Object Notation)</option>
            <option value="pdf">PDF (Portable Document Format)</option>
            <option value="reqif">ReqIF (Requirements Interchange Format)</option>
          </Select>
          <p className="text-sm text-gray-500 mt-1">
            {format === 'csv' && 'Export as spreadsheet-compatible CSV file'}
            {format === 'json' && 'Export as structured JSON for programmatic access'}
            {format === 'pdf' && 'Export as formatted PDF report'}
            {format === 'reqif' && 'Export as ReqIF XML for tool interoperability'}
          </p>
        </div>

        {/* Field Selection (CSV and JSON only) */}
        {(format === 'csv' || format === 'json') && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Fields to Include
            </label>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {AVAILABLE_FIELDS.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      disabled={field.required || isExporting}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {field.label}
                      {field.required && (
                        <span className="text-gray-500 ml-1">(required)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* PDF Template Selection */}
        {format === 'pdf' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Report Template
            </label>
            <Select disabled={isExporting}>
              <option value="standard">Standard Report</option>
              <option value="detailed">Detailed Report with Traceability</option>
              <option value="compliance">Compliance Report</option>
            </Select>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">
                Generating export file...
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button onClick={onClose} variant="secondary" disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
