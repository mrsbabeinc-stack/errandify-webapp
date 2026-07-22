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
    const { voucherId, user_id } = await req.json();

    // Mock voucher data
    const vouchers: Record<string, any> = {
      "starbucks-10": { name: "Starbucks $10", discount: 10, cost: 500 },
      "kfc-voucher": { name: "KFC Voucher", discount: 15, cost: 450 },
      "cathay-cineplex": { name: "Cathay Cineplex", discount: 20, cost: 350 },
      "changi-lounge": { name: "Changi Lounge", discount: 50, cost: 1000 },
    };

    const voucher = vouchers[voucherId];
    if (!voucher) {
      return new Response(
        JSON.stringify({ error: "Voucher not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mock redemption
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully redeemed ${voucher.name}!`,
        data: {
          voucher_id: voucherId,
          user_id: user_id || "1",
          discount_value: voucher.discount,
          redeemed_at: new Date().toISOString(),
          status: "completed",
        },
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
