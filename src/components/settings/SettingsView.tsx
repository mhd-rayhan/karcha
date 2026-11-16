import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTheme } from '@/hooks/use-theme';
import { generateRedactedDiagnostics } from '@/lib/diagnostics';
import { downloadFile } from '@/lib/export';
import { clearAllData, settings, statements, txns } from '@/store';
import { saveToDB } from '@/store/persistence';

export function SettingsView() {
  const { theme, setTheme } = useTheme();

  const handleTogglePersistence = async (enabled: boolean) => {
    const nextPersistence = enabled ? 'device' : 'session';
    settings.value = { ...settings.value, persistence: nextPersistence };
    if (enabled) {
      await saveToDB();
    }
  };

  const handleExportDiagnostics = () => {
    if (statements.value.length === 0) return;
    const current = statements.value[0];
    const diag = generateRedactedDiagnostics(current, txns.value);
    downloadFile(diag, `kharcha_diagnostics_${current.id}.json`, 'application/json');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings & Privacy</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage local storage, theme appearance, and data isolation
        </p>
      </div>

      {/* 1. Theme Preferences */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Appearance</CardTitle>
          <p className="text-xs text-muted-foreground">Select color theme for the interface</p>
        </CardHeader>
        <CardContent>
          <div className="flex rounded-md border border-input p-1 bg-muted/30 max-w-xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                theme === 'system'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              System
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Data Storage & Persistence */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Device Persistence
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Kharcha defaults to in-memory session only. Enable below if you want data remembered on
            this machine.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-medium text-foreground block">
                Keep data on this device (IndexedDB)
              </span>
              <span className="text-[11px] text-muted-foreground block">
                When disabled, all statement data is immediately lost as soon as you close or reload
                this browser tab.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.value.persistence === 'device'}
              onChange={(e: any) => handleTogglePersistence(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-ring cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-destructive block">
                Clear All Local Data
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Wipes all imported statements, accounts, transactions, and learned rules from this
                device.
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to completely erase all statement data?')) {
                  clearAllData();
                }
              }}
            >
              Erase Everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Diagnostics for Bank Support */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Support & Diagnostics
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Share layout metadata when requesting support for a new bank or reporting parser issues.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our diagnostics export strictly redacts all PII. It contains only layout fingerprints,
            issue codes, and line counts. Amounts, narrations, and dates are completely excluded.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDiagnostics}
            disabled={statements.value.length === 0}
          >
            Download Redacted Diagnostics (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* 4. Privacy Guarantee */}
      <Card className="border-border bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Verifiable Privacy Guarantee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">
            &ldquo;Statements are read in this browser tab and are not uploaded. You can confirm in
            your browser&apos;s network tab.&rdquo;
          </p>
          <p>
            Kharcha makes zero cross-origin network requests. It runs entirely inside standard Web
            Workers and client-side memory using pure TypeScript parsers.
          </p>
        </CardContent>
      </Card>

      {/* 5. Open Source Repository */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Open Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Kharcha is 100% free, MIT-licensed open-source software. You can inspect the source
            code, contribute bank templates, or report issues on GitHub:
          </p>
          <a
            href="https://github.com/mhd-rayhan/karcha"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            github.com/mhd-rayhan/karcha
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
