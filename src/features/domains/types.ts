export interface DomainData {
  defaultSubdomain: string;
  customDomain: string | null;
  sslStatus: "active" | "pending" | "inactive" | null;
  verified: boolean;
  dnsInstructions: DNSRecord[];
}

export interface DNSRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  ttl: number;
}

export interface DomainFormInput {
  domain: string;
}
