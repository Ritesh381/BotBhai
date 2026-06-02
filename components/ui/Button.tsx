"use client";

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  secondary: "bg-white/10 hover:bg-white/20 text-white",
  ghost: "bg-transparent hover:bg-white/10 text-gray-300",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
