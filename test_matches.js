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

  for (const epId of [8035, 8037, 8019]) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${epId}/matches`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      const firstRound = data.rounds?.[0];
      console.log(`=== Matches for EP ${epId} ===`);
      console.log("Round eventCategoryId:", firstRound?.eventCategoryId);
      if (firstRound?.matches?.[0]) {
        console.log("Match 0 keys:", Object.keys(firstRound.matches[0]));
        console.log("Match 0 eventCategoryId:", firstRound.matches[0].eventCategoryId);
        console.log("Match 0 categoryId:", firstRound.matches[0].categoryId);
      }
    } else {
      console.log(`EP ${epId} -> Status ${res.status}`);
    }
  }
}
test();
