
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, email, name, streak, league, achievement } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!RESEND_API_KEY) {
       console.error("RESEND_API_KEY is missing");
       // Return success to avoid app crash, but log error
       return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "Update from TaskHero";
    let html = "";

    switch (type) {
        case 'streak_risk':
            subject = "🔥 Don't lose your streak!";
            html = `
                <h1>Hey ${name || 'Hero'}!</h1>
                <p>You're about to lose your <strong>${streak} day streak</strong>!</p>
                <p>Log in now and complete a task to keep the fire alive.</p>
                <a href="https://taskhero.app">Open TaskHero</a>
            `;
            break;
        case 'achievement':
            subject = `🏆 You unlocked: ${achievement}!`;
            html = `
                <h1>Congratulations ${name || 'Hero'}!</h1>
                <p>You just unlocked the <strong>${achievement}</strong> achievement.</p>
                <p>Keep up the great work!</p>
                <a href="https://taskhero.app">View Profile</a>
            `;
            break;
        case 'league_update':
            subject = "Weekly League Update 📊";
            html = `
                <h1>The results are in!</h1>
                <p>The weekly league has ended. Log in to see if you were promoted!</p>
                <a href="https://taskhero.app">Check Leaderboard</a>
            `;
            break;
        default:
            subject = "Notification from TaskHero";
            html = `<p>You have a new notification from TaskHero.</p>`;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TaskHero <onboarding@resend.dev>", // Default Resend testing email
        to: [email],
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
