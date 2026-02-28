import React from 'react';

/**
 * Skip to main content link for keyboard and screen reader users
 * Allows users to bypass navigation and jump directly to main content
 */
const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="skip-to-content"
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 999,
        padding: '1rem',
        backgroundColor: '#007bff',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '0 0 4px 0',
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
