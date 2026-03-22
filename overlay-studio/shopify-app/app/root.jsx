import { json } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { AppProvider } from '@shopify/shopify-app-remix/react';

/**
 * Root must render <html> at the top level. AppProvider belongs *inside* <body>
 * wrapping only <Outlet /> — not wrapping <html>. Otherwise React hydration breaks
 * in Shopify's iframe (errors #418/#423, appendChild on document).
 *
 * apiKey is required by AppProvider (Shopify Client ID / SHOPIFY_API_KEY).
 */
export async function loader() {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || '',
  });
}

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider apiKey={apiKey} isEmbeddedApp>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
