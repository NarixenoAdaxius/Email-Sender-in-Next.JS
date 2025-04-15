import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';

export default async function Home() {
  // Check if there's a token cookie to determine if user is logged in
  // This is a server component, so we can access cookies directly
  const cookieStore = await cookies();
  const authToken = cookieStore.get('token');
  const hasAuthCookie = !!authToken;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Design professional</span>
              <span className="block text-primary">email templates</span>
            </h1>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">
              Create and send beautiful emails with PaletteMail's intuitive template builder.
              Customize content, track delivery, and manage your email campaigns
              all in one platform.
            </p>
          </div>
          
          {!hasAuthCookie && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Link
                href="/register"
                className="rounded-md bg-primary px-8 py-3 text-center text-base font-medium text-white shadow hover:bg-primary/90"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-gray-300 bg-white px-8 py-3 text-center text-base font-medium text-gray-700 shadow hover:bg-gray-50"
              >
                Log In
              </Link>
            </div>
          )}
          
          {hasAuthCookie && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-8 py-3 text-center text-base font-medium text-white shadow hover:bg-primary/90"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="mt-2 font-medium">Beautiful Templates</h3>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-2 font-medium">Easy Customization</h3>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              </div>
              <h3 className="mt-2 font-medium">Track Results</h3>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="relative h-[500px] w-full max-w-lg">
            <div className="absolute top-0 left-0 h-full w-full rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-20 blur-3xl"></div>
            <div className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <img 
                      src="/PaletteMail/Icon/pltmaild 32px.svg" 
                      alt="PaletteMail Icon" 
                      className="h-6 w-auto mr-2" 
                    />
                    <h2 className="text-2xl font-bold">Monthly Newsletter</h2>
                  </div>
                  <p className="text-sm text-gray-500">Send monthly updates to your subscribers</p>
                </div>
                
                <div className="space-y-2 rounded-md border border-gray-200 p-4">
                  <h3 className="font-medium">Email Preview</h3>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="h-8 w-24 rounded-md bg-primary/10"></div>
                    <div className="mt-3 h-4 w-full rounded-md bg-gray-100"></div>
                    <div className="mt-2 h-4 w-4/5 rounded-md bg-gray-100"></div>
                    <div className="mt-6 h-24 w-full rounded-md bg-gray-100"></div>
                    <div className="mt-4 h-8 w-32 rounded-md bg-primary/80"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipients</label>
                  <div className="h-10 rounded-md bg-gray-100"></div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <div className="h-10 rounded-md bg-gray-100"></div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <div className="h-10 w-24 rounded-md bg-primary"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
