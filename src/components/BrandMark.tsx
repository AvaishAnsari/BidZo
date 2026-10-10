export default function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M7.4 8.1c4.5 1.4 7.2 4 8.6 7.9 1.4-3.9 4.1-6.5 8.6-7.9-1.4 4.5-4 7.2-7.9 8.6 3.9 1.4 6.5 4.1 7.9 8.6-4.5-1.4-7.2-4-8.6-7.9-1.4 3.9-4.1 6.5-8.6 7.9 1.4-4.5 4-7.2 7.9-8.6-3.9-1.4-6.5-4.1-7.9-8.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
      <circle cx="7" cy="7" r="1.35" fill="currentColor" />
      <circle cx="25" cy="7" r="1.35" fill="currentColor" />
      <circle cx="7" cy="25" r="1.35" fill="currentColor" />
      <circle cx="25" cy="25" r="1.35" fill="currentColor" />
    </svg>
  );
}
