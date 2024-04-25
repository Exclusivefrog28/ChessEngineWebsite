const VERSION = "v0.8.1";
const CACHE_NAME = `chessengine-${VERSION}`;

const APP_STATIC_RESOURES = [
    "/",
    "/index.html",
    "/manifest.json",
    "/src/app.js",
    "/src/ChessEngine.js",
    "/src/ChessEngine.wasm",
    "/src/ChessEngine.worker.js",
    "/src/engine.js",
    "/src/organized-workers.js",
    "/src/splash.css",
    "/src/styles.css",
    "/src/util.js",
    "/src/assets/arrows.css",
    "/src/cm-chessboard/assets/chessboard.css",
    "/src/cm-chessboard/assets/pieces/staunty.svg",
    "/src/cm-chessboard/assets/extensions/arrows/arrows.css",
    "/src/cm-chessboard/assets/extensions/arrows/arrows.svg",
    "/src/cm-chessboard/assets/extensions/markers/markers.css",
    "/src/cm-chessboard/assets/extensions/markers/markers.svg",
    "/src/cm-chessboard/assets/extensions/promotion-dialog/promotion-dialog.css",
    "/src/cm-chessboard/extensions/arrows/Arrows.js",
    "/src/cm-chessboard/extensions/markers/Markers.js",
    "/src/cm-chessboard/extensions/promotion-dialog/PromotionDialog.js",
    "/src/cm-chessboard/lib/Svg.js",
    "/src/cm-chessboard/lib/Utils.js",
    "/src/cm-chessboard/model/ChessboardState.js",
    "/src/cm-chessboard/model/Extension.js",
    "/src/cm-chessboard/model/Position.js",
    "/src/cm-chessboard/view/ChessboardView.js",
    "/src/cm-chessboard/view/PositionAnimationsQueue.js",
    "/src/cm-chessboard/view/VisualMoveInput.js",
    "/src/cm-chessboard/Chessboard.js",
    "/android-chrome-512x512.png",
]
// NOTE: This file creates a service worker that cross-origin-isolates the page (read more here: https://web.dev/coop-coep/) which allows us to use wasm threads.
// Normally you would set the COOP and COEP headers on the server to do this, but GitHub Pages doesn't allow this, so this is a hack to do that.

/* Edited version of: coi-serviceworker v0.1.6 - Guido Zuidhof, licensed under MIT */
// From here: https://github.com/gzuidhof/coi-serviceworker
if (typeof window === 'undefined') {
    self.addEventListener("install", (event) => {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_STATIC_RESOURES))
        )
    })
    self.addEventListener("activate", (event) => {
        event.waitUntil(
            (async () => {
                const names = await caches.keys();
                await Promise.all(
                    names.map((name) => {
                        if (name !== CACHE_NAME) {
                            return caches.delete(name);
                        }
                    }),
                );
                await clients.claim();
            })(),
        );
    });


    async function handleFetch(request) {
        if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
            return;
        }

        if (request.mode === "no-cors") { // We need to set `credentials` to "omit" for no-cors requests, per this comment: https://bugs.chromium.org/p/chromium/issues/detail?id=1309901#c7
            request = new Request(request.url, {
                cache: request.cache,
                credentials: "omit",
                headers: request.headers,
                integrity: request.integrity,
                destination: request.destination,
                keepalive: request.keepalive,
                method: request.method,
                mode: request.mode,
                redirect: request.redirect,
                referrer: request.referrer,
                referrerPolicy: request.referrerPolicy,
                signal: request.signal,
            });
        }

        let r;

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request.url);
        if (cachedResponse) {
            r = cachedResponse;
        } else r = await fetch(request).catch(e => console.error(e));

        if (r.status === 0) {
            return r;
        }

        const headers = new Headers(r.headers);
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(r.body, {status: r.status, statusText: r.statusText, headers});

    }

    self.addEventListener("fetch", function (e) {
        e.respondWith(handleFetch(e.request)); // respondWith must be executed synchonously (but can be passed a Promise)
    });

} else {
    (async function () {
        if (window.crossOriginIsolated !== false) return;

        let registration = await navigator.serviceWorker.register(window.document.currentScript.src).catch(e => console.error("COOP/COEP Service Worker failed to register:", e));
        if (registration) {
            console.log("COOP/COEP Service Worker registered", registration.scope);

            registration.addEventListener("updatefound", () => {
                console.log("Reloading page to make use of updated COOP/COEP Service Worker.");
                window.location.reload();
            });

            // If the registration is active, but it's not controlling the page
            if (registration.active && !navigator.serviceWorker.controller) {
                console.log("Reloading page to make use of COOP/COEP Service Worker.");
                window.location.reload();
            }
        }
    })();
}

// Code to deregister:
// let registrations = await navigator.serviceWorker.getRegistrations();
// for(let registration of registrations) {
//   await registration.unregister();
// }