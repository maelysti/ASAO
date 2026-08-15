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

  const ids = [8035, 8065, 8056, 8060, 8036, 8037, 8042, 8043, 8044];
  for (const id of ids) {
    const res = await fetch(`https://hg-event-api-prod.sporty-tech.net/api/eventcategories/${id}/details`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      console.log(`ID ${id}:`, JSON.stringify(data).slice(0, 300));
    } else {
      console.log(`ID ${id} -> status ${res.status}`);
    }
  }
}
test();
