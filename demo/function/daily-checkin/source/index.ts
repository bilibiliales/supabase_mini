// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: corsHeaders
      }
    );
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader!
        }
      }
    }
  );

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  if (
    profile.last_checkin_date === today
  ) {
    return Response.json({
      ok: false,
      message: "今天已经签到过了"
    }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { error } = await admin
    .from("profiles")
    .update({
      exp: profile.exp + 10,
      last_checkin_date: today,
      updated_at: new Date()
    })
    .eq("id", user.id);

  if (error) {
    return Response.json(
      { error: error.message },
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return Response.json({
    ok: true,
    message: "签到成功",
    addExp: 10,
    exp: profile.exp + 10,
    lastCheckinDate: today
  }, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
