export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="28" height="28" rx="7" fill="#0F172A" />
      <path d="M8 9.5H20M8 14H16.5M8 18.5H13" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="19.5" cy="18.5" r="2.5" fill="#3B82F6" />
    </svg>
  );
}
