"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "accent" | "outline";
  size?: "sm" | "md" | "lg" | "xs";
  children?: React.ReactNode;
}

export function Button({
  variant = "default",
  size = "sm",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-control cursor-pointer select-none outline-none disabled:pointer-events-none disabled:opacity-40";
  
  const sizes = {
    xs: "h-6 px-2 text-[11px] gap-1",
    sm: "h-7 px-2.5 text-[12px] gap-1.5",
    md: "h-8 px-3 text-[13px] gap-2",
    lg: "h-9 px-4 text-sm gap-2",
  };

  const variants = {
    default: "bg-surface hover:bg-hover text-ink border border-line shadow-btn",
    ghost: "bg-transparent hover:bg-hover text-ink-2 hover:text-ink",
    accent: "bg-ink text-canvas hover:opacity-90 font-semibold shadow-sm dark:bg-white dark:text-black dark:hover:bg-white/90",
    outline: "bg-transparent hover:bg-hover text-ink border border-line",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
