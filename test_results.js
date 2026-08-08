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
