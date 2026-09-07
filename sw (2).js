// Outstations Support Hub — Service Worker
//
// Purpose: let the app open even with no connection, by keeping a cached
// copy of the page. Free-text AI answers still need a connection (they talk
// to the Cloudflare Worker); the 8 button-driven flows and station data do
// not, since they live entirely inside the HTML file itself.
//
// Strategy: "network first, falling back to cache" for the page itself, so
// people online always get the latest version, and people offline get
// whatever was last successfully loaded. Everything else (the Worker API,
// flag images) is left alone — if those fail offline, the app already
// handles that gracefully on its own.
//
// IMPORTANT: bump CACHE_NAME (e.g. v1 -> v2) whenever you deploy a new
// version of soporte-outstations.html, so old cached copies get replaced
// instead of lingering forever on people's phones.

const CACHE_NAME = 'osh-cache-v1';
const APP_SHELL_URL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle top-level page loads (network-first, cache fallback).
  // Everything else (Worker API calls, flag images, fonts) is left
  // completely untouched — those behave exactly as if there were no
  // service worker at all.
  if (req.mode !== 'navigate') {
    return; // let the browser handle it normally
  }

  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL_URL, copy));
        return response;
      })
      .catch(() => caches.match(APP_SHELL_URL))
  );
});
