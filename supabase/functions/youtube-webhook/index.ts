import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { XMLParser } from 'npm:fast-xml-parser@4.3.2'

serve(async (req) => {
  // 1. Handle Webhook Verification (PubSubHubbub challenge)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const challenge = url.searchParams.get('hub.challenge')
    if (challenge) {
      return new Response(challenge, { status: 200 })
    }
    return new Response("OK", { status: 200 })
  }

  // 2. Handle Incoming POST Request (New Video)
  if (req.method === 'POST') {
    try {
      const textBody = await req.text()
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      })
      const jsonObj = parser.parse(textBody)
      
      const feed = jsonObj.feed
      if (!feed || !feed.entry) {
        return new Response("No entry found", { status: 200 })
      }

      // Handle multiple entries just in case, though it's usually one
      const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry]

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      for (const entry of entries) {
        const title = entry.title
        const videoId = entry['yt:videoId']
        const publishedAt = entry.published
        const videoUrl = entry.link?.['@_href'] || `https://www.youtube.com/watch?v=${videoId}`
        
        // Only process titles with the expected format: [Win] Team Name
        const titleMatch = title.match(/^\[(Win|Loss|Tie)\]\s+(.+)$/i)
        
        if (titleMatch) {
          const resultRaw = titleMatch[1].toLowerCase()
          const teamNameRaw = titleMatch[2].trim()

          console.log(`Processing match: Result=${resultRaw}, Team=${teamNameRaw}, Video=${videoId}`)

          // Note: The user requested to leave own_team_id blank for now
          // they will link it manually later in the UI.

          const { error } = await supabase
            .from('matches')
            .insert([
              {
                played_at: publishedAt,
                result: resultRaw,
                video_url: videoUrl,
                own_team_id: null // Left blank intentionally
              }
            ])

          if (error) {
            console.error('Error inserting match:', error)
          }
        } else {
          console.log(`Title "${title}" did not match the format [Win] Team Name. Skipping.`)
        }
      }

      return new Response("Processed", { status: 200 })

    } catch (error) {
      console.error('Error processing webhook:', error)
      return new Response("Internal Server Error", { status: 500 })
    }
  }

  return new Response("Method not allowed", { status: 405 })
})
