# Security Decisions

1. **bcrypt for password hashing** - slow, salted hashing makes brute-force and rainbow-table attacks costly. Cost factor 12.
2. **JWT in an httpOnly cookie** - JavaScript cannot read the cookie, so an XSS attack cannot steal the token. SameSite=Strict reduces CSRF risk.
3. **Parameterized queries** - user input is never joined into SQL strings, which prevents SQL injection.
4. **Input validation** - email format and password strength (8-72 chars, letter + number) are checked on the server. 72 is bcrypt's input limit.
5. **Account lockout** - 5 failed attempts lock the account for 15 minutes to slow down brute-force attacks.
6. **Generic login error** - "Invalid email or password" is shown for both wrong email and wrong password, so attackers cannot find which emails exist. A dummy bcrypt compare keeps response time similar.
7. **helmet** - adds security headers such as Content-Security-Policy.
8. **Short token life** - JWT expires in 1 hour.

## Rejected / revised approach
- **Rejected: storing the JWT in localStorage.** Any XSS script can read localStorage and steal the token. I switched to an httpOnly cookie.
- **Rejected: SHA-256 for passwords.** It is too fast, which makes brute-forcing easy. I used bcrypt instead.

## Known limitations
- Lockout is per account, so someone could deliberately lock another user out. Per-IP rate limiting would help.
- No HTTPS locally (the `secure` cookie flag turns on with NODE_ENV=production).
- No email verification, password reset or 2FA (bonus features, not done).
