import { X, Check, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const FREE_FEATURES = [
  'Download clips as MP4',
  'High-quality downloads',
  'No watermarks',
  'Unlimited usage',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Download clips as GIF',
  'Add AI-generated subtitles',
  'Customize subtitle styles',
  'Word-level timing control',
  'All future updates',
];

export default function UpgradeModal({
  isOpen,
  onClose,
  userEmail,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const handleUpgrade = async () => {
    // Open Dodo payment link with email prefilled
    const paymentUrl = userEmail
      ? `https://dodo.pe/lifetime?email=${encodeURIComponent(userEmail)}`
      : 'https://dodo.pe/lifetime';

    await window.electron.shell.openExternal(paymentUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl mx-4 animate-slide-up">
        <Card className="bg-background border-border overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-8 text-center border-b border-border">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Unlock Premium Features
            </div>
            <h2 className="text-3xl font-bold mb-2">
              Upgrade to Premium
            </h2>
            <p className="text-muted-foreground">
              One-time payment. Lifetime access. No subscriptions.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="p-8 grid md:grid-cols-2 gap-6">
            {/* Free tier */}
            <div className="rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-4">
                $0 <span className="text-sm font-normal text-muted-foreground">forever</span>
              </div>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-6" disabled>
                Current Plan
              </Button>
            </div>

            {/* Premium tier */}
            <div className="rounded-xl border-2 border-primary p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                RECOMMENDED
              </div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                Premium
                <Zap className="w-4 h-4 text-yellow-500" />
              </h3>
              <div className="text-3xl font-bold mb-4">
                $29 <span className="text-sm font-normal text-muted-foreground">lifetime</span>
              </div>
              <ul className="space-y-3">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" onClick={handleUpgrade}>
                Upgrade Now
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              Secure payment powered by Dodo Payments. Cancel anytime with full refund within 7 days.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
