import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoanSelection() {
  const categories = useMemo(
    () => [
      {
        id: 2,
        name: "Loans",
        description:
          "Secure the funds you need with flexible and reliable loan options.",
        image: "/loan-card-images/tax 1.png",
        bgColor: "bg-[#F0E7FA]",
        activeBorder: "border-purple-400",

        subCategories: [
          {
            id: 15,
            name: "Used Car Loan",
            description:
              "Secure the funds you need with flexible and reliable loan options.",
            image: "/loan-card-images/subcategories/tax 1 (2).png",
            bgColor: "bg-[#E1F8EA]",
          },
          {
            id: 16,
            name: "New Car Loan",
            description:
              "Secure the funds you need with flexible and reliable loan options.",
            image: "/loan-card-images/subcategories/life-insurance 1 (2).png",
            bgColor: "bg-[#FAF8EB]",
          },
        ],
      },
    ],
    [],
  );

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(
    categories[0].subCategories[0].id,
  );

  const navigate = useNavigate();

  const handleCategory = (category: typeof categories[0]) => {
    setSelectedCategory(category);
    setSelectedSubCategory(category.subCategories[0]?.id);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pt-2">
      {/* Category */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">
          Category Selection
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategory(category)}
              className={`rounded-xl border-2 p-5 text-left transition-all duration-300 ${
                selectedCategory.id === category.id
                  ? `${category.activeBorder} shadow-md`
                  : "border-gray-200 hover:border-blue-300"
              } ${category.bgColor}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {category.name}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {category.description}
                  </p>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sub Category */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">
          Sub Category Selection
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {selectedCategory.subCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedSubCategory(item.id);
                navigate(`/add-lead?case_type=${encodeURIComponent(item.name)}`);
              }}
              className={`rounded-xl border-2 p-5 text-left transition-all duration-300 ${
                selectedSubCategory === item.id
                  ? "border-green-500 shadow-md"
                  : "border-transparent hover:border-green-300"
              } ${item.bgColor}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {item.name}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
