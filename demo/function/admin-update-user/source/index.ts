// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      { headers: corsHeaders }
    );
  }

  try {

    const authHeader =
      req.headers.get("Authorization");

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
        {
          status: 401,
          headers: corsHeaders
        }
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
        {
          status: 403,
          headers: corsHeaders
        }
      );
    }

    const body = await req.json();

    const targetId = body.targetId;

    if (!targetId) {
      return Response.json(
        { error: "targetId required" },
        {
          status: 400,
          headers: corsHeaders
        }
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

    updateData.updated_at =
      new Date().toISOString();

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    return Response.json(
      {
        ok: true,
        user: data
      },
      {
        headers: corsHeaders
      }
    );

  } catch (e) {

    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : String(e)
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );

  }

});