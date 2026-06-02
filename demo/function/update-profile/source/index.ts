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
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const body = await req.json();

    const updateData: Record<string, unknown> = {};

    if (body.nickname !== undefined) {
      updateData.nickname = String(body.nickname);
    }

    if (body.avatar !== undefined) {
      updateData.avatar = String(body.avatar);
    }

    if (body.signature !== undefined) {
      updateData.signature = String(body.signature);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: "No fields to update" },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    return Response.json(
      {
        ok: true,
        profile: data,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal Server Error",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});