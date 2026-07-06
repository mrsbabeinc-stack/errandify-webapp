import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from auth header (mock for now)
    const userId = authHeader.split(" ")[1] || "1";

    // Mock notifications
    const notifications = [
      {
        id: 1,
        user_id: userId,
        type: "bid_placed",
        title: "New Bid Received",
        message: "Someone bid on your errand",
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: userId,
        type: "bid_accepted",
        title: "Bid Accepted",
        message: "Your bid was accepted",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        data: notifications,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
