/**
 * Script to subscribe your Supabase Edge Function to YouTube's Webhook (PubSubHubbub).
 * Run this script locally using: node scripts/subscribe_webhook.js
 * Note: You must deploy your Supabase Edge Function first!
 */

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

const CALLBACK_URL = "https://zkpxsfstiwdbnnsohvsb.supabase.co/functions/v1/youtube-webhook";

// TODO: Replace with your YouTube Channel ID
const CHANNEL_ID = "UCRLEma9YFsDKwX3FR8OG8PQ";
const TOPIC_URL = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

async function subscribe() {
  console.log(`Subscribing to YouTube feed for channel: ${CHANNEL_ID}`);
  console.log(`Callback URL: ${CALLBACK_URL}`);
  
  const body = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.topic": TOPIC_URL,
    "hub.callback": CALLBACK_URL,
    "hub.verify": "async"
  });

  try {
    const response = await fetch(HUB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (response.status === 202) {
      console.log("✅ Subscription requested successfully!");
      console.log("YouTube will now verify the webhook in the background.");
      console.log("Note: This subscription expires in ~5-7 days. You will need to run this script again to renew it.");
    } else {
      console.error(`❌ Failed to subscribe. Status: ${response.status}`);
      const text = await response.text();
      console.error(text);
    }
  } catch (err) {
    console.error("Error subscribing:", err);
  }
}

subscribe();
