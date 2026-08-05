import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    const clientAuth = req.headers.authorization || (req.query.token ? `Bearer ${req.query.token}` : "");
    const defaultToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy91cG4iOiIxNDg5Mjk2IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIrMjYxMzg2MTc5MzIwIiwiaHR0cHM6Ly9ob25vcmVnYW1pbmcubmV0L2N1c3RvbWVyLXN0YXRlIjoiTG9naW5WYWxpZGF0ZWQiLCJodHRwczovL2hvbm9yZWdhbWluZy5uZXQvYXV0aGVudGljYXRpb24tc2NvcGUiOiJDdXN0b21lciIsImp0aSI6IjczOGM2N2I3LTRiYzItNGRhMy05MjMxLTRkZmFiNmVlMDFiZSIsImh0dHBzOi8vaG9ub3JlZ2FtaW5nLm5ldC9jdXN0b21lci1tdXN0LWNoYW5nZS1wYXNzd29yZCI6IkZhbHNlIiwiZXhwIjoxNzg1OTE2NTYxLCJpc3MiOiJodHRwczovL2hvbm9yZS1nYW1pbmcubmV0IiwiYXVkIjoiaG9ub3JlLWdhbWluZy5uZXQifQ.Fyz2vOgAXjeRL4lUYn-VyvJqX27564-XK4ogZ4hvqOEABckya7-U_TtyeL17jKlnpyhC-a-fKpbLCJnns3c4PQRVNTITbvmq35n7a8VNpmmrXXOC9fN-Hj6CLqTPR2TAmh8yibUjfeuhR80wPJeaK_w5igi42i6xiokx8bvktGyNIN2O-Xj6LEJKJgOfbZN1y_QLM5DHVwe2zT1kvita2ZXj_KVNQTi-FMM_oMHGqYz9jC4xv1Cp6fyL1CCk-RNclC52EHX5Wwkolga3k-WjnqK0AI5TCZw_R9qsaasLqJXpk1jWPK36oDkuxlUBkcfvZu930go9YipouPum6klC0Q";
    const authToken = clientAuth || `Bearer ${defaultToken}`;

    const headers: Record<string, string> = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "fr",
      "App-Version": "34378",
      "Authorization": authToken,
      "Referer": "https://bet261.mg/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0"
    };

    const response = await fetch(targetUrl, { headers });
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch from Sporty API", message: err.message });
  }
}
