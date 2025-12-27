# Security Policy

## Supported Versions

We release security updates for the latest version of Zero Board.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:
- **GitHub Security Advisories**: Use the "Report a vulnerability" button on the repository's Security tab
- **Email**: [Add your security email here if you have one]

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We will acknowledge receipt within 48 hours and provide a more detailed response within 7 days.

## Security Best Practices

### For Users

- Always change the default admin password on first login
- Use a strong `SECRET_KEY` in production (generate with: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`)
- Enable HTTPS and set `SESSION_COOKIE_SECURE=true` in production
- Restrict `CORS_ORIGINS` to only your frontend domain(s)
- Keep the application and dependencies updated
- Use strong database passwords
- Only expose necessary ports

## Security Updates

Security updates will be released as patches. We recommend:
- Subscribing to repository notifications
- Regularly checking for updates
- Testing updates in a staging environment before production

