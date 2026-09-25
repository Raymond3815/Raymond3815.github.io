const cache_name = 'crypto-cache-v5';
const availible_offline = true;
const min_cache_mime = {
	"image": 86400,
	"text": 86400,
	"application/wasm": 86400,
	"application/javascript": 3600
};
const max_cache_count = 10; // max entries per url path

const epochTime = (...args)=>Math.trunc(new Date(...args).getTime() / 1e3);
const responseTime = (response)=>Math.trunc(new Date(response.headers.get("Date")).getTime() / 1e3);


const activelyChanging = (()=>{
	const ac_url = "/ac.json";
	const ac_timeout = 180;
	let ac_last_updated = 0;
	let ac = [];
	
	async function updateAC(){
		if (navigator.onLine == false){
			ac_last_updated = epochTime();
			return true;
		}
		
		try {
			const acr = await fetch(ac_url, {cache: 'no-cache'});
			if (acr.ok){
				try{
					ac = await acr.json();
					for (let i = 0; i < ac.length; ++i){
						if (ac[i].length && ac[i][0] == '/'){
							ac[i] = location.origin + ac[i];
						}
					}
				}
				catch(e){
				}
			}
		} catch(e){}
		
		ac_last_updated = epochTime();
		return true;
	}	
	
	return function(url_path){
		if (url_path == -1){
			return updateAC();
		}
		const ct = epochTime();
		if (ct - ac_last_updated > ac_timeout){
			updateAC();
		}
		return ac.indexOf(url_path) > -1;
	};
})();


const forwardResponse = async function(response){
	const mtype = response.headers.get('content-type') || "";
	if (mtype && (mtype.startsWith("text") || mtype.endsWith("/javascript")))
	{
		const headers = new Headers(response.headers);
		headers.append('SW_Processed', cache_name);
		if (!headers.get("cache-control")){
			headers.append("Cache-control", "no-store");
		}
				
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: headers
		});
	}
	return response;
};


self.addEventListener('activate', async (e) => {
	console.log('[Service Worker] Activate');
	e.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k !== cache_name).map((k) => caches.delete(k)));
		await activelyChanging(-1);
		await self.clients.claim();
	})());
});
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));


async function handleFetch(request, client_id = null){
	if (["GET", "HEAD"].indexOf(request.method) == -1){
		return fetch(request);
	}
	const ctime = epochTime();
	
	const u = new URL(request.url);
	const acKey = u.origin + u.pathname;
	const ac = activelyChanging(acKey);
	const cache = await caches.open(cache_name);
	
	const r = await cache.match(request);	
	if (r){
		if (navigator.onLine == false && availible_offline){
			return forwardResponse(r);
		}
		
		if (!ac && !r.headers.get("cache-control") && !r.headers.get("vary")){
			const rtime = responseTime(r);
			const dtime = ctime - rtime;
			const mtype = r.headers.get('content-type') || "";
			for (const k in min_cache_mime){
				if (mtype.startsWith(k)){
					if (dtime < min_cache_mime[k] || min_cache_mime[k] < 0){
						return forwardResponse(r);
					}
				}
			}
		}
		
	}
	
	try
	{
		const nr = await fetch(request, ac ? {cache: 'no-cache'} : {});
		switch(nr.type)
		{
			case 'basic':
			case 'cors':
				break;
			default:
				return nr;
		}
		
		if (!r){
			console.log('[Service Worker] Caching new resource:', request.url);
			
			if (new URL(request.url).search.length){
				if ((await cache.matchAll(request, {ignoreSearch: true})).length > max_cache_count){
					cache.delete(request, {ignoreSearch: true});
				}
			}
		}
		else{
			console.debug('[Service Worker] Caching updating resource:', request.url);
		}
		
		await cache.put(request, nr.clone());
		return forwardResponse(nr);
	}
	catch(e)
	{
		if (r){
			console.warn("fallback response");
			return forwardResponse(r);
		}
		else{
			console.error(e);
			if (client_id){
				const client = await clients.get(client_id);
				client?.postMessage("failed to get resource");
			}
			
			return new Response("", { status: 503, statusText: "offline" });
		}
	}
}


self.addEventListener('fetch', (e) => {	
	if (e.request.method !== "GET") return; // let browser handle it
	if (e.request.headers.has("range")) return;
	
	e.respondWith(handleFetch(e.request, e.clientId));
});

self.addEventListener('message', (e) => {
	const msg = e.data;
	activelyChanging(-1);
});
