import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingMessage {
  phoneNumber: string;
  contactName?: string;
  messageContent: string;
  timestamp?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming message data
    const messageData: IncomingMessage = await req.json();
    
    console.log('Received webhook message:', messageData);

    if (!messageData.phoneNumber || !messageData.messageContent) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber and messageContent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number (remove spaces, dashes, etc)
    const normalizedPhone = messageData.phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (convError) {
      console.error('Error finding conversation:', convError);
      throw convError;
    }

    // Create new conversation if doesn't exist
    if (!conversation) {
      console.log('Creating new conversation for:', normalizedPhone);
      
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          phone_number: normalizedPhone,
          contact_name: messageData.contactName || normalizedPhone,
          status: 'aberto',
          last_message: messageData.messageContent,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }

      conversation = newConv;
    } else {
      // Update existing conversation
      console.log('Updating existing conversation:', conversation.id);
      
      const { error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: messageData.messageContent,
          last_message_at: new Date().toISOString(),
          unread_count: (conversation.unread_count || 0) + 1,
          status: 'aberto', // Reopen if closed
          contact_name: messageData.contactName || conversation.contact_name,
        })
        .eq('id', conversation.id);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
        throw updateError;
      }
    }

    // Insert message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        content: messageData.messageContent,
        is_from_customer: true,
        // created_at usa o default do banco (now())
      });

    if (messageError) {
      console.error('Error inserting message:', messageError);
      throw messageError;
    }

    console.log('Message processed successfully for conversation:', conversation.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        conversationId: conversation.id,
        message: 'Message received and processed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
