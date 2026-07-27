export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  color,
  size = 44,
  online,
}: {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white font-medium select-none"
        style={{ background: color, fontSize: size * 0.38 }}
      >
        {initials(name)}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
