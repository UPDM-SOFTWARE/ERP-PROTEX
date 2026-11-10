import React from 'react';
import { CreditCard as CardIcon } from 'lucide-react';
import { getBankData } from '../../utils/bankData';

/* ── Payment network logos (bottom-right corner) ── */
const VisaLogo = ({ sm }) => (
  <svg viewBox="0 0 780 250" className={sm ? 'w-10 h-3' : 'w-14 h-5'}>
    <path
      d="M290.2 237.5l45.1-221.8h72.1l-45.1 221.8zM554.5 22.1c-14.3-5.4-36.7-11.2-64.6-11.2-71.3 0-121.5 36-122 87.4-.5 38 35.7 59.2 62.9 71.8 27.9 12.9 37.3 21.2 37.2 32.7-.2 17.7-22.3 25.7-42.9 25.7-28.7 0-44-3.9-67.5-13.5l-9.2-4.2-10 58.5c16.6 7.3 47.3 13.6 79.2 13.9 74.8 0 123.2-35.2 123.8-89.7.3-29.9-18.7-52.7-59.8-71.5-24.9-12.1-40.2-20.2-40-32.4 0-10.8 12.9-22.4 40.9-22.4 23.4-.4 40.3 4.7 53.5 10l6.4 3 9.6-56.1zM665.9 155.8c5.9-15.2 28.6-73.9 28.6-73.9-.4.7 5.9-15.3 9.5-25.2l4.9 22.7s13.7 63.2 16.6 76.4h-59.6zm88-143.9h-55.5c-17.2 0-30.1 4.7-37.6 22l-106.8 242.4h75.6s12.4-32.6 15.2-39.8c8.3 0 82.1.1 92.7.1 2.2 9.2 8.8 39.7 8.8 39.7H780L753.9 11.9zM208.9 11.9L139.8 163l-7.6-37c-13.2-42.6-54.4-88.7-100.5-111.8L100 237.5h76.2L285.1 11.9h-76.2z"
      fill="white"
    />
    <path
      d="M96.3 11.9H1.2L.5 15.9C76 34 126.4 77.8 147.3 126l-21.2-102c-3.6-16.9-14.7-21.6-29.8-22.1z"
      fill="#FAA61A"
    />
  </svg>
);

const MastercardLogo = ({ sm }) => (
  <svg viewBox="0 0 38 24" className={sm ? 'w-8 h-5' : 'w-12 h-7'}>
    <circle cx="15" cy="12" r="9.5" fill="#EB001B" />
    <circle cx="23" cy="12" r="9.5" fill="#F79E1B" />
    <path d="M19 5.27a9.5 9.5 0 010 13.46 9.5 9.5 0 010-13.46z" fill="#FF5F00" />
  </svg>
);

const AmexNetworkLogo = ({ sm }) => (
  <svg viewBox="0 0 60 20" className={sm ? 'w-10 h-3.5' : 'w-14 h-5'}>
    <text x="0" y="16" fill="white" fillOpacity="0.85" fontSize="13" fontWeight="800" letterSpacing="0.8"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>AMEX</text>
  </svg>
);

// Which network badge to show based on card type/bank
const getNetworkLogo = (card, bankData, sm) => {
  const name = (card.bank || '').toLowerCase();
  if (bankData.isAccount) return null;
  if (name.includes('amex') || name.includes('american')) return <AmexNetworkLogo sm={sm} />;
  if (card.type === 'Credit') return <MastercardLogo sm={sm} />;
  return <VisaLogo sm={sm} />;
};

export function CreditCard({ card, size = 'md', className = '', showType = true, children }) {
  if (!card) return null;
  const bankData = getBankData(card.bank);

  // Size variants
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isAccount = bankData.isAccount;

  const networkBadge = getNetworkLogo(card, bankData, isSm);

  return (
    <div className={`relative rounded-[1.5rem] p-5 flex flex-col justify-between overflow-hidden group shadow-2xl ${className}`}>
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${card.color || bankData.color} -z-10`} />

      {/* Subtle noise / texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10 mix-blend-overlay -z-10" />

      {/* Decorative circle — top-right blur orb */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl -z-10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10 blur-2xl -z-10 pointer-events-none" />

      {/* Inner Border */}
      <div className="absolute inset-0 border border-white/15 rounded-[1.5rem] pointer-events-none" />

      {/* Shine effect on hover */}
      <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shine -z-10 pointer-events-none transform -skew-x-12 transition-opacity duration-700 ease-in-out" />

      {/* Top Row: Bank logo + type badge */}
      <div className="flex justify-between items-start text-white relative z-10 gap-2">
        <div className={`shrink-0 whitespace-nowrap ${isSm ? 'scale-75 origin-top-left -ml-2 -mt-2' : 'scale-[0.85] origin-top-left -mt-1'}`}>
          {bankData.logo ? bankData.logo(card.bank) : <span className="font-bold tracking-widest">{card.bank}</span>}
        </div>
        <div className="flex gap-2 items-center">
          {showType && (
            <div className={`text-white/80 font-medium uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-md ${isSm ? 'text-[8px]' : 'text-[10px]'}`}>
              {isAccount ? 'Bank Account' : (card.type === 'Credit' ? 'Credit' : 'Debit')}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Middle / Chip row */}
      <div className={`flex items-center gap-3 relative z-10 ${isSm ? 'mt-1' : 'mt-4'} ${isAccount ? 'invisible h-6' : ''}`}>
        {!isAccount && (
          <>
            {/* EMV Chip */}
            <div className={`${isSm ? 'w-8 h-6' : 'w-11 h-8'} rounded-md bg-gradient-to-br from-amber-200/90 via-yellow-400/90 to-amber-600/90 border border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] relative overflow-hidden`}>
              {/* Chip lines */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-black/20" />
              <div className="absolute top-1/4 left-0 w-full h-px bg-black/10" />
              <div className="absolute top-3/4 left-0 w-full h-px bg-black/10" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-black/20" />
              {/* Center contact pad */}
              <div className="absolute inset-[20%] rounded-sm bg-amber-300/50 border border-amber-600/30" />
            </div>
            {/* NFC icon */}
            {!isSm && (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/30" fill="none">
                <path d="M7 12a5 5 0 005 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M4 12a8 8 0 008 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M10 12a2.5 2.5 0 002.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </>
        )}
      </div>

      {/* Bottom Row */}
      <div className={`flex flex-col relative z-10 ${isSm ? 'gap-0 mt-1' : 'gap-1 mt-6'}`}>
        {card.last4 ? (
          <div className={`text-white/60 font-mono flex items-center gap-2 ${isSm ? 'text-[10px] mb-1' : 'text-sm mb-1'} ${isAccount ? 'tracking-wider' : 'tracking-[0.2em]'}`}>
            {!isAccount && (
              <><span>****</span> {!isSm && <span>****</span>} {!isSm && <span>****</span>}</>
            )}
            {isAccount && <span>Acct ••••</span>}
            <span className="text-white/90">{card.last4}</span>
          </div>
        ) : (
          <div className={isSm ? 'h-3' : 'h-6'}></div>
        )}
        <div className="flex justify-between items-end">
          <div>
            {!isSm && <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Current Balance</p>}
            <p className={`text-white font-bold drop-shadow-md tracking-tight ${isSm ? 'text-lg' : isLg ? 'text-3xl' : 'text-2xl'}`}>
              ${Number(card.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={`${isSm ? 'text-[10px]' : 'text-xs'} font-medium text-white/60`}>USD</span>
            </p>
          </div>
          {/* Payment Network Logo */}
          {networkBadge && (
            <div className="flex items-end pb-0.5 opacity-90 drop-shadow-sm">
              {networkBadge}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
