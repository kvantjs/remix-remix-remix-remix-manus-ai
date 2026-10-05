"use client";

import React from "react";

export interface GlideMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  highlightClassName?: string;
  children: React.ReactNode;
}

export default function GlideMenu({
  highlightClassName = "inset-x-0 rounded-control bg-hover",
  className = "",
  children,
  ...props
}: GlideMenuProps) {
  return (
    <div className={`relative flex flex-col ${className}`} {...props}>
      {children}
    </div>
  );
}
