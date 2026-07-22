import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface ExtractedTask {
  title: string;
  category: string;
  description: string;
  budget: number;
  location?: string;
  postal_code?: string;
  deadline?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, user_id } = await req.json();

    // Parse the text using Qwen AI or return mock data
    const extractedData: ExtractedTask = parseTaskFromText(text);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

function parseTaskFromText(text: string): ExtractedTask {
  // Simple parsing logic (can be enhanced with Qwen AI)
  // Extract budget (number followed by $)
  const budgetMatch = text.match(/\$?(\d+)/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : 100;

  // Extract category (common errand categories)
  const categories = [
    "cleaning-household",
    "home-maintenance",
    "food-beverage",
    "shopping-errands",
    "delivery-moving",
    "pet-care",
  ];
  let category = "shopping-errands";
  for (const cat of categories) {
    if (text.toLowerCase().includes(cat.replace("-", " "))) {
      category = cat;
      break;
    }
  }

  return {
    title: text.substring(0, 100),
    category,
    description: text,
    budget,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
