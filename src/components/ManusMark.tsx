interface ManusMarkProps {
  className?: string;
  alt?: string;
}

export default function ManusMark({ className = '', alt = '' }: ManusMarkProps) {
  return (
    <img
      src="/manus-mark-transparent.png"
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
}
