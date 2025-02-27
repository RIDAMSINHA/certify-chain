
export interface Certificate {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'issued' | 'revoked';
  created_at: string;
  token_id: number;
  recipient_address: string;
  issuer_id: string;
  metadata_uri: string;
}
