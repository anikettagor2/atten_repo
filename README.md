# Atocrane - Attendance Management System

A modern attendance management system with AI-powered face recognition built with Next.js, Tailwind CSS, shadcn UI, and Supabase.

## Features

- 🏠 **Home Page** - Project information and features
- 🔐 **Authentication** - Login and Signup with Google OAuth and email/password
- 👨‍🎓 **Student Dashboard** - View scheduled lectures and mark attendance using face recognition
- 👨‍🏫 **Professor Dashboard** - Create lectures, view attendance, and export reports (JSON, CSV, XLS)
- 👨‍💼 **Admin Panel** - System overview and statistics
- 📸 **Face Recognition** - AI-powered attendance marking

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Face Recognition**: Integration ready for face recognition libraries

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository and navigate to the project:
```bash
cd atocrane
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://vwpykobijhbmcilfpcat.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3cHlrb2JpamhibWNpbGZwY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTYzMDQsImV4cCI6MjA3NTQ5MjMwNH0.xslj80NgLHgLLMRniqRuJYTjIV42R232sHnUniNT_yE
```

4. Set up Supabase database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL script from `supabase-schema.sql`

5. Configure Google OAuth (optional):
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The system uses the following main tables:

- **profiles**: User profiles with roles (student, professor, admin)
- **lectures**: Scheduled lectures by professors
- **attendance**: Attendance records with face recognition data

## Face Recognition Integration

The face recognition system is ready for integration with the following libraries:
- [facer-classroom](https://github.com/domingomery/facer-classroom)
- [yolov8-face](https://github.com/derronqi/yolov8-face)
- [Crowd-Analysis-by-Face-Recognition](https://github.com/antopraju/Crowd-Analysis-by-Face-Recognition-and-Expression-Detection)
- [YOLO-CROWD](https://github.com/zaki1003/YOLO-CROWD)

The face recognition component is located in `components/face-recognition.tsx` and can be extended with actual face matching logic.

## Project Structure

```
atocrane/
├── app/
│   ├── admin/          # Admin dashboard
│   ├── auth/           # Authentication callbacks
│   ├── login/          # Login page
│   ├── professor/      # Professor dashboard
│   ├── signup/         # Signup page
│   ├── student/        # Student dashboard
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/
│   ├── ui/             # shadcn UI components
│   ├── face-recognition.tsx
│   ├── navbar.tsx
│   └── create-lecture-dialog.tsx
├── lib/
│   ├── supabase/       # Supabase client configuration
│   └── auth.ts         # Authentication utilities
└── supabase-schema.sql # Database schema
```

## User Roles

- **Student**: Can view scheduled lectures and mark attendance using face recognition
- **Professor**: Can create lectures, view attendance, and export reports
- **Admin**: Can view system statistics and manage users

## Export Features

Professors can export attendance data in:
- JSON format
- CSV format
- XLS format

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.
