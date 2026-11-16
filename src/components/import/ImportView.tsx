import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { importQueue, isProcessing, useFileImport } from '@/hooks/use-file-import';
import { useState } from 'preact/hooks';

export function FileDropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const { queueFiles } = useFileImport();

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      queueFiles(files);
    }
  };

  const handleFileInput = (e: any) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      queueFiles(files);
      e.target.value = '';
    }
  };

  // Load sample demo statement so users can explore immediately
  const handleLoadSample = () => {
    const sampleCsv = `Date,Description,Withdrawal,Deposit,Balance
15/01/2024,SALARY CR / TECH CORP PVT LTD,,125000.00,145200.50
16/01/2024,UPI/401612345678/SWIGGY/swiggy@icici,489.00,,144711.50
17/01/2024,POS 458921 DMART SUPERMARKET MUMBAI,3450.00,,141261.50
18/01/2024,UPI/401899887766/UBER INDIA/uber@axis,340.00,,140921.50
20/01/2024,BILLDESK TATA POWER ELECTRICITY,2150.00,,138771.50
22/01/2024,NETFLIX STREAMING SUBSCRIPTION,649.00,,138122.50
25/01/2024,UPI/402511223344/BLINKIT GROCERY/blink@kotak,650.00,,137472.50
28/01/2024,FASTAG RECHARGE IHMCL TOLL,1000.00,,136472.50
30/01/2024,CRED CLUB CARD PAYMENT,24500.00,,111972.50
31/01/2024,BANK CHARGES SMS ALERT FEE,17.70,,111954.80`;

    const sampleFile = new File([sampleCsv], 'HDFC_Sample_Statement_Jan2024.csv', {
      type: 'text/csv',
    });
    queueFiles([sampleFile]);
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-accent bg-accent/5 scale-[1.01]'
            : 'border-border bg-card/50 hover:border-muted-foreground/30 hover:bg-card'
        }`}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.csv,.txt,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground mb-4 shadow-xs">
          <svg
            className="h-7 w-7 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Drop your bank or card statements here
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
          Supports PDF (including password-protected), CSV, TXT, and XLS formats from HDFC, ICICI,
          SBI, Axis, Kotak, and more.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="md">
            Choose Files
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={(e: Event) => {
              e.stopPropagation();
              handleLoadSample();
            }}
          >
            Load Sample Data
          </Button>
        </div>

        <div className="mt-6 flex items-center space-x-2 text-[11px] text-muted-foreground">
          <svg
            className="h-3.5 w-3.5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>
            Strictly client-side: Statements are parsed locally in this browser tab. Zero data
            uploaded.
          </span>
        </div>
      </div>

      {/* Queue & Progress */}
      {importQueue.value.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h4 className="text-xs font-semibold text-foreground">
              Import Queue ({importQueue.value.length})
            </h4>
            {isProcessing.value && (
              <span className="text-[11px] text-muted-foreground animate-pulse">
                Processing statements...
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
            {importQueue.value.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center space-x-2 truncate max-w-md">
                  <span className="font-mono text-muted-foreground">
                    [{item.file.name.split('.').pop()?.toUpperCase()}]
                  </span>
                  <span className="truncate text-foreground font-medium">{item.file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.status === 'pending' && (
                    <span className="text-muted-foreground">Pending</span>
                  )}
                  {item.status === 'extracting' && (
                    <span className="text-accent animate-pulse">Extracting text...</span>
                  )}
                  {item.status === 'parsing' && (
                    <span className="text-blue-500 animate-pulse">Analyzing rows...</span>
                  )}
                  {item.status === 'done' && (
                    <span className="text-emerald-500 font-medium">Completed ✓</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-destructive font-medium" title={item.error}>
                      Failed: {item.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function ImportView() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Analyze Bank Statements
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Get instantaneous verification, category breakdown, monthly trends, and expense
          intelligence. Completely private, offline-first.
        </p>

        {/* Supported Banks & Formats Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground font-medium">Supported:</span>
          {['HDFC Bank', 'Kotak Mahindra', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map(
            (b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground border border-border/60"
              >
                {b}
              </span>
            ),
          )}
          <span className="text-muted-foreground/60">•</span>
          {['.PDF', '.XLS', '.CSV', '.TXT'].map((ext) => (
            <span
              key={ext}
              className="inline-flex items-center rounded-md bg-muted font-mono px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      <FileDropZone />

      {/* Feature cards below dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            ✓
          </div>
          <h4 className="text-sm font-medium text-foreground">Tie-Out Reconciliation</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every transaction mathematically cross-verified against running balance and
            opening-closing figures in integer paise.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            ⚡
          </div>
          <h4 className="text-sm font-medium text-foreground">India-Aware Pipeline</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deep parsing for UPI VPA handles, IMPS, NEFT, GST charges, fastag tolls, and popular
            Indian merchants.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            🔒
          </div>
          <h4 className="text-sm font-medium text-foreground">Zero Cloud Storage</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Runs exclusively in your browser. Raw PDF files and passwords are never transmitted or
            stored on any server.
          </p>
        </div>
      </div>
    </div>
  );
}
