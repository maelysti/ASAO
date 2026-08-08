async function test() {
  const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy91cG4iOiIxNDg5Mjk2IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIrMjYxMzg2MTc5MzIwIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLXN0YXRlIjoiTG9naW5WYWxpZGF0ZWQiLCJodHRwczovL2hvbm9yZWdhbWluZy5uZXQvYXV0aGVudGljYXRpb24tc2NvcGUiOiJDdXN0b21lciIsImp0aSI6ImZhYTk1OTE1LWY5YmEtND30LWFkMGItZTUwMDhlZmRjOGFlIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLW11c3QtY2hhbmdlLXBhc3N3b3JkIjoiRmFsc2UiLCJleHAiOjE3ODYyMTUwMDAsImlzcyI6Imh0dHBzOi8vaG9ub3JlLWdhbWluZy5uZXQiLCJhdWQiOiJob25vcmUtZ2FtaW5nLm5ldCJ9.HBLvL6BoS0WP5I7kTxIFutsXkwEp-wsvze56jeDc4J_ZjO_9ykPdGf8ItgQ9hrLs0ti_WdI_KU982pRd9OTlRas-Xk8AX8ekx6VcapN7rYYX7GFPkQi3HEPO4GobSJi23gup5Og5qgFlmlooT3cVq1VU5hcaJhOIaaqvLYr0Xux76mBEwgFLo2uhKoHcp6yIEtmpXI5l3FqT1h8enjZrxy2_A10dtUsNyEOb7yxTBJZyWMklkJJ6UMB720VcUmDBc0JSMhWB6u_6soC9b8YD861Fcdv-sXSlVRP9xR6wUomeO6r7PAjmKIkRMbb4B1iNCmN5S8WL3D-dAYMHwhpMCg";
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
