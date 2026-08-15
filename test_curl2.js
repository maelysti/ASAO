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

  const url = "https://hg-event-api-prod.sporty-tech.net/api/instantleagues/round/20?eventCategoryId=159864&getNext=false";
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log("Round obj keys:", Object.keys(data.round));
  console.log("eventCategoryId:", data.round.eventCategoryId);
  console.log("roundNumber:", data.round.roundNumber);
  console.log("seasonNumber:", data.round.seasonNumber, "seasonId:", data.round.seasonId, "seasonName:", data.round.seasonName);
  if (data.round.matches?.[0]) {
    console.log("Match 0:", JSON.stringify(data.round.matches[0], null, 2));
  }
}
test();
