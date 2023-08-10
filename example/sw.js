const cacheName = "site-static";
const contentToCache = [
	".",
	"../out/web-ios-app.js",
	"../out/web-ios-app.css",

	"pages/blank/blank.html",
	"pages/blank/blank.template",

	"pages/overview.html",
	"pages/overview.template",
	"pages/welcome.html",
	"pages/welcome.template",

	"pages/overview/colors.html",
	"pages/overview/colors.template",
	"pages/overview/tableview.html",
	"pages/overview/tableview.template",
	"pages/overview/theme.html",
	"pages/overview/theme.template",
	"pages/overview/titlebars.html",
	"pages/overview/titlebars.template",
	"pages/overview/toolbar.html",
	"pages/overview/toolbar.template",

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
