import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messageData } = await req.json();

    console.log('Processing webhook for message:', messageData);

    // Get webhook settings
    const { data: webhookSettings, error: settingsError } = await supabaseClient
      .from('webhook_settings')
      .select('*')
      .eq('enabled', true)
      .single();

    if (settingsError || !webhookSettings) {
      console.log('No webhook configured or disabled');
      return new Response(
        JSON.stringify({ message: 'No webhook configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send to webhook
    console.log('Sending to webhook:', webhookSettings.webhook_url);
    
    const webhookResponse = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...messageData,
        timestamp: new Date().toISOString(),
        source: 'conectawa_chat'
      }),
    });

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResponse.status, webhookResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhookStatus: webhookResponse.status,
        message: 'Message sent to webhook' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
