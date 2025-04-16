# PaletteMail

A modern email template builder and sender application.

## Cloudinary Setup

This application uses Cloudinary for image hosting, which is especially important for profile pictures and images in the visual email builder.

### Configuration Steps:

1. Create a free account on [Cloudinary](https://cloudinary.com/users/register/free)

2. After signing up, navigate to your dashboard to find your account details

3. Add the following variables to your `.env.local` file:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. For production deployment on Vercel, add these same environment variables in the Vercel project settings.

### Features Enabled by Cloudinary:

- **Profile Pictures**: Upload and store user profile images
- **Email Builder**: Upload images or use external URLs in your email templates
- **Deployment Compatibility**: Works seamlessly in serverless environments like Vercel

## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Vercel Environment Variables

When deploying to Vercel, make sure to set the following environment variables in the Vercel dashboard:

- `MONGODB_URI`: Your MongoDB connection string
- `NEXTAUTH_SECRET`: A secret string for NextAuth.js
- `NEXTAUTH_URL`: Your production URL (e.g., https://your-app.vercel.app)
- `JWT_SECRET`: A secret string for JWT
- `SMTP_HOST`: Your SMTP server host
- `SMTP_PORT`: Your SMTP server port
- `SMTP_USER`: Your SMTP username/email
- `SMTP_PASSWORD`: Your SMTP password or app password
