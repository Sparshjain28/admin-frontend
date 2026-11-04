import React from 'react';
import Barcode from 'react-barcode';

interface CardData {
  userId: string;
  name: string;
  position: string;
  company: string;
  mobile: string;
  address: string;
  photo: string | null;
}

const CARD_WIDTH = 450;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (2.125 / 3.375));

export const CardFront = ({ cardData, backgroundImage }: { cardData: CardData; backgroundImage?: string }) => {
  const bgImage = backgroundImage ? `url('${backgroundImage}')` : `url('/front-design.png')`;
  const barcodeValue = `ID: ${cardData.userId} | Name: ${cardData.name}`;

  return (
    <div
      id="card-front"
      className="relative mx-auto overflow-hidden rounded-lg shadow-sm"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#FFFFFF',
        border: '2px solid #0033CC',
        backgroundImage: bgImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 w-full h-full flex px-5 pt-5 pb-3">
        <div className="flex-1 flex justify-between items-end h-full">

          {/* Left Side — Name, Position, ID */}
          <div className="flex-1 flex flex-col justify-end pr-2 h-full">
            <div className="mb-1">
              <h2
                className="text-lg font-bold text-[#0056CC] leading-tight max-w-[200px] uppercase tracking-wide"
                style={{ wordBreak: 'break-word' }}
              >
                {cardData.name}
              </h2>
            </div>
            <div className="text-[11px] space-y-0.5 font-medium text-gray-800">
              <div className="flex">
                <span className="w-16 font-bold text-gray-900">Position</span>
                <span className="mr-2">:</span>
                <span>{cardData.position}</span>
              </div>
              <div className="flex">
                <span className="w-16 font-bold text-gray-900">ID No</span>
                <span className="mr-2">:</span>
                <span>{cardData.userId}</span>
              </div>
            </div>
          </div>

          {/* Right Side — Photo + Barcode */}
          <div className="flex flex-col items-center justify-end flex-shrink-0" style={{ width: 110 }}>
            {/* Passport Photo */}
            <div
              className="relative flex items-end justify-center bg-white"
              style={{ width: 90, height: 100, border: '1.5px solid #d1d5db', borderRadius: 4, overflow: 'hidden' }}
            >
              {cardData.photo ? (
                <img
                  src={cardData.photo}
                  alt="Employee"
                  className="w-full h-full object-cover object-top"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                  <span className="text-[9px] font-semibold text-gray-400">Photo</span>
                </div>
              )}
            </div>

            {/* Barcode */}
            <div className="bg-white flex flex-col items-center mt-1" style={{ overflow: 'hidden', height: 32, width: 110 }}>
              <div style={{ transform: 'scale(0.30)', transformOrigin: 'top center', display: 'inline-block', whiteSpace: 'nowrap' }}>
                <Barcode
                  value={barcodeValue}
                  format="CODE128"
                  width={1}
                  height={80}
                  displayValue={false}
                  margin={4}
                  background="#ffffff"
                />
              </div>
            </div>
            <p className="text-[7px] font-medium text-gray-900 text-center w-full bg-white leading-tight">
              {cardData.userId}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export const CardBack = ({ cardData, backgroundImage }: { cardData: CardData; backgroundImage?: string }) => {
  const bgImage = backgroundImage ? `url('${backgroundImage}')` : `url('/back-design.png')`;

  return (
    <div
      id="card-back"
      className="relative mx-auto overflow-hidden rounded-lg shadow-sm"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#0056CC',
        border: '2px solid #0033CC',
        backgroundImage: bgImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 w-full h-full flex flex-col p-4 text-white pr-24">
        <div className="flex-1 flex flex-col justify-start space-y-2 mt-2">
          <div>
            <h3 className="text-[14px] font-normal mb-1 tracking-wide">Term and Condition</h3>
            <p className="text-[9px] leading-snug opacity-95">
              This card is the property of Finonest.<br />
              To whom it must be returned upon request, or if found. The use of<br />
              this card is governed by Finonest terms and conditions.
            </p>
          </div>
          <p className="text-[9px] leading-snug opacity-95 pt-1">
            If found please return it to the address mentioned below.
          </p>
          <div className="pt-2">
            <p className="font-bold text-[9px] mb-0.5">
              Finonest India Pvt. Ltd.
            </p>
            <p className="text-[9px] leading-snug opacity-95">
              Finonest House, 3rd Floor, BL Tower 1, Mahaveer Nagar, Tonk Road, Besides Jaipur Hospital, Jaipur, Rajasthan 302018
            </p>
          </div>
        </div>

        <div className="mt-auto mb-1">
          <h3 className="text-[13px] font-normal mb-1.5 tracking-wide">Contact</h3>
          <div className="flex items-center gap-6 text-[9px]">
            <p className="font-medium">Mo. 905-777-8-333</p>
            <p className="font-medium">www.finonest.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
