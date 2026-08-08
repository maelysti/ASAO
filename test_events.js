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
