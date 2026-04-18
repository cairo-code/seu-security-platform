import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, {
  backgroundColor: string;
  borderColor: string;
  color: string;
  hoverBackgroundColor: string;
}> = {
  primary: {
    backgroundColor: "#1f4070",
    borderColor: "#388bfd",
    color: "#58a6ff",
    hoverBackgroundColor: "#1a3560",
  },
  secondary: {
    backgroundColor: "#21262d",
    borderColor: "#30363d",
    color: "#e6edf3",
    hoverBackgroundColor: "#30363d",
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    color: "#8b949e",
    hoverBackgroundColor: "#21262d",
    
  },
  danger: {
    backgroundColor: "#2a0f08",
    borderColor: "#6b2c1f",
    color: "#f78166",
    hoverBackgroundColor: "#3a1510",
  },
};

const sizeStyles: Record<ButtonSize, {
  padding: string;
  fontSize: string;
}> = {
  sm: {
    padding: "4px 10px",
    fontSize: "12px",
  },
  md: {
    padding: "6px 14px",
    fontSize: "13px",
  },
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  style,
  ...props
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const baseStyle: React.CSSProperties = {
    borderRadius: "6px",
    fontSize: sizeStyle.fontSize,
    fontWeight: 500,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: "background 150ms ease, border-color 150ms ease",
    border: `1px solid ${variantStyle.borderColor}`,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: sizeStyle.padding,
    backgroundColor: variantStyle.backgroundColor,
    color: variantStyle.color,
    opacity: disabled || loading ? 0.5 : 1,
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.backgroundColor = variantStyle.hoverBackgroundColor;
      // removed hoverColor logic, since it doesn't exist in variantStyle anymore

    }

  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = variantStyle.backgroundColor;
    e.currentTarget.style.color = variantStyle.color;

  };

  return (
    <button
      disabled={disabled || loading}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: "12px",
            height: "12px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      )}
      {children}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}