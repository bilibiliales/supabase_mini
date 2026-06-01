// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader
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

  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json();

  const targetId = body.targetId;

  if (!targetId) {
    return Response.json(
      { error: "targetId required" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (body.nickname !== undefined) {
    updateData.nickname = body.nickname;
  }

  if (body.avatar !== undefined) {
    updateData.avatar = body.avatar;
  }

  if (body.signature !== undefined) {
    updateData.signature = body.signature;
  }

  if (body.role !== undefined) {
    updateData.role = body.role;
  }

  if (body.exp !== undefined) {
    updateData.exp = body.exp;
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("profiles")
    .update(updateData)
    .eq("id", targetId)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return Response.json({
    ok: true,
    user: data
  });

});