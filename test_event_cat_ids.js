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

  const epRes = await fetch("https://hg-event-api-prod.sporty-tech.net/api/eventcategories/entrypoints?fr", { headers });
  const entryPoints = await epRes.json();

  for (const ep of entryPoints) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${ep.id}/matches`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      const firstRound = data.rounds?.[0];
      console.log(`EntryPoint ${ep.id} (${ep.name}) -> eventCategoryId: ${firstRound?.eventCategoryId}`);
    } else {
      // try standard events
      const res2 = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/events?eventCategoryIds=${ep.id}`, { headers });
      if (res2.status === 200) {
        const events = await res2.json();
        console.log(`EntryPoint ${ep.id} (${ep.name}) -> events count: ${events.length}, categoryId: ${events[0]?.categoryId}`);
      }
    }
  }
}
test();
