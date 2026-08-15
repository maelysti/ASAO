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

  // Test results with 8035 vs 159866
  for (const id of [8035, 159866, 8037, 159864, 8019]) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${id}/results?skip=0&take=5`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`Results for ID ${id} -> rounds count:`, data.length, "round 0 eventCategoryId:", data[0]?.eventCategoryId, "round 0 matches:", data[0]?.matches?.length);
    } else {
      console.log(`Results for ID ${id} -> status: ${res.status}`);
    }
  }

  // Test ranking with 8035 vs 159866
  for (const id of [8035, 159866, 8037, 159864, 8019]) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/instantleagues/${id}/ranking`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`Ranking for ID ${id} -> teams count:`, data.teams?.length);
    } else {
      console.log(`Ranking for ID ${id} -> status: ${res.status}`);
    }
  }

  // Test round fetch with 8037 (159864) vs 8035 (159866)
  for (const catId of [159864, 159866, 8019]) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/instantleagues/round/20?eventCategoryId=${catId}&getNext=false`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`Round 20 for eventCategoryId=${catId} -> matches count:`, data.round?.matches?.length);
    } else {
      console.log(`Round 20 for eventCategoryId=${catId} -> status: ${res.status}`);
    }
  }
}
test();
