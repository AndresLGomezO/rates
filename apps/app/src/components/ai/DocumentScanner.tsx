import React, { useState, useRef } from 'react';
import { sendMessage } from '../../services/ai';

export const DocumentScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);
    setError(null);

    // In a real implementation, we would upload the file to GCS and then trigger the processor.
    // For now, we'll simulate the task creation.
    try {
      // 1. Upload file (Mocked)
      console.log('Uploading file:', file.name);

      // 2. Trigger AI Processor via AI Service
      // The spec says we use /v1/tasks for async operations
      // For this prototype, we'll use a specific prompt to simulate OCR if the service supports it
      const response = await sendMessage(
        `I have uploaded a document named ${file.name}. Please simulate extracting fields for a financial account.`,
        'Respond with a JSON-like summary of extracted fields: accountName, type, balance, dueDate.'
      );

      setScanResult(response);
    } catch (err) {
      console.error('Scan Error:', err);
      setError('Failed to process document. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-4xl text-blue-400">
        📄
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">
        Smart Document Scanner
      </h2>
      <p className="mb-8 text-sm text-white/60">
        Upload a statement or bill and our AI will automatically extract the
        details for you.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => void handleFileUpload(e)}
        className="hidden"
        accept="image/*,.pdf"
      />

      {isScanning ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="animate-shimmer h-full w-1/2 bg-blue-500" />
            </div>
          </div>
          <p className="animate-pulse text-sm font-medium text-blue-400">
            Analyzing document with Gemini...
          </p>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-500 active:scale-95"
        >
          Select Document
        </button>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {scanResult && (
        <div className="animate-in fade-in slide-in-from-top-4 mt-8 text-left duration-500">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-white">
                <span className="text-green-400">✅</span> Extracted Data
              </h3>
              <button className="text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300">
                Edit
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/80">
              {scanResult.content}
            </pre>
            <button className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20">
              Create Account from this Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
