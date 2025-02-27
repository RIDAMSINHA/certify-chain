
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Web3Storage } from 'https://esm.sh/web3.storage@4.5.5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const web3StorageClient = new Web3Storage({ token: Deno.env.get('WEB3_STORAGE_TOKEN') ?? '' });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metadata, issuerAddress } = await req.json();

    if (!metadata || !issuerAddress) {
      throw new Error('Missing required fields');
    }

    // Prepare metadata file for IPFS
    const metadataBlob = new Blob(
      [JSON.stringify(metadata)],
      { type: 'application/json' }
    );
    const metadataFile = new File([metadataBlob], 'metadata.json');

    // Upload to IPFS via Web3.Storage
    const cid = await web3StorageClient.put([metadataFile]);
    const ipfsUri = `ipfs://${cid}/metadata.json`;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Create metadata record in Supabase
    const { data, error } = await supabaseClient
      .from('certificates')
      .insert({
        issuer_id: issuerAddress,
        metadata_uri: ipfsUri,
        title: metadata.title,
        description: metadata.description,
        recipient_address: metadata.recipientAddress,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { ...data, metadataUri: ipfsUri }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
