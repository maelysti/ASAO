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
  console.log("Status:", res.status);
  if (res.status === 200) {
    const data = await res.json();
    console.log("Round data keys:", Object.keys(data));
    console.log("eventCategoryId in round:", data.eventCategoryId);
    console.log("roundNumber:", data.roundNumber);
    console.log("matches length:", data.matches?.length);
    if (data.matches?.[0]) {
      console.log("Sample match keys:", Object.keys(data.matches[0]));
      console.log("Sample match eventCategoryId:", data.matches[0].eventCategoryId, "categoryId:", data.matches[0].categoryId);
      console.log("Sample match sourceRef:", data.matches[0].sourceRef);
    }
  } else {
    console.log("Text:", await res.text());
  }
}
test();
