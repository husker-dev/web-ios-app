const cacheName = "site-static";
const contentToCache = [
	".",
	"../out/web-ios-app.js",
	"../out/web-ios-app.css",
	"pages/test1.html",
	"pages/test1.template",
	"pages/tableview.html",
	"pages/tableview.template",
	"pages/titlebars.html",
	"pages/titlebars.template",
	"pages/toolbar.html",
	"pages/toolbar.template",

	"pages/titlebars/exampleContent.html",
	"pages/titlebars/defaultTitlebar.template",
	"pages/titlebars/titleTitlebar.template",
	"pages/titlebars/imageTitlebar.template",

	"resources/app_store.png",
	"resources/message.png",
	"resources/image2.png",
];


self.addEventListener('install', event => {
	event.waitUntil(caches.open(cacheName).then(cache => {
		contentToCache.forEach(content => {
			cache.add(content).catch(_ => console.error(`Error while caching "${content}"`))
		});
	}));
});

self.addEventListener('fetch', event => {
	event.respondWith(
		caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request)),
	);
});