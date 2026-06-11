const CATEGORY_COLORS = {
  food: 'bg-orange-100 text-orange-800 border-orange-200',
  academic: 'bg-blue-100 text-blue-800 border-blue-200',
  sports: 'bg-green-100 text-green-800 border-green-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  medical: 'bg-red-100 text-red-800 border-red-200',
  facility: 'bg-teal-100 text-teal-800 border-teal-200',
  hostel: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  gates: 'bg-stone-100 text-stone-800 border-stone-300',
  parking: 'bg-slate-100 text-slate-800 border-slate-300',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function CategoryBadge({ category }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
      {category}
    </span>
  );
}
