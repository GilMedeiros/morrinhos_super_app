import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating admin user...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if admin already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUser?.users?.some(u => u.email === 'admin@sistema.com');

    if (adminExists) {
      console.log('Admin user already exists');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin user already exists',
          credentials: {
            email: 'admin@sistema.com',
            password: 'Admin@123'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@sistema.com',
      password: 'Admin@123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrador Geral'
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }

    console.log('User created:', userData.user.id);

    // Assign admin_geral role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin_geral'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw roleError;
    }

    console.log('Admin role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        credentials: {
          email: 'admin@sistema.com',
          password: 'Admin@123'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-admin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});