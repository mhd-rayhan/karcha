import { useState } from 'preact/hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { passwordPrompt, useFileImport } from '@/hooks/use-file-import';

function getBankPasswordTip(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes('hdfc')) {
    return 'HDFC Bank: Often your Customer ID (NetBanking User ID) or Date of Birth in DDMMYYYY format.';
  }
  if (f.includes('kotak')) {
    return 'Kotak Mahindra: Often your CRN (Customer Relationship Number) or Date of Birth (DDMMYYYY).';
  }
  if (f.includes('icici')) {
    return 'ICICI Bank: Usually lowercase first 4 letters of name + DDMM of birth, or 12-digit account number.';
  }
  if (f.includes('sbi')) {
    return 'SBI: Usually your 11-digit account number, or Date of Birth (DDMM) + last 5 digits of mobile.';
  }
  if (f.includes('axis')) {
    return 'Axis Bank: Usually your Customer ID, or first 4 letters of name + last 4 digits of card.';
  }
  return 'Common bank formats: Customer ID, PAN in uppercase, or Date of Birth in DDMMYYYY format.';
}

export function PasswordDialog() {
  const prompt = passwordPrompt.value;
  const { submitPassword, cancelPassword } = useFileImport();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  if (!prompt) return null;

  const bankTip = getBankPasswordTip(prompt.filename);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!password) return;
    submitPassword(password, remember);
    setPassword('');
  };

  return (
    <Modal
      isOpen={Boolean(prompt)}
      onClose={cancelPassword}
      title="Enter Statement Password"
      description={`This document is password protected: ${prompt.filename}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {prompt.isRetry && (
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            Incorrect password. Please verify and try again.
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/90">
          <span className="font-semibold text-primary mr-1.5">💡 Bank Hint:</span>
          {bankTip}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stmt-password" className="text-xs font-medium text-foreground">
            Password
          </label>
          <Input
            id="stmt-password"
            type="password"
            autoComplete="off"
            placeholder="Enter password..."
            value={password}
            onInput={(e: any) => setPassword(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="remember-batch"
            type="checkbox"
            checked={remember}
            onChange={(e: any) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
          />
          <label
            htmlFor="remember-batch"
            className="text-xs text-muted-foreground select-none cursor-pointer"
          >
            Use this password for remaining files in this batch (held in memory only)
          </label>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" size="sm" onClick={cancelPassword}>
            Cancel File
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Unlock & Parse
          </Button>
        </div>
      </form>
    </Modal>
  );
}
