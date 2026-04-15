import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  style,
  ...props
}: InputProps) {
  const hasError = !!error;

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    color: "var(--text-2)",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface)",
    border: `1px solid ${hasError ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "6px",
    color: "var(--text-1)",
    fontSize: "14px",
    padding: "7px 12px",
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    ...style,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = hasError
      ? "var(--accent)"
      : "var(--primary)";
    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${
      hasError ? "247, 129, 102" : "88, 166, 255"
    }, 0.1)`;
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = hasError
      ? "var(--accent)"
      : "var(--border)";
    e.currentTarget.style.boxShadow = "none";
    props.onBlur?.(e);
  };

  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--accent)",
            marginTop: "4px",
          }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-3)",
            marginTop: "4px",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}