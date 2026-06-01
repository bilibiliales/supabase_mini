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

  const body = await req.json();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      nickname: body.nickname,
      avatar: "",
      signature: "这个人很懒，什么都没写",
      role: "user",
      exp: 0
    });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return Response.json({
    ok: true
  });

});