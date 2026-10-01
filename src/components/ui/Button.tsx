import React from "react";

export type ButtonVariant = "primary" | "secondary" | "pos" | "danger" | "outline" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan text-black font-bold hover:bg-cyan/90 shadow-sm shadow-cyan/25 hover:shadow-cyan/40 border border-cyan/50",
  secondary:
    "bg-card hover:bg-card-hover text-themed border border-border hover:border-cyan/30 shadow-sm",
  pos:
    "bg-pos text-black font-bold hover:bg-pos/90 shadow-sm shadow-pos/25 hover:shadow-pos/40 border border-pos/50",
  danger:
    "bg-neg text-white font-bold hover:bg-neg/90 shadow-sm shadow-neg/25 hover:shadow-neg/40 border border-neg/50",
  outline:
    "bg-transparent hover:bg-cyan/10 text-themed hover:text-cyan border border-border hover:border-cyan/50",
  ghost:
    "bg-transparent hover:bg-card-hover text-muted hover:text-themed border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2 py-1 text-[11px] rounded gap-1",
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-xs rounded-lg gap-2",
  lg: "px-5 py-3 text-sm rounded-xl gap-2.5 font-medium",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-mono select-none
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${isDisabled ? "opacity-45 cursor-not-allowed pointer-events-none" : "cursor-pointer active:scale-[0.98]"}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
