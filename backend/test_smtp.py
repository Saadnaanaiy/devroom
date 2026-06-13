import smtplib, ssl

for pw in [
    'bskLNpdVeL67lnD',
    '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'
]:
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP('smtp-relay.brevo.com', 587) as server:
            server.starttls(context=context)
            server.login('saadcisia@gmail.com', pw)
            print(f'SA Key "{pw[:20]}..." -> LOGIN OK')
    except Exception as e:
        print(f'Trying "{pw[:20]}..." -> FAIL: {e}')
