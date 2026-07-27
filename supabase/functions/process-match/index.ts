import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getYoutubeAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error('Failed to get YouTube access token');
  return data.access_token;
}

async function uploadToYoutube(accessToken: string, videoUrl: string, title: string) {
  const metadata = {
    snippet: {
      title: title,
      description: 'Automated Pokemon Match Upload',
      categoryId: '20',
    },
    status: {
      privacyStatus: 'unlisted',
    }
  };

  const headRes = await fetch(videoUrl, { method: 'HEAD' });
  const contentLength = headRes.headers.get('content-length') || '0';

  const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': contentLength,
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const errText = await initResponse.text();
    throw new Error(`Failed to init YouTube upload session: ${errText}`);
  }
  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

  const videoStreamRes = await fetch(videoUrl);
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: videoStreamRes.body,
    // @ts-ignore
    duplex: 'half'
  });

  const result = await uploadResponse.json();
  if (!result.id) throw new Error(`Failed to finish YouTube upload: ${JSON.stringify(result)}`);
  
  return `https://youtube.com/watch?v=${result.id}`;
}

async function uploadToGemini(apiKey: string, videoUrl: string, mimeType: string = 'video/mp4') {
  const headRes = await fetch(videoUrl, { method: 'HEAD' });
  const contentLength = headRes.headers.get('content-length') || '0';

  const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': contentLength,
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { displayName: 'Pokemon Match' } })
  });
  
  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    const errorText = await initRes.text();
    throw new Error(`Failed to init Gemini resumable upload: ${errorText}`);
  }

  const videoStreamRes = await fetch(videoUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
    },
    body: videoStreamRes.body,
    // @ts-ignore
    duplex: 'half'
  });

  const result = await uploadRes.json();
  if (!result.file || !result.file.uri) {
    throw new Error(`Failed to upload stream to Gemini: ${JSON.stringify(result)}`);
  }
  return result.file;
}

async function waitForGeminiFileActive(apiKey: string, fileName: string) {
  let state = "PROCESSING";
  while (state === "PROCESSING") {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    const data = await res.json();
    state = data.state;
    if (state === "FAILED") throw new Error("Gemini file processing failed");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileName, teamId: manualTeamId, result: manualResult = 'win' } = await req.json();
    if (!fileName) throw new Error('fileName is required');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing video: ${fileName}`);

    const { data: signedUrlData, error: signError } = await supabaseClient.storage.from('match_videos').createSignedUrl(fileName, 300);
    if (signError || !signedUrlData) throw new Error(`Failed to sign URL: ${signError?.message}`);
    const videoUrl = signedUrlData.signedUrl;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const YOUTUBE_CLIENT_ID = Deno.env.get('YOUTUBE_CLIENT_ID');
    const YOUTUBE_CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    const YOUTUBE_REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

    const { data: teams } = await supabaseClient.from('teams').select('id, name, paste_text');
    let teamListString = "";
    if (teams && teams.length > 0) {
      teamListString = teams.map((t: any) => `Team ID: ${t.id}\nTeam Name: ${t.name}\nPokemon:\n${t.paste_text}`).join("\n\n---\n\n");
    }

    let opponentPokemon: any[] = [];
    let detectedTeamId = manualTeamId;
    let detectedResult = manualResult;
    let detectedTeamName = "Unknown Team";
    let youtubeTitle = "Error"; 

    if (GEMINI_API_KEY) {
      console.log("Starting Gemini Analysis (Streaming)...");
      try {
        const geminiFile = await uploadToGemini(GEMINI_API_KEY, videoUrl);
        await waitForGeminiFileActive(GEMINI_API_KEY, geminiFile.name);
        
        const analyzeRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { fileData: { mimeType: geminiFile.mimeType, fileUri: geminiFile.uri } },
                { text: `This is a Pokemon VGC screen recording.
                IMPORTANT: When identifying Pokemon, ensure they are legal and available in the latest regulation of Pokemon Champions. Do not hallucinate older or unavailable Pokemon.
                
                Task 1: Look at the Team Preview screen to identify the opponent's 6 Pokemon. (Usually the opponent's team is shown at the top or on the right).
                Task 2: Look at the other 6 Pokemon. Compare them to this list of my teams:
                ${teamListString}
                Identify which of my teams I am using.
                Task 3: Watch the end of the video. Did I win, lose, or tie?
                
                Output MUST be valid JSON matching this exact schema:
                {
                  "opponent_pokemon": [
                    { "name": "string (lowercase, hyphenated like urshifu-rapid-strike)", "id": "string (same as name)" }
                  ],
                  "own_team_id": "string (the UUID of my team that matched, or null)",
                  "own_team_name": "string (the name of my team that matched, or Unknown)",
                  "result": "string (must be exactly 'win', 'loss', or 'tie')"
                }`
                }
              ]
            }],
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });
        
        const aiResponse = await analyzeRes.json();
        console.log("Raw Gemini API Response:", JSON.stringify(aiResponse));
        
        if (aiResponse.candidates && aiResponse.candidates.length > 0) {
          const rawText = aiResponse.candidates[0].content?.parts[0]?.text;
          if (rawText) {
            try {
              const parsed = JSON.parse(rawText.trim());
              console.log("Gemini successfully parsed output.");
              if (parsed.opponent_pokemon) opponentPokemon = parsed.opponent_pokemon;
              if (parsed.own_team_id) detectedTeamId = parsed.own_team_id;
              if (parsed.own_team_name) detectedTeamName = parsed.own_team_name;
              if (parsed.result && ['win', 'loss', 'tie'].includes(parsed.result.toLowerCase())) {
                detectedResult = parsed.result.toLowerCase();
              }
              
              const resultLabel = detectedResult.charAt(0).toUpperCase() + detectedResult.slice(1);
              youtubeTitle = `[${resultLabel}] ${detectedTeamName}`;

            } catch(e) {
              console.error("Failed to parse Gemini JSON:", rawText);
            }
          } else {
            console.error("Gemini returned candidates but no text content (possibly blocked).");
          }
        } else {
           console.error("Gemini returned no candidates!");
        }
      } catch (e) {
        console.error("Gemini Error:", e);
      }
    }

    let youtubeUrl = "";
    if (YOUTUBE_CLIENT_ID && YOUTUBE_CLIENT_SECRET && YOUTUBE_REFRESH_TOKEN) {
      console.log(`Starting YouTube Upload (Streaming) with title: ${youtubeTitle}`);
      try {
        const token = await getYoutubeAccessToken(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN);
        youtubeUrl = await uploadToYoutube(token, videoUrl, youtubeTitle);
        console.log("YouTube Upload Complete:", youtubeUrl);
      } catch(e) {
        console.error("YouTube Upload Error:", e);
      }
    } else {
        youtubeUrl = videoUrl;
    }

    if (!detectedTeamId && teams && teams.length > 0) {
      detectedTeamId = teams[0].id;
    }

    console.log("Saving to database...");
    const { error: dbError } = await supabaseClient.from('matches').insert([{
      played_at: new Date().toISOString(),
      opponent_team: opponentPokemon,
      own_team_id: detectedTeamId,
      result: detectedResult,
      video_url: youtubeUrl
    }]);

    if (dbError) throw dbError;

    await supabaseClient.storage.from('match_videos').remove([fileName]);

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
