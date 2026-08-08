async function test() {
  const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy91cG4iOiIxNDg5Mjk2IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIrMjYxMzg2MTc5MzIwIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLXN0YXRlIjoiTG9naW5WYWxpZGF0ZWQiLCJodHRwczovL2hvbm9yZWdhbWluZy5uZXQvYXV0aGVudGljYXRpb24tc2NvcGUiOiJDdXN0b21lciIsImp0aSI6ImM2YzdjYjVjLWQ0NWQtNDUxNC05NDA2LTk5NjBmYWU0NTk1NCIsImh0dHBzOi8vaG9ub3JlZ2FtaW5nLm5ldC9jdXN0b21lci1tdXN0LWNoYW5nZS1wYXNzd29yZCI6IkZhbHNlIiwiZXhwIjoxNzg2MjEzNzk2LCJpc3MiOiJodHRwczovL2hvbm9yZS1nYW1pbmcubmV0IiwiYXVkIjoiaG9ub3JlLWdhbWluZy5uZXQifQ.MjeoUYMSmIkNPjxIes5gy2M4rlMkefqA5SAkIa0aEfKMhh-9GqeIgN7ahBFFgiiGysxNBDbK9fRBnzIF9xxKVn6xrxR3YnrzH9Sd_uBH-qO_0pRM-7SzJnwd2lgrIjXF_-eiDZvIZdPMiSO8VI6ezwnMQ0OWj4RTADPnE8j9-rpFPbRTy4JlUO5yyJgSzKk-wycf7aK6vS5fKDH8nhg1fggmvjw-S-UYEtCWRd4TwXe-_f1VPDq563GhCqZLjyISUb9hlVWzr0_rLi6yx-YV55NAR5dqZbtCCRJjh9NS0CRoKjN4NuAg4qs5eb7VjMQGrAPhkx5RIJyRHQcY_ACccA";
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
