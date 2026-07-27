import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// import { GoogleGenerativeAI } from "https://esm.sh/@google/genai@0.1.2";

// Utility for CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileName, teamId, result = 'win' } = await req.json();

    if (!fileName) {
      throw new Error('fileName is required');
    }

    // Initialize Supabase Admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing video: ${fileName}`);

    // Step 1: Download video stream from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('match_videos')
      .download(fileName);

    if (downloadError) {
      throw new Error(`Failed to download video: ${downloadError.message}`);
    }
    
    // We get a Blob from download().
    const fileStream = fileData.stream();
    const fileSize = fileData.size;

    // Step 2: Fetch teams from database for Gemini Context
    const { data: teams, error: teamsError } = await supabaseClient
      .from('teams')
      .select('id, name, paste_text');

    if (teamsError) throw new Error('Failed to fetch teams');
    
    let ownTeamContext = "Unknown";
    if (teamId) {
      const t = teams.find((t: any) => t.id === teamId);
      if (t) ownTeamContext = `${t.name}: \n${t.paste_text}`;
    } else {
       ownTeamContext = "All possible teams:\n" + teams.map((t: any) => `${t.name}: \n${t.paste_text}`).join("\n\n");
    }

    // Step 3: Analyze with Gemini (Mocked or real implementation)
    console.log("Analyzing with Gemini...");
    let opponentPokemon: any[] = [];
    let title = "VGC Match: Epic Battle";
    
    try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (GEMINI_API_KEY) {
            // Note: Uploading video to Gemini in Deno requires chunked HTTP requests or full body.
            // Placeholder for Gemini logic
            console.log("Gemini API key found, proceeding with analysis...");
            opponentPokemon = [{ name: 'pikachu', id: 'pikachu' }, { name: 'charizard', id: 'charizard' }];
            title = `VGC Match: ${teamId ? 'My Team' : 'Ranked'} vs Pikachu & Charizard`;
        }
    } catch (e) {
        console.error("Gemini Error:", e);
    }

    // Step 4: Upload to YouTube (Streaming)
    console.log("Uploading to YouTube...");
    let youtubeUrl = "";
    
    const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID');
    const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    const YOUTUBE_REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

    if (YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && YOUTUBE_REFRESH_TOKEN) {
        // Pseudo-code for YouTube Resumable Upload
        console.log("YouTube credentials found. Uploading...");
        youtubeUrl = "https://youtube.com/watch?v=placeholder";
    } else {
        console.log("No YouTube credentials found. Skipping upload.");
        // If no youtube upload, we might just store the supabase storage public url
        const { data: publicUrlData } = supabaseClient
          .storage
          .from('match_videos')
          .getPublicUrl(fileName);
        youtubeUrl = publicUrlData.publicUrl;
    }

    // Step 5: Save match to database
    console.log("Saving to database...");
    const { error: dbError } = await supabaseClient.from('matches').insert([
      {
        played_at: new Date().toISOString(),
        opponent_team: opponentPokemon,
        own_team_id: teamId || (teams.length > 0 ? teams[0].id : null),
        result: result,
        video_url: youtubeUrl
      }
    ]);

    if (dbError) throw dbError;

    // Optional: Delete the video from Supabase Storage if it was uploaded to YouTube
    if (youtubeUrl.includes("youtube.com")) {
      await supabaseClient.storage.from('match_videos').remove([fileName]);
    }

    return new Response(JSON.stringify({ success: true, youtubeUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
