async function test() {
  const token = process.env.SPORTY_API_TOKEN || "";
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "fr",
    "App-Version": "34639",
    "Authorization": "Bearer " + token,
    "Referer": "https://bet261.mg/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
  };

  for (const epId of [8019, 8020, 8021, 8035]) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/events?eventCategoryIds=${epId}`, { headers });
    const events = await res.json();
    console.log(`=== EntryPoint: ${epId} ===`);
    if (Array.isArray(events) && events.length > 0) {
      const ev = events[0];
      console.log("Keys in event:", Object.keys(ev));
      console.log("eventCategoryId:", ev.eventCategoryId);
      console.log("categoryId:", ev.categoryId);
      console.log("sourceRef:", ev.sourceRef);
    } else {
      console.log("Events response:", JSON.stringify(events).slice(0, 200));
    }
  }
}
test();
