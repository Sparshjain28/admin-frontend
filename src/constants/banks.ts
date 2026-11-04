export type BankCategory = 'Private Bank' | 'NBFC' | 'Small Finance Bank' | 'Co-operative Bank';

export interface BankConfig {
  id: string;
  name: string;
  logoUrl?: string;
  logoLetter: string;
  bgColor?: string;
  textColor?: string;
  category?: BankCategory;
}

// Exactly the 38 auto-loan lenders returned during lead creation
export const BANKS_DATA: BankConfig[] = [
  {
    id: "aubank",
    name: "AU Small Finance Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113711291-81907375.png",
    logoLetter: "AU",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    category: "Small Finance Bank"
  },
  {
    id: "axis",
    name: "Axis Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114041384-792540904.jfif",
    logoLetter: "AB",
    bgColor: "bg-rose-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "bajaj",
    name: "Bajaj Finserv Ltd",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113962856-843676723.png",
    logoLetter: "BF",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "bandhan",
    name: "Bandhan Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113289880-966472977.jfif",
    logoLetter: "BB",
    bgColor: "bg-red-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "chola",
    name: "Cholamandalam Finance",
    logoUrl: "/uploads/bank-logos/bank-logo-1782110173185-938699245.png",
    logoLetter: "CF",
    bgColor: "bg-amber-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "duggar",
    name: "DUGGAR FINVEST",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112038365-81030775.jfif",
    logoLetter: "DF",
    bgColor: "bg-emerald-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "equitas",
    name: "Equitas Small Finance Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112083584-340461554.jfif",
    logoLetter: "ES",
    bgColor: "bg-indigo-600",
    textColor: "text-white",
    category: "Small Finance Bank"
  },
  {
    id: "esaf",
    name: "ESAF Small Finance Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782115162791-180719182.jfif",
    logoLetter: "ES",
    bgColor: "bg-cyan-700",
    textColor: "text-white",
    category: "Small Finance Bank"
  },
  {
    id: "federal",
    name: "Federal Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112150651-788070743.png",
    logoLetter: "FB",
    bgColor: "bg-violet-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "fortunefinance",
    name: "Fortune Finance",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112245978-268434269.jfif",
    logoLetter: "FF",
    bgColor: "bg-teal-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "hdb",
    name: "HDB Financial Services",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114167012-878201603.png",
    logoLetter: "HF",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "hdfc",
    name: "HDFC Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114197073-181869390.png",
    logoLetter: "HB",
    bgColor: "bg-rose-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "herofincorp",
    name: "Hero Fincorp",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114243392-989160514.png",
    logoLetter: "HF",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "icici",
    name: "ICICI Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114215192-119487144.jfif",
    logoLetter: "IB",
    bgColor: "bg-red-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "idfc",
    name: "IDFC First Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114267036-198275425.png",
    logoLetter: "IF",
    bgColor: "bg-amber-600",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "idfc_urban",
    name: "IDFC First Bank Urban",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112632911-441855749.jfif",
    logoLetter: "IF",
    bgColor: "bg-emerald-600",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "ikf",
    name: "IKF Finance",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114289085-926557080.png",
    logoLetter: "IF",
    bgColor: "bg-indigo-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "indostar",
    name: "Indostar",
    logoUrl: "/uploads/bank-logos/bank-logo-1782115121239-527116238.png",
    logoLetter: "IN",
    bgColor: "bg-cyan-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "indusind",
    name: "IndusInd Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114318553-244071231.png",
    logoLetter: "IB",
    bgColor: "bg-violet-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "jana",
    name: "Jana Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113004239-483783632.jfif",
    logoLetter: "JB",
    bgColor: "bg-teal-700",
    textColor: "text-white",
    category: "Small Finance Bank"
  },
  {
    id: "kogta",
    name: "Kogta Financial India Limited",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114360734-597411321.jfif",
    logoLetter: "KF",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "kotak",
    name: "Kotak Mahindra Prime",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113178207-487390895.png",
    logoLetter: "KM",
    bgColor: "bg-rose-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "loans24",
    name: "Loans24",
    logoUrl: "/uploads/bank-logos/bank-logo-1782113422750-851299159.png",
    logoLetter: "LO",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "mahindra",
    name: "Mahindra Finance",
    logoUrl: "/uploads/bank-logos/bank-logo-1780483737780-295784102.png",
    logoLetter: "MF",
    bgColor: "bg-red-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "manappuram",
    name: "Manappuram Finance Limited",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114382131-225430108.jfif",
    logoLetter: "MF",
    bgColor: "bg-amber-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "muthoot",
    name: "Muthoot Capital",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114394808-498267635.png",
    logoLetter: "MC",
    bgColor: "bg-emerald-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "nissan",
    name: "Nissan Renault Financial Services",
    logoUrl: "/uploads/bank-logos/bank-logo-1782115840855-71072361.jfif",
    logoLetter: "NR",
    bgColor: "bg-indigo-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "piramal",
    name: "Piramal",
    logoUrl: "/uploads/bank-logos/bank-logo-1780483760044-16022487.png",
    logoLetter: "PI",
    bgColor: "bg-cyan-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "poonawalla",
    name: "Poonawalla Fincorp Limited",
    logoUrl: "/uploads/bank-logos/bank-logo-1780483782312-938109249.png",
    logoLetter: "PF",
    bgColor: "bg-violet-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "rbl",
    name: "RBL Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114561939-892393871.png",
    logoLetter: "RB",
    bgColor: "bg-teal-700",
    textColor: "text-white",
    category: "Private Bank"
  },
  {
    id: "saraswat",
    name: "Saraswat Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114777549-664950792.jfif",
    logoLetter: "SB",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    category: "Co-operative Bank"
  },
  {
    id: "sundram",
    name: "Sundram Finance",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114809517-384576699.png",
    logoLetter: "SF",
    bgColor: "bg-rose-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "suryoday",
    name: "Suryoday Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114841234-685198355.jfif",
    logoLetter: "SB",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    category: "Small Finance Bank"
  },
  {
    id: "tatacapital",
    name: "Tata Capital",
    logoUrl: "/uploads/bank-logos/bank-logo-1780483803879-807593015.webp",
    logoLetter: "TC",
    bgColor: "bg-red-700",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "toyota",
    name: "Toyota Financial Services India Limited",
    logoUrl: "/uploads/bank-logos/bank-logo-1782114921363-545321399.png",
    logoLetter: "TF",
    bgColor: "bg-amber-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "tvs",
    name: "TVS Credit Services",
    logoUrl: "/uploads/bank-logos/bank-logo-1782115067609-423743631.jfif",
    logoLetter: "TC",
    bgColor: "bg-emerald-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "vastu",
    name: "Vastu Finserve",
    logoUrl: "/uploads/bank-logos/bank-logo-1782112776441-181419755.jfif",
    logoLetter: "VF",
    bgColor: "bg-indigo-600",
    textColor: "text-white",
    category: "NBFC"
  },
  {
    id: "yes",
    name: "Yes Bank",
    logoUrl: "/uploads/bank-logos/bank-logo-1780483828745-180869945.png",
    logoLetter: "YB",
    bgColor: "bg-cyan-700",
    textColor: "text-white",
    category: "Private Bank"
  }
];
