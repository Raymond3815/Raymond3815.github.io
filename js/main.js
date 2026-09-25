
// KeyStore
(()=>{
	const DB_NAME = "keystore";
	const STORE_NAME = "keys";

	let dbPromise = null;

	const getDatabase = ()=>{
		if (dbPromise) return dbPromise;
		dbPromise = new Promise((resolve, reject)=>{
			const req = indexedDB.open(DB_NAME, 1);
			req.onupgradeneeded = ()=>{
				req.result.createObjectStore(STORE_NAME);
			};
			req.onsuccess = ()=> resolve(req.result);
			req.onerror = ()=> reject(req.error);
		});
		return dbPromise;
	};

	const getKey = async(id)=>{
		const db = await getDatabase();
		return new Promise((resolve, reject)=>{
			const tx = db.transaction(STORE_NAME, "readonly");
			const r = tx.objectStore(STORE_NAME).get(id);
			r.onsuccess = () => resolve(r.result ?? null);
    		r.onerror = () => reject(r.error);
		});
	};

	const putKey = async(id, value)=>{
		const db = await getDatabase();
		return new Promise((resolve, reject)=>{
			const tx = db.transaction(STORE_NAME, "readwrite");
			const r = tx.objectStore(STORE_NAME).put(value, id);
			r.onsuccess = () => resolve();
    		r.onerror = () => reject(r.error);
		});
	};

	const key_db = {
		get: getKey, store: putKey
	};
	Object.freeze(key_db);

	Object.defineProperty(window, 'KeyStore', {value: key_db, writable: false});
})();


function updateAC(){
	try{
		navigator.serviceWorker.controller.postMessage(1);
	}
	catch(e)
	{}
}


window_event_manager.addEventListener(window_event_manager.EVENT_WINDOW_LOADED, async ()=>{
	for (const el of window.document.getElementsByClassName("button"))
	{
		if (el.id in window){
			el.onclick = window[el.id];
		}
	}
	
	if (window.matchMedia("(prefers-color-scheme: dark)").matches){
		document.documentElement.setAttribute("data-theme", "dark");
	}
	else{
		document.documentElement.setAttribute("data-theme", "light");
	}
	
}, true, true);

if ('serviceWorker' in navigator) {	
	navigator.serviceWorker.register('/sw.js');
} else {
	console.error('Service workers are not supported.');
}


// button functions
async function handleEncFile(evt){
	const file = await promptForFile(false);
	if (!file){
		return false;
	}
		
	const ob = new OverlayBody();
		
	const d_div = document.createElement('div');
	ob.body.appendChild(d_div);
	
	const fn = document.createElement("p");
	fn.innerHTML = "Selected: " + file.name;
	d_div.appendChild(fn);
	
	const d_form = document.createElement("form");
	d_div.appendChild(d_form);
	
	const pass_input = document.createElement("input");
	pass_input.classList.add('textinput');
	pass_input.type = "password";
	pass_input.placeholder = "Passphrase";
	pass_input.autocomplete = 'off';
	pass_input.style.width = "350px";
	pass_input.onchange = ()=>{
		if (pass_input.type != "password"){
			pass_input.type = "password";
		}
	};
	
	d_form.appendChild(pass_input);
	
	const select_keyfile = document.createElement("div");
	select_keyfile.classList.add("button");
	select_keyfile.innerHTML = "Select a keyfile";
	select_keyfile.style.width = '350px';
	select_keyfile.style.display = 'inline-block';
	let keyfile = null;
	select_keyfile.onclick = async()=>{
		keyfile = await promptForFile(false);
		if (!keyfile){
			keyfile = null;
			select_keyfile.innerHTML = "Select a keyfile";
			QuickNotification("No keyfile selected", 'w');
		}
		else{
			select_keyfile.innerHTML = "Selected: " + keyfile.name;
		}
	};
	ob.body.appendChild(select_keyfile);
	
	let busy = false;
	const loader = document.createElement("DIV");
	loader.className = "loader";
	loader.style.position = "fixed";
	loader.style.top = "50%";
	loader.style.display = 'none';
	ob.body.appendChild(loader);
	
	const de_buttons = document.createElement("div");
	ob.body.appendChild(de_buttons);
	
	
	const encrypt_button = document.createElement("div");
	encrypt_button.classList.add("button");
	encrypt_button.innerHTML = "Encrypt";
	encrypt_button.style.display = 'inline-block';
	encrypt_button.style.width = '165px';
		
	encrypt_button.onclick = async()=>{
		if (busy){
			QuickNotification("Still working on last request");
			return;
		}
		busy = true;
		loader.style.display = '';
		
		const fbuffer = await file.arrayBuffer();
		if (keyfile){
			// 12-byte IV
			const iv = window.crypto.getRandomValues(new Uint8Array(12));
			const dk = await window.crypto.subtle.importKey("raw", await keyfile.arrayBuffer(), "AES-GCM", true, ["encrypt"]);
			try
			{
				const bl = new Blob([iv, await window.crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, dk, fbuffer)]);
				pass_input.value = "";
				const a = document.createElement("a");
				a.href = URL.createObjectURL(bl);
				a.download = file.name + '.enc';
				a.click();
				ob.RemoveOverlay();
			}
			catch(e)
			{
				QuickNotification("Failed to decrypt", 'w');
				console.error(e);
			}
		}
		else{
			if (!pass_input.value){
				QuickNotification("No passphrase or keyfile supplied", 'e');
				busy = false;
				loader.style.display = 'none';
				return;
			}
			
			// 12-byte	IV
			// 12-byte	salt
			// 4-byte	iteration count
			const iv = window.crypto.getRandomValues(new Uint8Array(12));
			const salt = window.crypto.getRandomValues(new Uint8Array(12));
			const iter = await PBKDF2Iterations(2000);
			const iter_bin = new Uint32Array([iter]).buffer;
			
			const dk = await window.crypto.subtle.importKey("raw", await PBKDF2(pass_input.value, salt, iter, "SHA-256", 256), "AES-GCM", true, ["encrypt"]);
			try
			{
				const bl = new Blob([iv,salt,iter_bin,await window.crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, dk, fbuffer)]);
				pass_input.value = "";
				const a = document.createElement("a");
				a.href = URL.createObjectURL(bl);
				a.download = file.name + '.enc';
				a.click();
				ob.RemoveOverlay();
			}
			catch(e)
			{
				QuickNotification("Failed to decrypt", 'w');
				console.error(e);
			}
		}
		busy = false;
		loader.style.display = 'none';
	};
	de_buttons.appendChild(encrypt_button);
	
	
	const decrypt_button = document.createElement("div");
	decrypt_button.classList.add("button");
	decrypt_button.innerHTML = "Decrypt";
	decrypt_button.style.display = 'inline-block';
	decrypt_button.style.width = '165px';
	
	decrypt_button.onclick = async()=>{
		if (busy){
			QuickNotification("Still working on last request");
			return;
		}
		busy = true;
		loader.style.display = '';
		
		const fbuffer = await file.arrayBuffer();
		if (keyfile){
			// 12-byte IV
			const iv = new DataView(fbuffer, 0, 12);
			const data = new DataView(fbuffer, 12);
			const dk = await window.crypto.subtle.importKey("raw", await keyfile.arrayBuffer(), "AES-GCM", true, ["decrypt"]);
			try
			{
				const bl = new Blob([await window.crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, dk, data)]);
				pass_input.value = "";
				const a = document.createElement("a");
				a.href = URL.createObjectURL(bl);
				a.download = file.name.split('.enc')[0];
				a.click();
				ob.RemoveOverlay();
			}
			catch(e)
			{
				QuickNotification("Failed to decrypt", 'w');
				console.error(e);
			}
		}
		else{
			if (!pass_input.value){
				QuickNotification("No passphrase or keyfile supplied", 'e');
				busy = false;
				loader.style.display = 'none';
				return;
			}
			
			// 12-byte	IV
			// 12-byte	salt
			// 4-byte	iteration count
			const iv = new DataView(fbuffer, 0, 12);
			const salt = new DataView(fbuffer, 12, 12);
			const iter = new DataView(fbuffer, 24, 4).getUint32(0, true);
			const data = new DataView(fbuffer, 28);
			
			
			const dk = await window.crypto.subtle.importKey("raw", await PBKDF2(pass_input.value, salt, iter, "SHA-256", 256), "AES-GCM", true, ["decrypt"]);
			try
			{
				const bl = new Blob([await window.crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, dk, data)]);
				pass_input.value = "";
				const a = document.createElement("a");
				a.href = URL.createObjectURL(bl);
				a.download = file.name.split('.enc')[0];
				a.click();
				ob.RemoveOverlay();
			}
			catch(e)
			{
				QuickNotification("Failed to decrypt", 'w');
				console.error(e);
			}
		}
		busy = false;
		loader.style.display = 'none';
	};
	de_buttons.appendChild(decrypt_button);
	
	
	const generate_passphrase = document.createElement("div");
	generate_passphrase.classList.add("button");
	generate_passphrase.innerHTML = "Generate a passphrase";
	generate_passphrase.style.marginTop = '10px';
	generate_passphrase.style.width = '350px';
	generate_passphrase.style.display = 'inline-block';
	generate_passphrase.onclick = async()=>{
		pass_input.value = await EncodeKey(await GenerateKey());
		pass_input.type = "text";
	};
	ob.body.appendChild(generate_passphrase);
	
	const generate_keyfile = document.createElement("div");
	generate_keyfile.classList.add("button");
	generate_keyfile.innerHTML = "Generate a keyfile";
	generate_keyfile.style.width = '350px';
	generate_keyfile.style.display = 'inline-block';
	generate_keyfile.onclick = async()=>{
		const bl = new Blob([Base64.decode(await EncodeKey(await GenerateKey()))]);
		const a = document.createElement("a");
		a.href = URL.createObjectURL(bl);
		a.download = "key-SW_EPOCH.key";
		a.click();
	};
	ob.body.appendChild(generate_keyfile);
	
	return true;
}

async function generateB64Keys(evt){
	const k_size = [96,128,192,256,512];
	const ob = new OverlayBody();
	
	for (const ks of k_size){
		const k = Base64.encodeUrl(window.crypto.getRandomValues(new Uint8Array(ks + 7 >> 3)));
		const p = document.createElement('p');
		p.style.cursor = 'pointer';
		p.innerHTML = ks + '-bit (length ' + k.length + '): <BR>' + k;
		p.onclick = function(){
			const range = document.createRange();
			range.selectNodeContents(this.childNodes[2]);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(range);
		};
		AddToolTip(p, "Click to select");
		ob.body.appendChild(p);
	}
	
};


async function listTOTP(evt){
	const keykey = "totp_master_key";
	
	const ob = new OverlayBody();
	ob.body.style.minWidth = '350px';
	ob.body.style.width = '80%';
	
	
	let list_totp = await (async()=>{
		try{

			const dk = await KeyStore.get(keykey);
			if (dk)
			{
				return JSON.parse(Utf8.encode(await ZStandard.decompress(await DecryptMessage(dk, window.localStorage.getItem("list_totp")))));
			}

		}
		catch(e){
		}
		return {};
	})();
	
	
	const listing = document.createElement("div");	
	ob.body.appendChild(listing);
	const s_func = function(){
		const range = document.createRange();
		range.selectNodeContents(this.childNodes[this.childNodes.length - 1]);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
	};
	let lf_to = 0;
	const listingFill = async()=>{
		if (!listing.parentNode){
			return;
		}
		
		[...listing.children].forEach(RemoveElement);
		
		const ct = epochTime();
		const lst = unpackJSONTable(list_totp).map((e)=>{
			return {
				'issuer': e.issuer,
				'label': e.label, 
				'totp': TOTP(Base32.decode(e.secret), ct, e.digits, e.period, 0, e.algorithm.replace('SHA','SHA-')).then((v)=>{
						v = String(v);
						while(v.length < e.digits){
							v = '0' + v;
						}
						return v;
					})
				};
			}
		);
		
		if (!lst.length){
			listing.innerHTML = "<p>Nothing imported</p>";
			listing.style.lineHeight = '300px';			
		}
		else{
			listing.style.lineHeight = '';			
		}		
		
		lst.sort((a,b)=>{
			const c = a.issuer.localeCompare(b.issuer);
			if (c == 0){
				return a.label.localeCompare(b.label);
			}
			return c;
		});
		for (const li of lst){
			const p = document.createElement('p');
			p.style.cursor = 'pointer';
			p.style.margin = '20px';
			p.style.width = '300px';
			p.style.textAlign = 'left';
			p.style.textOverflow = 'ellipsis';
			p.style.overflowX = 'hidden';
			if (!li.issuer){
				if (li.label.indexOf(':') > 0){
					const sv = li.label.split(':');
					li.issuer = sv[0].trim();
					li.label = sv[1].trim();
				}
				else{
					li.issuer = li.label.trim();
				}
			}
			if (li.issuer == li.label){
				li.label = '';
			}
			p.style.display = 'inline-block';

			p.innerHTML = (li.issuer ? '<b>' + li.issuer + '</b><br>' : '') + (li.label ? '(' + li.label + ')<br>' : '') + "<b>" + await li.totp + '</b>';
			p.onclick = s_func;
			AddToolTip(p, "Click to select");
			listing.appendChild(p);
		}
		
		window.clearTimeout(lf_to);
		lf_to = window.setTimeout(listingFill, (30 - (ct - Math.trunc(ct / 30) * 30)) * 1e3);
		
	};
	listingFill();
		
	let busy = false;
	const loader = document.createElement("DIV");
	loader.className = "loader";
	loader.style.position = "fixed";
	loader.style.top = "50%";
	loader.style.display = 'none';
	ob.body.appendChild(loader);
	
	const import_andOTP = document.createElement("div");
	import_andOTP.classList.add("button");
	import_andOTP.innerHTML = "Import from andOTP";
	import_andOTP.style.width = '350px';
	import_andOTP.style.display = 'inline-block';
	import_andOTP.onclick = async()=>{
		if (busy){
			QuickNotification("still processing");
		}
		busy = true;
		loader.style.display = '';
		
		const file = await promptForFile(false);
		if (!file)
		{
			QuickNotification("No file supplied", 'w');
			loader.style.display = 'none';
			busy = false;
			return;
		}
		
		
		let submitted = false;
		const iob = new OverlayBody();
		iob.removeOverlayCallback = ()=>{
			if (!submitted){
				loader.style.display = 'none';
				busy = false;
			}
		};
		
		const d_form = document.createElement("form");
		iob.body.appendChild(d_form);
		
		const pass_input = document.createElement("input");
		pass_input.classList.add('textinput');
		pass_input.type = "password";
		pass_input.placeholder = "Passphrase";
		pass_input.autocomplete = 'off';
		pass_input.style.width = "280px";
		pass_input.onchange = ()=>{
			if (pass_input.type != "password"){
				pass_input.type = "password";
			}
		};
		
		
		d_form.appendChild(pass_input);
		const submit = document.createElement("div");
		submit.classList.add("button");
		submit.innerHTML = "Decrypt";
		submit.style.marginTop = '10px';
		submit.style.width = '280px';
		submit.style.display = 'inline-block';
		submit.onclick = async()=>{
			if (pass_input.value.length == 0){
				QuickNotification('No passphrase', 'w');
				return;
			}
			
			submitted = true;
			iob.RemoveOverlay();
			
			const fbuffer = await file.arrayBuffer();
			
			const iter = new DataView(fbuffer).getUint32(false);
			const salt = new DataView(fbuffer, 4, 12);
			const iv = new DataView(fbuffer, 16, 12);
			const data = new DataView(fbuffer, 28);
			
			
			try{
				if (iter > (await PBKDF2Iterations(500)) * 4){
					QuickNotification("too many iterations on PBKDF2", 'w');
					throw 1;
				}
				
				const dk = await window.crypto.subtle.importKey("raw", await PBKDF2(pass_input.value, salt, iter, "SHA-1", 256), "AES-GCM", false, ["decrypt", "encrypt"]);
				await KeyStore.store(keykey, dk);
				
				list_totp = packJSONTable(JSON.parse(Utf8.encode(await window.crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, dk, data))));
								
				window.localStorage['list_totp'] = await EncryptMessage(dk, await ZStandard.compress(Utf8.decode(JSON.stringify(list_totp))));
				
				window.clearTimeout(lf_to);
				await listingFill();
			} catch(e){
				QuickNotification("failed to decrypt", 'e');
			}
			
			loader.style.display = 'none';
			busy = false;
			
		};
		iob.body.appendChild(submit);
		
	};
	ob.body.appendChild(import_andOTP);
	
	
	const import_aegis = document.createElement("div");
	import_aegis.classList.add("button");
	import_aegis.innerHTML = "Import from Aegis";
	import_aegis.style.width = '350px';
	import_aegis.style.display = 'inline-block';
	import_aegis.onclick = async()=>{
		if (busy){
			QuickNotification("still processing");
		}
		busy = true;
		loader.style.display = '';
		
		const file = await promptForFile(false);
		if (!file)
		{
			QuickNotification("No file supplied", 'w');
			loader.style.display = 'none';
			busy = false;
			return;
		}

		let  a_json = null;

		const decrypt_db = async(key)=>{
			const msg_data = Base64.decode(a_json.db)
			const tag_data = Hex.decode(a_json.header.params.tag)


			const data = new Uint8Array(msg_data.length + tag_data.length);
			data.set(msg_data, 0);
			data.set(tag_data, msg_data.length);


			const db_json = JSON.parse(Utf8.encode(new Uint8Array(
				await window.crypto.subtle.decrypt({
					name: "AES-GCM",
					iv: Hex.decode(a_json.header.params.nonce)
				},key, data)
			)));

			// convert to known format
			const entries = db_json.entries.filter(e=>e.type == 'totp').map((entry)=>{
				
				
				return {
					"issuer": entry.issuer,
					'label': entry.name,
					'secret': entry.info.secret,
					'algorithm': entry.info.algo,
					'digits': entry.info.digits,
					'period': entry.info.period,
				};

			})

			list_totp = packJSONTable(entries);
			window.localStorage['list_totp'] = await EncryptMessage(key, await ZStandard.compress(Utf8.decode(JSON.stringify(list_totp))));
			window.clearTimeout(lf_to);
			await listingFill();

			loader.style.display = 'none';
			busy = false;
		};

		try{
			a_json = JSON.parse(await file.text());
			if (a_json.version != 1)
			{
				throw new Error("unsupported Aegis version");
			}
				
			// try fast decrypt based on existing
			const pdk = await KeyStore.get(keykey);
			if (pdk)
			{
				try{
					return decrypt_db(pdk);
				}
				catch(e){
					console.error(e);
				}
			}
		}catch(e)
		{
			QuickNotification("failed to decrypt " + String(e), 'e');
			loader.style.display = 'none';
			busy = false;
			console.error(e);
			return;
		}

		
		let submitted = false;
		const iob = new OverlayBody();
		iob.removeOverlayCallback = ()=>{
			if (!submitted){
				loader.style.display = 'none';
				busy = false;
			}
		};
		
		const d_form = document.createElement("form");
		iob.body.appendChild(d_form);
		
		const pass_input = document.createElement("input");
		pass_input.classList.add('textinput');
		pass_input.type = "password";
		pass_input.placeholder = "Passphrase";
		pass_input.autocomplete = 'off';
		pass_input.style.width = "280px";
		pass_input.onchange = ()=>{
			if (pass_input.type != "password"){
				pass_input.type = "password";
			}
		};
		
		
		d_form.appendChild(pass_input);
		const submit = document.createElement("div");
		submit.classList.add("button");
		submit.innerHTML = "Decrypt";
		submit.style.marginTop = '10px';
		submit.style.width = '280px';
		submit.style.display = 'inline-block';
		submit.onclick = async()=>{
			if (pass_input.value.length == 0){
				QuickNotification('No passphrase', 'w');
				return;
			}
			
			submitted = true;
			iob.RemoveOverlay();
			
			const fbuffer = await file.arrayBuffer();
			try{
				// obtain key from passphrase
				let dk = null;
				for (const slot of a_json.header.slots)
				{
					if (slot.type != 1)
					{
						continue;
					}

					
					const pdk = await LSodium.scrypt(pass_input.value, Hex.decode(slot.salt), slot.n, slot.r, slot.p, 256/8);


					const msg_data = Hex.decode(slot.key)
					const tag_data = Hex.decode(slot.key_params.tag);

					const data = new Uint8Array(msg_data.length + tag_data.length);
					data.set(msg_data, 0);
					data.set(tag_data, msg_data.length);
					try{
						dk = await window.crypto.subtle.importKey("raw", 
							new Uint8Array(
								await window.crypto.subtle.decrypt({
									name: "AES-GCM",
									iv: Hex.decode(slot.key_params.nonce)
								},
								await window.crypto.subtle.importKey("raw", pdk, "AES-GCM", false, ["decrypt"]),
								data)
							), "AES-GCM", false, ["encrypt", "decrypt"]
						);
						break;
					}
					catch(e){}
				}

				if (!dk)
				{
					throw new Error("unable to derive key from passphrase");
				}
				await KeyStore.store(keykey, dk);

				return decrypt_db(dk);

			} catch(e){

				QuickNotification("failed to decrypt " + String(e), 'e');
				console.error(e);
			}
			
			loader.style.display = 'none';
			busy = false;
		};
		iob.body.appendChild(submit);
		
	};
	ob.body.appendChild(import_aegis);
	
	
};


async function handleZstFile(evt){
	const file = await promptForFile(false);
	if (!file){
		return false;
	}
	
	const ob = new OverlayBody();
	ob.body.style.minHeight = '250px'
	
	const d_div = document.createElement('div');
	ob.body.appendChild(d_div);
	
	const fn = document.createElement("p");
	fn.innerHTML = "Selected: " + file.name;
	d_div.appendChild(fn);
	
	let busy = false;
	const loader = document.createElement("DIV");
	loader.className = "loader";
	loader.style.position = "fixed";
	loader.style.top = "50%";
	loader.style.display = 'none';
	ob.body.appendChild(loader);
	
	
		
	const compress_button = document.createElement("div");
	compress_button.classList.add("button");
	compress_button.innerHTML = "Compress";
	compress_button.style.display = 'inline-block';
	compress_button.style.width = '125px';	
	compress_button.style.margin = '10px';

	compress_button.onclick = async()=>{
		if (busy){
			QuickNotification("Still working on last request");
			return;
		}
		busy = true;
		loader.style.display = '';
				
		const b = new Blob([await ZStandard.compress(new Uint8Array(await file.arrayBuffer()))]);

		const a = document.createElement("a");
		a.href = URL.createObjectURL(b);
		a.download = file.name + '.zst';
		a.click();		

		busy = false;
		loader.style.display = 'none';
	};
	ob.body.appendChild(compress_button);
	
	ob.body.appendChild(document.createElement('br'));
	
	const decompress_button = document.createElement("div");
	decompress_button.classList.add("button");
	decompress_button.innerHTML = "Decompress";
	decompress_button.style.display = 'inline-block';
	decompress_button.style.width = '125px';
	decompress_button.style.margin = '10px';
	
	decompress_button.onclick = async()=>{
		if (busy){
			QuickNotification("Still working on last request");
			return;
		}
		busy = true;
		loader.style.display = '';
		
		const b = new Blob([await ZStandard.decompress(new Uint8Array(await file.arrayBuffer()))]);

		const a = document.createElement("a");
		a.href = URL.createObjectURL(b);
		a.download = file.name.replace('.zst', '');
		a.click();
		
		busy = false;
		loader.style.display = 'none';
	};
	ob.body.appendChild(decompress_button);
	
	
	return true;
}


