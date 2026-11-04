import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RCDetails {
  rc_number: string;
  owner_name: string;
  address: string;
  chassis: string;
  engine: string;
  registration_date: string;
  validity_upto: string;
  fuel_type: string;
  vehicle_class: string;
  [key: string]: any;
}

export default function RCTemplateViewer() {
  const [searchParams] = useSearchParams();
  const [rcDetails, setRcDetails] = useState<RCDetails | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(decodeURIComponent(data));
        setRcDetails(decoded);
        
        // Generate QR code for this page URL
        const pageUrl = window.location.href;
        QRCode.toDataURL(pageUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.95,
          margin: 1,
          width: 200,
        }).then(url => {
          setQrCode(url);
        });
      } catch (error) {
}
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading RC Template...</p>
        </div>
      </div>
    );
  }

  if (!rcDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">No RC data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Vehicle Registration Certificate
          </h1>
          <p className="text-gray-600">Indian Union RC Details</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - RC Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Registration Info */}
            <Card className="shadow-lg">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle>Registration Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">RC Number</p>
                  <p className="text-lg font-bold text-gray-900">{rcDetails.rc_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Registration Date</p>
                  <p className="text-lg font-bold text-gray-900">{rcDetails.registration_date}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-600">Validity Upto</p>
                  <p className="text-lg font-bold text-green-600">{rcDetails.validity_upto}</p>
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card className="shadow-lg">
              <CardHeader className="bg-indigo-600 text-white">
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Owner Name</p>
                  <p className="text-lg font-bold text-gray-900">{rcDetails.owner_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Address</p>
                  <p className="text-base text-gray-900 leading-relaxed">{rcDetails.address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card className="shadow-lg">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Vehicle Class</p>
                  <p className="text-base font-bold text-gray-900">{rcDetails.vehicle_class}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Fuel Type</p>
                  <p className="text-base font-bold text-gray-900">{rcDetails.fuel_type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Chassis Number</p>
                  <p className="text-base font-mono text-gray-900">{rcDetails.chassis}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Engine Number</p>
                  <p className="text-base font-mono text-gray-900">{rcDetails.engine}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - QR Code */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-4">
              <CardHeader className="bg-gray-800 text-white">
                <CardTitle className="text-center">Template QR Code</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center">
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img 
                      src={qrCode} 
                      alt="RC Template QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-600 text-center mt-4">
                  Scan this QR code to share the RC template
                </p>
                
                {/* Download Button */}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCode;
                    link.download = `RC-${rcDetails.rc_number}-QR.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Download QR Code
                </button>

                {/* Print Button */}
                <button
                  onClick={() => window.print()}
                  className="mt-2 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Print Template
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>© 2024 FINONEST - Vehicle Registration Certificate Viewer</p>
        </div>
      </div>
    </div>
  );
}

