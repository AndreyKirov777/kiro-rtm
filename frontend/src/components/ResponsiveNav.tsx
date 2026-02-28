import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface ResponsiveNavProps {
  userName?: string;
  userRole?: string;
  onLogout: () => void;
}

const ResponsiveNav: React.FC<ResponsiveNavProps> = ({ userName, userRole, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1
            className="text-xl font-bold text-gray-900 cursor-pointer"
            onClick={() => navigate('/')}
          >
            RMT Application
          </h1>

          {/* Desktop menu */}
          <div className="hidden-mobile flex items-center gap-4">
            {userName && (
              <span className="text-sm text-gray-600">
                {userName} {userRole && `(${userRole})`}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              className="h-6 w-6 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="hidden-desktop mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-3">
              {userName && (
                <div className="text-sm text-gray-600">
                  {userName} {userRole && `(${userRole})`}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ResponsiveNav;
