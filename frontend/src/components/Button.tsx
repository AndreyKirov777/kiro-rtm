import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean; // Alias for loading
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  isLoading = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  // Normalize size prop
  const normalizedSize = size === 'sm' ? 'small' : size === 'md' ? 'medium' : size === 'lg' ? 'large' : size;
  const isButtonLoading = loading || isLoading;

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '4px',
    border: 'none',
    cursor: disabled || isButtonLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled || isButtonLoading ? 0.5 : 1,
  };
  
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#007bff',
      color: '#fff',
    },
    secondary: {
      backgroundColor: '#6c757d',
      color: '#fff',
    },
    danger: {
      backgroundColor: '#dc3545',
      color: '#fff',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#333',
      border: '1px solid #ccc',
    },
  };
  
  const sizeStyles: Record<string, React.CSSProperties> = {
    small: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
    },
    medium: {
      padding: '0.5rem 1rem',
      fontSize: '1rem',
    },
    large: {
      padding: '0.75rem 1.5rem',
      fontSize: '1.125rem',
    },
  };
  
  return (
    <button
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...sizeStyles[normalizedSize],
        ...style,
      }}
      className={className}
      disabled={disabled || isButtonLoading}
      {...props}
    >
      {isButtonLoading && (
        <svg
          className="animate-spin h-4 w-4 mr-2"
          style={{ marginRight: '0.5rem' }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export { Button };
export default Button;
