"use client";

import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

export function WorkorderLogo({
  className,
  size = 28,
  ...props
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Workorder logo"
      {...props}
    >
      <path
        d="M29 0H21C18.7909 0 17 1.79086 17 4C17 6.20914 18.7909 8 21 8H29C31.2091 8 33 6.20914 33 4C33 1.79086 31.2091 0 29 0Z"
        fill="currentColor"
      />
      <path
        d="M37 4H13C9.68629 4 7 6.68629 7 10V42C7 45.3137 9.68629 48 13 48H37C40.3137 48 43 45.3137 43 42V10C43 6.68629 40.3137 4 37 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="12"
        y="12"
        width="26"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="12"
        y="26"
        width="11"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="27"
        y="26"
        width="11"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export default WorkorderLogo;
