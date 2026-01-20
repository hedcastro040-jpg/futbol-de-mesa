import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-bold rounded-lg transition-transform active:scale-95 shadow-lg border-b-4 focus:outline-none";
  
  const variants = {
    primary: "bg-blue-500 border-blue-700 text-white hover:bg-blue-400",
    secondary: "bg-gray-600 border-gray-800 text-white hover:bg-gray-500",
    danger: "bg-red-500 border-red-700 text-white hover:bg-red-400",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};