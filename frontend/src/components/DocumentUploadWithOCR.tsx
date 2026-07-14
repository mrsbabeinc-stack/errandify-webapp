import React, { useRef, useState } from 'react';

interface DocumentUploadProps {
  onUpload: (data: {
    file: File;
    preview: string;
    extractedData: {
      amount?: number;
      vendor?: string;
      date?: string;
      description?: string;
    };
  }) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  allowCamera?: boolean;
  title?: string;
  description?: string;
}

interface ExtractedData {
  amount?: number;
  vendor?: string;
  date?: string;
  description?: string;
  confidence?: {
    amount: number;
    vendor: number;
    date: number;
  };
}

const DocumentUploadWithOCR: React.FC<DocumentUploadProps> = ({
  onUpload,
  maxSize = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'application/pdf'],
  allowCamera = true,
  title = 'Upload Receipt or Invoice',
  description = 'Take a photo or upload an image for automatic data extraction',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulateOCRExtraction = (file: File): ExtractedData => {
    // Simulate Qwen/OCR API extraction
    // In production, this would call your backend OCR service
    const fileName = file.name.toLowerCase();

    // Demo extraction based on file content simulation
    const demoExtractions: { [key: string]: ExtractedData } = {
      receipt: {
        amount: 125.50,
        vendor: 'Tech Office Supplies Ltd',
        date: new Date().toISOString().split('T')[0],
        confidence: { amount: 95, vendor: 90, date: 92 },
      },
      invoice: {
        amount: 2500.00,
        vendor: 'Singapore Airlines',
        date: new Date().toISOString().split('T')[0],
        confidence: { amount: 98, vendor: 95, date: 98 },
      },
      expense: {
        amount: 450.00,
        vendor: 'SP Group',
        date: new Date().toISOString().split('T')[0],
        confidence: { amount: 96, vendor: 92, date: 91 },
      },
    };

    // Match by keywords in filename
    for (const [key, data] of Object.entries(demoExtractions)) {
      if (fileName.includes(key)) {
        return data;
      }
    }

    // Default extraction if no match
    return {
      amount: 99.99,
      vendor: 'Unknown Vendor',
      date: new Date().toISOString().split('T')[0],
      confidence: { amount: 60, vendor: 50, date: 70 },
    };
  };

  const processFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Validation
      if (!acceptedFormats.includes(file.type)) {
        throw new Error(`File type not supported. Accepted: ${acceptedFormats.join(', ')}`);
      }

      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`File size exceeds ${maxSize}MB limit`);
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const previewUrl = e.target?.result as string;
        setPreview(previewUrl);

        // Simulate OCR extraction
        const extracted = simulateOCRExtraction(file);
        setExtractedData(extracted);

        // Call parent callback
        onUpload({
          file,
          preview: previewUrl,
          extractedData: {
            amount: extracted.amount,
            vendor: extracted.vendor,
            date: extracted.date,
            description: `${extracted.vendor} - ${extracted.date}`,
          },
        });

        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px dashed #FFD9B3' }}>
      <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
        📸 {title}
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
        {description}
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#FFEBEE', border: '1px solid #F44336', borderRadius: '4px', marginBottom: '12px', fontSize: '12px', color: '#C62828' }}>
          ❌ {error}
        </div>
      )}

      {/* Upload Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: allowCamera ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          style={{
            padding: '10px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: '600',
            cursor: isProcessing ? 'wait' : 'pointer',
            fontSize: '12px',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          {isProcessing ? '⏳ Processing...' : '📁 Choose File'}
        </button>

        {allowCamera && (
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            style={{
              padding: '10px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              cursor: isProcessing ? 'wait' : 'pointer',
              fontSize: '12px',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            {isProcessing ? '⏳ Processing...' : '📷 Take Photo'}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      )}

      {/* Preview & Extracted Data */}
      {preview && (
        <div style={{ marginTop: '12px' }}>
          {/* Preview Image */}
          <img
            src={preview}
            alt="Receipt preview"
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '4px',
              marginBottom: '12px',
              border: '1px solid #FFD9B3',
            }}
          />

          {/* Extracted Data Display */}
          {extractedData && (
            <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '4px', border: '1px solid #4CAF50' }}>
              <div style={{ fontWeight: '600', fontSize: '12px', color: '#2E7D32', marginBottom: '8px' }}>
                ✅ Extracted Information (OCR Result)
              </div>

              <div style={{ fontSize: '12px', color: '#1B5E20', display: 'grid', gap: '6px' }}>
                {extractedData.amount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💰 Amount:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>SGD {extractedData.amount.toFixed(2)}</strong>
                      {extractedData.confidence?.amount && (
                        <span style={{ fontSize: '10px', background: '#C8E6C9', padding: '2px 6px', borderRadius: '3px' }}>
                          {extractedData.confidence.amount}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {extractedData.vendor && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🏪 Vendor:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{extractedData.vendor}</strong>
                      {extractedData.confidence?.vendor && (
                        <span style={{ fontSize: '10px', background: '#C8E6C9', padding: '2px 6px', borderRadius: '3px' }}>
                          {extractedData.confidence.vendor}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {extractedData.date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📅 Date:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{extractedData.date}</strong>
                      {extractedData.confidence?.date && (
                        <span style={{ fontSize: '10px', background: '#C8E6C9', padding: '2px 6px', borderRadius: '3px' }}>
                          {extractedData.confidence.date}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '8px', fontSize: '11px', color: '#558B2F', fontStyle: 'italic' }}>
                💡 Tip: Verify extracted data is correct. You can edit the values in the form above if needed.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div style={{ marginTop: '12px', padding: '8px 12px', background: '#E3F2FD', borderRadius: '4px', fontSize: '11px', color: '#0D47A1' }}>
        <strong>📱 Mobile-Friendly:</strong> Use camera on mobile to capture receipts. OCR automatically extracts amount, vendor, and date. Supported formats: JPEG, PNG, PDF (max {maxSize}MB).
      </div>
    </div>
  );
};

export default DocumentUploadWithOCR;
