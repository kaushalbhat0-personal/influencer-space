"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PaymentMethod } from "@/lib/billing";
import { CreditCard, Plus, Trash2, Star, Smartphone, Building2 } from "lucide-react";

interface PaymentMethodManagerProps {
  methods: PaymentMethod[];
  loading?: boolean;
  error?: string;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

const BRAND_ICONS: Record<string, React.ElementType> = {
  visa: CreditCard,
  mastercard: CreditCard,
  rupay: CreditCard,
  upi: Smartphone,
  netbanking: Building2,
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Building2,
};

export function PaymentMethodManager({
  methods, loading, error,
  onAdd, onRemove, onSetDefault,
}: PaymentMethodManagerProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const handleCancelRemove = useCallback(() => setConfirmRemove(null), []);

  const handleConfirmRemove = useCallback((id: string) => {
    onRemove?.(id);
    setConfirmRemove(null);
  }, [onRemove]);

  useEffect(() => {
    if (confirmRemove && confirmRef.current) {
      const firstButton = confirmRef.current.querySelector("button");
      firstButton?.focus();
    }
  }, [confirmRemove]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmRemove) {
        setConfirmRemove(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmRemove]);

  if (methods.length === 0 && !loading && !error) {
    return (
      <DashboardWidget title="Billing payment methods" icon={CreditCard} empty emptyMessage="No billing payment methods added yet." actions={
        <Button size="sm" onClick={onAdd} aria-label="Add payment method">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Method
        </Button>
      }><></></DashboardWidget>
    );
  }

  return (
    <DashboardWidget
      title="Billing payment methods"
      icon={CreditCard}
      description={`${methods.length} method${methods.length !== 1 ? "s" : ""}`}
      loading={loading}
      error={error}
      actions={
        <Button size="sm" onClick={onAdd} aria-label="Add payment method">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      }
    >
      <div className="space-y-2" role="list" aria-label="Saved payment methods">
        {methods.map((method) => {
          const Icon = BRAND_ICONS[method.brand.toLowerCase()] ?? TYPE_ICONS[method.type] ?? CreditCard;
          const isConfirming = confirmRemove === method.id;

          return (
            <div
              key={method.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
              role="listitem"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--surface-hover)] p-2 border border-[var(--border)]">
                  <Icon className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} &bull;&bull;&bull;&bull; {method.last4}
                    </p>
                    {method.isDefault && <Badge variant="cyan" size="sm">Default</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {method.type}
                    {method.expMonth && method.expYear && ` \u00b7 Exp ${String(method.expMonth).padStart(2, "0")}/${method.expYear}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!method.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => onSetDefault?.(method.id)} aria-label={`Set ${method.brand} ending in ${method.last4} as default`}>
                    <Star className="h-3.5 w-3.5 text-[var(--text-muted)] hover:text-amber-400" />
                  </Button>
                )}
                {isConfirming ? (
                  <div ref={confirmRef} className="flex items-center gap-1" role="dialog" aria-label={`Confirm remove ${method.brand} ending in ${method.last4}`}>
                    <Button size="sm" variant="destructive" onClick={() => handleConfirmRemove(method.id)} aria-label="Confirm remove payment method">
                      Remove
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelRemove} aria-label="Cancel removal">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(method.id)} aria-label={`Remove ${method.brand} ending in ${method.last4}`}>
                    <Trash2 className="h-3.5 w-3.5 text-[var(--text-muted)] hover:text-red-400" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardWidget>
  );
}
