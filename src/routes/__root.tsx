import { Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SellerAI — AI for Malaysian micro-entrepreneurs" },
      { name: "description", content: "AI captions, posters, profit calculator and stock tracker built for Malaysian home bakers, handcraft sellers and stall owners." },
      { name: "author", content: "SellerAI" },
      { property: "og:title", content: "SellerAI — AI for Malaysian micro-entrepreneurs" },
      { property: "og:description", content: "AI captions, posters, profit calculator and stock tracker built for Malaysian home bakers, handcraft sellers and stall owners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "SellerAI — AI for Malaysian micro-entrepreneurs" },
      { name: "twitter:description", content: "AI captions, posters, profit calculator and stock tracker built for Malaysian home bakers, handcraft sellers and stall owners." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/59dc4d42-cef6-4ab4-a5da-0051ef336e79/id-preview-8ce8564c--11c2404e-e649-49f6-b9fa-2cf3daccc61a.lovable.app-1778375708413.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/59dc4d42-cef6-4ab4-a5da-0051ef336e79/id-preview-8ce8564c--11c2404e-e649-49f6-b9fa-2cf3daccc61a.lovable.app-1778375708413.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
