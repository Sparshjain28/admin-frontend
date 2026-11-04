import { useState } from 'react';
import { BANKS_DATA, BankData } from '@/constants/banks';


const DELETED_KEY = 'finonest_deleted_bank_filters';

interface Props {
  cards: any[];
  selectedBank: string;
  onSelectBank: (bankName: string) => void;
}

export default function BankSelectionMenu({ cards, selectedBank, onSelectBank }: Props) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Always show all banks
  const banks = BANKS_DATA;

  const getCardsForBank = (bank: BankData) =>
    cards.filter(card => bank.dbBankNames.some(db => db.toLowerCase() === (card.bank || '').toLowerCase()));

  return (
    <div className="w-full space-y-0 md:space-y-3 text-left">
      <div className="hidden md:flex items-center justify-between">
        <h2 className="text-gray-500 font-sans font-bold text-base md:text-lg">
          Click on any bank logo for a quick view
        </h2>
      </div>


      {/* Mobile View - Horizontal Scroll (Hard Debugged with Snap) */}
      <div className="md:hidden relative w-full mb-0 md:mb-2">
        <div 
          className="-mx-4 px-4 overflow-x-auto scroll-smooth relative z-50 touch-pan-x snap-x snap-mandatory no-scrollbar" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            width: 'calc(100% + 2rem)'
          }}
        >
          <div className="inline-flex gap-2 py-1.5 md:py-1 min-w-max pr-10">
            <button
              onClick={() => onSelectBank('all')}
              className={`snap-start flex flex-col items-center py-2 px-3 rounded-[10px] transition-all duration-200 select-none relative ${selectedBank === 'all' ? 'bg-[#EAF2FC] border border-[#1A73E8] shadow-sm' : 'bg-[#F4F5F7] hover:bg-gray-200 border border-transparent'}`}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm bg-white text-gray-700 shadow-sm border border-gray-200 mb-1">All</div>
              <span className="text-[#4A4A4A] font-semibold text-[12px] text-center">All Banks</span>
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{cards.length}</span>
            </button>

          {banks.map((bank) => {
            const isActive = selectedBank === bank.name;
            const count = getCardsForBank(bank).length;
            return (
              <div key={bank.id} className="relative group">
                <button
                  key={bank.id}
                  onClick={() => onSelectBank(isActive ? 'all' : bank.name)}
                  className={`snap-start flex flex-col items-center py-2 px-3 rounded-[10px] transition-all duration-200 select-none relative ${isActive ? 'bg-[#EAF2FC] border border-[#1A73E8] shadow-sm' : 'bg-[#F4F5F7] hover:bg-gray-200 border border-transparent'}`}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm overflow-hidden bg-white border border-gray-300 group-hover:scale-105 transition-transform mb-1">
                    {!imageErrors[bank.id] && bank.logoUrl ? (
                      <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-cover"
                        onError={() => setImageErrors(p => ({ ...p, [bank.id]: true }))} />
                    ) : (
                      <span className={`${bank.bgColor} ${bank.textColor} w-full h-full flex items-center justify-center text-[9px] font-bold`}>{bank.logoLetter}</span>
                    )}
                  </div>
                  <span className="text-[#4A4A4A] font-semibold text-[11px] text-center truncate max-w-[60px]">{bank.name}</span>
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{count}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Desktop View - Wrapping Flex (Not Scrollable) */}
      <div className="hidden md:flex flex-wrap gap-3 py-2 overflow-visible relative z-10">
        <button
          onClick={() => onSelectBank('all')}
          className={`flex flex-col items-center py-3 px-4 rounded-[10px] transition-all duration-200 select-none relative ${selectedBank === 'all' ? 'bg-[#EAF2FC] border border-[#1A73E8] shadow-sm' : 'bg-[#F4F5F7] hover:bg-gray-200 border border-transparent'}`}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm bg-white text-gray-700 shadow-sm border border-gray-200 mb-2">All</div>
          <span className="text-[#4A4A4A] font-semibold text-[13px] text-center">All Banks</span>
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center">{cards.length}</span>
        </button>

        {banks.map((bank) => {
          const isActive = selectedBank === bank.name;
          const count = getCardsForBank(bank).length;
          return (
            <div key={bank.id} className="relative group">
              <button
                key={bank.id}
                onClick={() => onSelectBank(isActive ? 'all' : bank.name)}
                className={`flex flex-col items-center py-3 px-4 rounded-[10px] transition-all duration-200 select-none relative ${isActive ? 'bg-[#EAF2FC] border border-[#1A73E8] shadow-sm' : 'bg-[#F4F5F7] hover:bg-gray-200 border border-transparent'}`}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm overflow-hidden bg-white border border-gray-300 group-hover:scale-105 transition-transform mb-2">
                  {!imageErrors[bank.id] && bank.logoUrl ? (
                    <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-cover"
                      onError={() => setImageErrors(p => ({ ...p, [bank.id]: true }))} />
                  ) : (
                    <span className={`${bank.bgColor} ${bank.textColor} w-full h-full flex items-center justify-center text-[9px] font-bold`}>{bank.logoLetter}</span>
                  )}
                </div>
                <span className="text-[#4A4A4A] font-semibold text-[13px] text-center">{bank.name}</span>
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center">{count}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
