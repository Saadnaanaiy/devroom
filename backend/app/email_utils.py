import resend
from backend.config import Config

resend.api_key = Config.RESEND_API_KEY


def send_email(to_email, subject, html_body, text_body=None, recipient_name=None):
    if not Config.RESEND_API_KEY:
        print(f"[DEV] Email not sent (no Resend API key). Would send to {to_email}:")
        print(f"[DEV] Subject: {subject}")
        print(f"[DEV] Body: {html_body[:200]}...")
        return False, "No Resend API key configured"

    actual_recipient = Config.DEV_EMAIL_OVERRIDE or to_email
    if Config.DEV_EMAIL_OVERRIDE:
        print(f"[DEV] Redirecting email from {to_email} to {Config.DEV_EMAIL_OVERRIDE}")

    params = {
        "from": Config.MAIL_DEFAULT_SENDER,
        "to": actual_recipient,
        "subject": subject,
        "html": html_body,
    }
    if text_body:
        params["text"] = text_body

    try:
        r = resend.Emails.send(params)
        print(f"[EMAIL] Sent to {to_email} — {r.get('id')}")
        return True, None
    except Exception as e:
        print(f"[!] Resend API error: {e}")
        return False, str(e)


def send_verification_email(to_email, username, token):
    link = f"{Config.FRONTEND_URL}/verify-email/{token}"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:40px 20px">
<tr><td align="center">

<!-- Main card -->
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 24px rgba(0,0,0,0.06)">

<!-- Gradient header strip -->
<tr><td style="background:linear-gradient(135deg,#1d1d1f 0%,#2d2d2f 40%,#3a3a3c 100%);padding:36px 40px 28px;text-align:center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
<tr><td style="background:rgba(255,255,255,0.12);border-radius:16px;width:56px;height:56px;text-align:center;vertical-align:middle;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">
<span style="color:#ffffff;font-size:26px;font-weight:700;line-height:56px;letter-spacing:-1px">{'>_'}</span>
</td></tr>
</table>
<h1 style="margin:16px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.3">Verify your email</h1>
<p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.5">You're almost there!</p>
</td></tr>

<tr><td style="padding:36px 40px 8px;text-align:center">
<p style="margin:0;font-size:15px;color:#1d1d1f;line-height:1.7">Hey <strong style="font-weight:700">{username}</strong>,<br>thanks for joining DevRoom. Click the button below to verify your email address and unlock your account.</p>
</td></tr>

<tr><td style="padding:28px 40px;text-align:center">
<a href="{link}" style="display:inline-block;background:#1d1d1f;color:#ffffff;padding:15px 40px;border-radius:9999px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(0,0,0,0.15);transition:all 0.2s ease">Verify Email</a>
</td></tr>

<tr><td style="padding:0 40px 32px;text-align:center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#f5f5f7;border-radius:14px;padding:16px 20px">
<tr><td style="text-align:center">
<p style="margin:0 0 6px;font-size:12px;color:#86868b;font-weight:500;letter-spacing:0.02em;text-transform:uppercase">Or copy this link</p>
<p style="margin:0;font-size:11px;color:#6b7280;word-break:break-all;font-family:SF Mono,Menlo,monospace;line-height:1.6">{link}</p>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 40px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e5e5e7;padding-top:24px;text-align:center">
<p style="margin:0;font-size:13px;color:#86868b;line-height:1.6">If you didn't create an account, you can safely ignore this email.<br>No changes have been made to your account.</p>
</td></tr></table>
</td></tr>

</table>

<!-- Footer -->
<table role="presentation" width="100%" style="max-width:480px;padding:24px 0 0;text-align:center">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
<tr><td style="background:linear-gradient(135deg,#1d1d1f,#2d2d2f);border-radius:8px;width:20px;height:20px;text-align:center;vertical-align:middle;padding-right:8px">
<span style="color:#ffffff;font-size:10px;font-weight:700;line-height:20px;letter-spacing:-0.5px">{'>_'}</span>
</td>
<td style="padding-left:6px">
<p style="margin:0;font-size:12px;color:#aeaeb2">DevRoom &mdash; Developer collaboration platform</p>
</td>
</tr>
</table>
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>"""
    text = f"Verify your email: {link}"
    return send_email(to_email, "Verify your DevRoom account", html, text, recipient_name=username)


def send_password_reset_email(to_email, username, token):
    link = f"{Config.FRONTEND_URL}/reset-password/{token}"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:40px 20px">
<tr><td align="center">

<!-- Main card -->
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 24px rgba(0,0,0,0.06)">

<!-- Gradient header strip -->
<tr><td style="background:linear-gradient(135deg,#1d1d1f 0%,#2d2d2f 40%,#3a3a3c 100%);padding:36px 40px 28px;text-align:center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
<tr><td style="background:rgba(255,255,255,0.12);border-radius:16px;width:56px;height:56px;text-align:center;vertical-align:middle;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">
<span style="color:#ffffff;font-size:26px;font-weight:700;line-height:56px;letter-spacing:-1px">{'>_'}</span>
</td></tr>
</table>
<h1 style="margin:16px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.3">Reset your password</h1>
<p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.5">We've got you covered</p>
</td></tr>

<tr><td style="padding:36px 40px 8px;text-align:center">
<p style="margin:0;font-size:15px;color:#1d1d1f;line-height:1.7">Hey <strong style="font-weight:700">{username}</strong>,<br>we received a request to reset your password. Click the button below to set a new one.</p>
</td></tr>

<tr><td style="padding:28px 40px;text-align:center">
<a href="{link}" style="display:inline-block;background:#1d1d1f;color:#ffffff;padding:15px 40px;border-radius:9999px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(0,0,0,0.15);transition:all 0.2s ease">Reset Password</a>
</td></tr>

<tr><td style="padding:0 40px 32px;text-align:center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#f5f5f7;border-radius:14px;padding:16px 20px">
<tr><td style="text-align:center">
<p style="margin:0 0 6px;font-size:12px;color:#86868b;font-weight:500;letter-spacing:0.02em;text-transform:uppercase">Or copy this link</p>
<p style="margin:0;font-size:11px;color:#6b7280;word-break:break-all;font-family:SF Mono,Menlo,monospace;line-height:1.6">{link}</p>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 40px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e5e5e7;padding-top:24px;text-align:center">
<p style="margin:0;font-size:13px;color:#86868b;line-height:1.6">If you didn't request a password reset, you can safely ignore this email.<br>Your account remains secure.</p>
</td></tr></table>
</td></tr>

</table>

<!-- Footer -->
<table role="presentation" width="100%" style="max-width:480px;padding:24px 0 0;text-align:center">
<tr><td>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
<tr><td style="background:linear-gradient(135deg,#1d1d1f,#2d2d2f);border-radius:8px;width:20px;height:20px;text-align:center;vertical-align:middle;padding-right:8px">
<span style="color:#ffffff;font-size:10px;font-weight:700;line-height:20px;letter-spacing:-0.5px">{'>_'}</span>
</td>
<td style="padding-left:6px">
<p style="margin:0;font-size:12px;color:#aeaeb2">DevRoom &mdash; Developer collaboration platform</p>
</td>
</tr>
</table>
</td></tr>
</table>

</td></tr>
</table>
</body>
</html>"""
    text = f"Reset your password: {link}"
    return send_email(to_email, "Reset your DevRoom password", html, text, recipient_name=username)
