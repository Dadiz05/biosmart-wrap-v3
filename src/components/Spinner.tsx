export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
}

