const CATEGORY_COLORS = {
  food:     'bg-orange-100 text-orange-700',
  academic: 'bg-blue-100 text-blue-700',
  sports:   'bg-green-100 text-green-700',
  admin:    'bg-gray-100 text-gray-700',
  medical:  'bg-red-100 text-red-700',
  facility: 'bg-purple-100 text-purple-700',
  other:    'bg-yellow-100 text-yellow-700',
};

export default function CategoryBadge({ category }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
      {category}
    </span>
  );
}
