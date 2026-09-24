// Smol Café PWA Service Worker
const CACHE_NAME = "smol-cafe-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Let network handle all dynamic requests
  return;
});
