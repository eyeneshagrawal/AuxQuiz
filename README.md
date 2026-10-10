# AuxQuiz

## Environment variables (Vercel -> Project Settings -> Environment Variables)

| Name | Required | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | yes | quiz generation |
| `CLOUDINARY_URL` | yes | `cloudinary://<api_key>:<api_secret>@bhdjyxvn` (copy from Cloudinary dashboard) |
| `GROQ_MODEL`, `FIREBASE_API_KEY` | no | optional overrides |

## Upload history (Cloudinary)
- PDFs are uploaded straight from the browser to Cloudinary using a signed request from `POST /api/upload-sign` (the API secret never reaches the browser).
- Files are stored at `auxquiz/<firebase-uid>/<timestamp>_<name>.pdf`; `GET /api/history` lists only the logged-in user's files.
- In Cloudinary: Settings -> Security -> enable **"PDF and ZIP files delivery"**, otherwise the Open links return 401.
