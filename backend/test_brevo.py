import json, urllib.request, urllib.error

API_KEY = "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"
payload = {
    "sender": {"email": "saadcisia@gmail.com"},
    "to": [{"email": "saadcisia@gmail.com"}],
    "subject": "Test from DevRoom",
    "htmlContent": "<h1>Test</h1><p>If you see this, Brevo API works.</p>"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    "https://api.brevo.com/v3/smtp/email",
    data=data,
    headers={"api-key": API_KEY, "Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        print(f"OK — {resp.status}: {resp.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
except urllib.error.URLError as e:
    print(f"Connection error: {e.reason}")
