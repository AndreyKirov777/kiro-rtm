import React, { useState } from 'react';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import Modal from '../components/Modal';

type ImportFormat = 'csv' | 'reqif' | 'word';

interface ValidationError {
  row?: number;
  field?: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: ValidationError[];
}

export const ImportPage: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>('csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  
  // CSV field mapping state
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    title: 'title',
    description: 'description',
    type: 'type',
    status: 'status',
    priority: 'priority',
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportProgress(0);

    // Mock import process with progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate import delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    clearInterval(progressInterval);
    setImportProgress(100);

    // Mock import result
    const mockResult: ImportResult = {
      success: true,
      imported: 45,
      errors: [
        { row: 12, field: 'status', message: 'Invalid status value "pending". Must be one of: draft, in_review, approved, deprecated' },
        { row: 23, field: 'type', message: 'Missing required field "type"' },
        { row: 34, field: 'displayId', message: 'Display ID "REQ-001" already exists' },
      ],
    };

    setImportResult(mockResult);
    setIsImporting(false);
  };

  const handleFieldMappingChange = (systemField: string, csvColumn: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [systemField]: csvColumn,
    }));
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportProgress(0);
    setShowFieldMapping(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Import Requirements</h1>
        <p className="text-gray-600">
          Import requirements from CSV, ReqIF, or Word documents
        </p>
      </div>

      {!importResult ? (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Import Format
            </label>
            <Select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as ImportFormat)}
              disabled={isImporting}
            >
              <option value="csv">CSV (Comma-Separated Values)</option>
              <option value="reqif">ReqIF (Requirements Interchange Format)</option>
              <option value="word">Word Document (.docx)</option>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              {selectedFormat === 'csv' && 'Import requirements from a CSV file with customizable field mapping'}
              {selectedFormat === 'reqif' && 'Import requirements from ReqIF XML files (OMG standard)'}
              {selectedFormat === 'word' && 'Import requirements from Word documents with heading-based hierarchy'}
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Select File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept={
                  selectedFormat === 'csv' ? '.csv' :
                  selectedFormat === 'reqif' ? '.reqif,.xml' :
                  '.docx'
                }
                onChange={handleFileSelect}
                disabled={isImporting}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-700"
              >
                {selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Click to select a file</p>
                    <p className="text-sm text-gray-500">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* CSV Field Mapping */}
          {selectedFormat === 'csv' && selectedFile && !isImporting && (
            <div className="mb-6">
              <Button
                onClick={() => setShowFieldMapping(!showFieldMapping)}
                variant="secondary"
                className="mb-3"
              >
                {showFieldMapping ? 'Hide' : 'Configure'} Field Mapping
              </Button>
              
              {showFieldMapping && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-4">
                    Map CSV columns to system fields
                  </p>
                  <div className="space-y-3">
                    {Object.entries(fieldMapping).map(([systemField, csvColumn]) => (
                      <div key={systemField} className="flex items-center gap-3">
                        <label className="w-32 text-sm font-medium capitalize">
                          {systemField}:
                        </label>
                        <Input
                          value={csvColumn}
                          onChange={(e) => handleFieldMappingChange(systemField, e.target.value)}
                          placeholder="CSV column name"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Importing...</span>
                <span className="text-sm text-gray-600">{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button
              onClick={resetImport}
              variant="secondary"
              disabled={isImporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Import Results */
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {importResult.success ? (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {importResult.success ? 'Import Completed' : 'Import Failed'}
                </h2>
                <p className="text-gray-600">
                  {importResult.imported} requirements imported successfully
                </p>
              </div>
            </div>

            {/* Validation Errors */}
            {importResult.errors.length > 0 && (
              <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-3">
                  Validation Errors ({importResult.errors.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">
                        {error.row && `Row ${error.row}`}
                        {error.field && ` - ${error.field}`}:
                      </span>
                      <span className="text-gray-700 ml-1">{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={resetImport}>
              Import Another File
            </Button>
            <Button
              onClick={() => window.location.href = '/requirements'}
              variant="secondary"
            >
              View Requirements
            </Button>
          </div>
        </div>
      )}

      {/* Field Mapping Modal (alternative approach) */}
      {showFieldMapping && (
        <Modal
          isOpen={showFieldMapping}
          onClose={() => setShowFieldMapping(false)}
          title="CSV Field Mapping"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Map your CSV columns to system fields. Leave blank to skip a field.
            </p>
            <div className="space-y-3">
              {Object.entries(fieldMapping).map(([systemField, csvColumn]) => (
                <div key={systemField}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {systemField}
                  </label>
                  <Input
                    value={csvColumn}
                    onChange={(e) => handleFieldMappingChange(systemField, e.target.value)}
                    placeholder="CSV column name"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={() => setShowFieldMapping(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={() => setShowFieldMapping(false)}>
                Apply Mapping
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
