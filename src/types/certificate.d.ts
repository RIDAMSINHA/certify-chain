
export interface Certificate {
  blockchain_cert_id: string;
  title: string;
  description: string;
  status: 'pending' | 'issued' | 'revoked';
  created_at: string;
  token_id: number;
  recipient_address: string;
  issuer_id: string;
  metadata_uri: string;
  public_url?: string;
}
