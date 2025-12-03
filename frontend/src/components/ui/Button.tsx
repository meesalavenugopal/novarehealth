import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-xl
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-cyan-600 to-teal-600
        text-white
        shadow-lg shadow-cyan-500/25
        hover:shadow-xl hover:shadow-cyan-500/30
        hover:-translate-y-0.5
        focus:ring-cyan-500
      `,
      secondary: `
        bg-white text-cyan-600
        border-2 border-cyan-600
        hover:bg-cyan-50
        focus:ring-cyan-500
      `,
      outline: `
        bg-transparent text-slate-700
        border-2 border-slate-300
        hover:border-slate-400 hover:bg-slate-50
        focus:ring-slate-400
      `,
      ghost: `
        bg-transparent text-slate-600
        hover:bg-slate-100
        focus:ring-slate-400
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-rose-500
        text-white
        shadow-lg shadow-red-500/25
        hover:shadow-xl hover:shadow-red-500/30
        hover:-translate-y-0.5
        focus:ring-red-500
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
