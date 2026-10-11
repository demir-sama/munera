import Image from "next/image";

/**
 * Single place that renders the Munera mark. Swap /public/logo.png (or the src below) to rebrand.
 * The source art has generous padding, so it's cropped via scale inside a clipped square.
 */
export function Logo({ size = 40, className = "", crop = true }: { size?: number; className?: string; crop?: boolean }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Munera"
        width={Math.max(size * 2, 128)}
        height={Math.max(size * 2, 128)}
        priority
        className="h-full w-full select-none object-contain mix-blend-multiply"
        style={crop ? { transform: "scale(1.9)" } : undefined}
      />
    </span>
  );
}
