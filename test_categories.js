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

  const epRes = await fetch("https://hg-event-api-prod.sporty-tech.net/api/entrypoints", { headers });
  if (epRes.status !== 200) {
    console.log("EP status:", epRes.status, await epRes.text());
    return;
  }
  const entryPoints = await epRes.json();
  console.log("EntryPoints found:", entryPoints.length);

  for (const ep of entryPoints) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/events?eventCategoryIds=${ep.id}`, { headers });
    if (res.status === 200) {
      const events = await res.json();
      if (Array.isArray(events) && events.length > 0) {
        const ev = events[0];
        console.log(`EP ID: ${ep.id} (${ep.name}) -> match categoryId: ${ev.categoryId}, categories:`, JSON.stringify(ev.categories));
      } else {
        console.log(`EP ID: ${ep.id} (${ep.name}) -> 0 events`);
      }
    } else {
      console.log(`EP ID: ${ep.id} (${ep.name}) -> Status ${res.status}`);
    }
  }
}
test();
