import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

interface ElectronicSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (meaning: string, password: string) => Promise<void>;
  requirementId: string;
  action: string;
}

const ElectronicSignatureModal: React.FC<ElectronicSignatureModalProps> = ({
  isOpen,
  onClose,
  onSign,
  requirementId,
  action,
}) => {
  const [meaning, setMeaning] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!meaning.trim()) {
      setError('Signature meaning is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required for electronic signature');
      return;
    }

    setLoading(true);
    try {
      await onSign(meaning, password);
      setMeaning('');
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to capture signature');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMeaning('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Electronic Signature">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>21 CFR Part 11 Compliance:</strong> By signing this document, you
            certify that this electronic signature is legally binding and equivalent to
            your handwritten signature.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <Input value={action} disabled />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requirement ID
          </label>
          <Input value={requirementId} disabled />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Signature Meaning <span className="text-red-500">*</span>
          </label>
          <Input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="e.g., Approved for implementation"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe the meaning of your signature
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Re-enter your password to confirm your identity
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing...' : 'Sign Document'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>
            Timestamp: {new Date().toISOString()}
          </p>
          <p className="mt-1">
            This signature will be cryptographically hashed and stored immutably in the
            audit trail.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default ElectronicSignatureModal;
