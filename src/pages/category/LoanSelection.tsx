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
              "Financing for pre-owned passenger and commercial vehicles.",
            image: "/loan-card-images/subcategories/tax 1 (2).png",
            bgColor: "bg-[#E1F8EA]",
          },
          {
            id: 16,
            name: "New Car Loan",
            description:
              "Low interest loans for brand new showroom vehicles.",
            image: "/loan-card-images/subcategories/life-insurance 1 (2).png",
            bgColor: "bg-[#FAF8EB]",
          },
          {
            id: 11,
            name: "Personal Loan",
            description:
              "Quick personal loans with minimal documentation.",
            image: "/loan-card-images/subcategories/Personal Loan.png",
            bgColor: "bg-[#FAF8EB]",
          },
          {
            id: 12,
            name: "Business Loan",
            description:
              "Working capital and term loans for business growth.",
            image: "/loan-card-images/subcategories/tax 1 (1).png",
            bgColor: "bg-[#F0E7FA]",
          },
          {
            id: 13,
            name: "Home Loan",
            description:
              "Affordable home loans with flexible repayment tenure.",
            image: "/loan-card-images/subcategories/life-insurance 1 (1).png",
            bgColor: "bg-[#FAE8E8]",
          },
          {
            id: 14,
            name: "Loan Against Property",
            description:
              "Leverage your commercial or residential property value.",
            image: "/loan-card-images/subcategories/credit-card 1 (1).png",
            bgColor: "bg-[#E8EAF9]",
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
    <div className="mx-auto max-w-7xl space-y-6 pt-2">
      {/* Category Header */}
      <div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">
          Loan Products
        </h2>
        <p className="text-sm text-slate-500">
          Select a loan product category to initiate a new lead or application.
        </p>
      </div>

      {/* Sub Category Grid */}
      <div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {selectedCategory.subCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedSubCategory(item.id);
                navigate(`/add-lead?case_type=${encodeURIComponent(item.name)}`);
              }}
              className="rounded-2xl border-2 border-slate-200/80 p-5 text-left transition-all duration-300 hover:border-blue-500 hover:shadow-lg bg-white group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500 font-medium">
                    {item.description}
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl p-2 bg-slate-50 group-hover:bg-blue-50/50 transition-colors">
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
