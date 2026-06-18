import resend

API_KEY = "re_..."
resend.api_key = API_KEY

params = {
    "from": "onboarding@resend.dev",
    "to": ["your_email@example.com"],
    "subject": "Test from DevRoom",
    "html": "<h1>Test</h1><p>If you see this, Resend API works.</p>"
}

try:
    r = resend.Emails.send(params)
    print(f"OK — {r.get('id')}")
except Exception as e:
    print(f"Error: {e}")
