const VERSION = "v0.8.0";
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

self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
        event.respondWith(caches.match("/"));
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request.url);
            if (cachedResponse) {
                return cachedResponse;
            }
            return new Response(null, { status: 404 });
        })(),
    );
});