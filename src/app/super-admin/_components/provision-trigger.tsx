"use client";

import { useState } from "react";
import { ProvisionModal } from "./provision-modal";

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  createdAt: Date;
  _count: { users: number; products: number };
}

export function ProvisionTrigger({ tenants }: { tenants: TenantRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="admin-btn-cyan shrink-0 px-4 py-2.5 text-sm"
      >
        Provision Tenant
      </button>
      <ProvisionModal open={open} onClose={() => setOpen(false)} tenants={tenants} />
    </>
  );
}
