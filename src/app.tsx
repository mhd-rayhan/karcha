import { useEffect } from 'preact/hooks';
import { ImportView } from '@/components/import/ImportView';
import { PasswordDialog } from '@/components/import/PasswordDialog';
import { OverviewView } from '@/components/overview/OverviewView';
import { RecurringView } from '@/components/recurring/RecurringView';
import { ReviewView } from '@/components/review/ReviewView';
import { SettingsView } from '@/components/settings/SettingsView';
import { TransactionsView } from '@/components/transactions/TransactionsView';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/hooks/use-theme';
import { activeTab, hasUnsavedData, settings, statements } from '@/store';
import { loadFromDB } from '@/store/persistence';

export function App() {
  const { theme, setTheme } = useTheme();

  // Try loading saved state on startup if enabled
  useEffect(() => {
    loadFromDB().then((hasData) => {
      if (hasData && activeTab.value === 'import') {
        activeTab.value = 'overview';
      }
    });
  }, []);

  // Unload warning for session-only data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData.value && settings.value.persistence === 'session') {
        e.preventDefault();
        e.returnValue =
          'You have unsaved statement data in this session. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const hasData = statements.value.length > 0;
  const currentTab = activeTab.value;

  // Count issues across all statements for the review badge
  const totalIssues = statements.value.reduce((acc, s) => acc + s.issues.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <div
            role="button"
            tabIndex={0}
            className="flex items-center space-x-3 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            onClick={() => (activeTab.value = hasData ? 'overview' : 'import')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activeTab.value = hasData ? 'overview' : 'import';
              }
            }}
          >
            <Logo size={28} />
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-sm tracking-tight text-foreground">Kharcha</span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                v1.0
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <NavButton
              label="Import"
              active={currentTab === 'import'}
              onClick={() => (activeTab.value = 'import')}
            />
            <NavButton
              label="Overview"
              active={currentTab === 'overview'}
              disabled={!hasData}
              onClick={() => (activeTab.value = 'overview')}
            />
            <NavButton
              label="Transactions"
              active={currentTab === 'transactions'}
              disabled={!hasData}
              onClick={() => (activeTab.value = 'transactions')}
            />
            <NavButton
              label="Review"
              badge={totalIssues > 0 ? String(totalIssues) : undefined}
              active={currentTab === 'review'}
              disabled={!hasData}
              onClick={() => (activeTab.value = 'review')}
            />
            <NavButton
              label="Intelligence"
              active={currentTab === 'intelligence'}
              disabled={!hasData}
              onClick={() => (activeTab.value = 'intelligence')}
            />
            <NavButton
              label="Settings"
              active={currentTab === 'settings'}
              onClick={() => (activeTab.value = 'settings')}
            />
          </nav>

          {/* Right Status & Theme */}
          <div className="flex items-center space-x-3">
            {/* Storage indicator */}
            <div
              className="hidden sm:flex items-center space-x-1.5 text-[11px] text-muted-foreground select-none"
              title={
                settings.value.persistence === 'device'
                  ? 'Data persists across sessions in IndexedDB'
                  : 'Data is held in RAM only and cleared upon tab close'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  settings.value.persistence === 'device' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-mono">
                {settings.value.persistence === 'device' ? 'Device' : 'Session'}
              </span>
            </div>

            {/* GitHub Repo */}
            <a
              href="https://github.com/mhd-rayhan/karcha"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              title="View Source on GitHub"
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">GitHub Repository</span>
            </a>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'import' && <ImportView />}
        {currentTab === 'overview' && <OverviewView />}
        {currentTab === 'transactions' && <TransactionsView />}
        {currentTab === 'review' && <ReviewView />}
        {currentTab === 'intelligence' && <RecurringView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Password Dialog */}
      <PasswordDialog />

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
        <span>Kharcha • 100% Client-Side Statement Analysis • Zero Data Leaves Your Machine</span>
        <span className="hidden sm:inline">•</span>
        <a
          href="https://github.com/mhd-rayhan/karcha"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-2 transition-colors inline-flex items-center gap-1 font-medium"
        >
          GitHub Repository
        </a>
      </footer>
    </div>
  );
}

function NavButton({
  label,
  active,
  disabled,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors select-none ${
        active
          ? 'bg-secondary text-foreground shadow-2xs font-semibold'
          : disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer'
      }`}
    >
      <span>{label}</span>
      {badge && (
        <span className="ml-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
