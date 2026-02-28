import React from 'react';
import Modal from './Modal';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Open search', category: 'Navigation' },
  { keys: ['Ctrl', 'N'], description: 'Create new requirement', category: 'Navigation' },
  { keys: ['Ctrl', 'H'], description: 'Go to home/dashboard', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modal or dialog', category: 'Navigation' },
  
  // Actions
  { keys: ['Ctrl', 'S'], description: 'Save current form', category: 'Actions' },
  { keys: ['Ctrl', 'E'], description: 'Edit current item', category: 'Actions' },
  { keys: ['Ctrl', 'D'], description: 'Delete current item', category: 'Actions' },
  
  // View
  { keys: ['Ctrl', 'B'], description: 'Toggle sidebar', category: 'View' },
  { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts', category: 'View' },
  { keys: ['Ctrl', 'F'], description: 'Focus search', category: 'View' },
];

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{category}</h3>
            <div className="space-y-2">
              {shortcuts
                .filter((s) => s.category === category)
                .map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-400">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">Esc</kbd> to close this dialog
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
