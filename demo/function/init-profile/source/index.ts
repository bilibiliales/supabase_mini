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

    const body = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 检查资料是否已存在
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return Response.json(
        {
          ok: false,
          message: "资料已经存在"
        },
        {
          headers: corsHeaders
        }
      );
    }

    const nickname =
      typeof body.nickname === "string" &&
      body.nickname.trim()
        ? body.nickname.trim()
        : "用户";

    const { data, error } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        nickname,
        avatar: "",
        signature: "这个人很懒，什么都没写",
        role: "user",
        exp: 0
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        {
          error: error.message
        },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    return Response.json(
      {
        ok: true,
        message: "资料初始化成功",
        profile: data
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