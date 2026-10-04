# Secure Login System

A basic authentication system built for the GDG-USAR Tech Team task (Cybersecurity, PS 1).

## Features
- Registration and login
- Passwords hashed with bcrypt (cost 12)
- JWT authentication stored in an httpOnly, SameSite=Strict cookie
- Input validation (email format, password strength)
- Protected route (`/dashboard`) and API (`/api/me`)
- Account lockout after 5 failed logins (15 minutes)
- Parameterized SQL queries (SQLite) and security headers (helmet)

## Run
1. Install Node.js (LTS)
2. `npm install`
3. `npm start`
4. Open http://localhost:3000

## Test checklist
| Test | Expected | Result |
|---|---|---|
| Register with valid details | Account created | |
| Register same email again | 409 error | |
| Invalid email / weak password | 400 error | |
| Login with correct details | Dashboard opens | |
| Open /dashboard while logged out | Redirect to login | |
| 5 wrong passwords | Account locked 15 min | |
| SQL injection `' OR 1=1 --` as email | Login fails | |
| Check users.db | Only bcrypt hashes, no plain text | |

(Fill the Result column after you test.)
