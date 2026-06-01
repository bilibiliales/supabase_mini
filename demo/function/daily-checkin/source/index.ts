// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {

  const authHeader = req.headers.get("Authorization");

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
      { status: 401 }
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
      { status: 400 }
    );
  }

  return Response.json({
    ok: true,
    message: "签到成功",
    addExp: 10,
    exp: profile.exp + 10,
    lastCheckinDate: today
  });

});