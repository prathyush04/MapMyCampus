export default function StarRating({ value, max = 5 }) {
  return (
    <span className="text-amber-400 text-sm" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i}>{i < Math.round(value) ? '★' : '☆'}</span>
      ))}
      <span className="text-gray-500 ml-1 text-xs">({Number(value).toFixed(1)})</span>
    </span>
  );
}
