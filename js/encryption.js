
// Encrypt/Decrypt
async function EncryptMessage(key, message)
{
	const iv = window.crypto.getRandomValues(new Uint8Array(key.algorithm.name == "AES-GCM" ? 12 : 16));	
	const cipher = await window.crypto.subtle.encrypt({name: key.algorithm.name, iv}, key, message.byteLength ? message : Utf8.decode(message));
	return Base64.encodeUrl(iv) + Base64.encodeUrl(new Uint8Array(cipher));
}
async function DecryptMessage(key, message, encodeUTF8)
{
	const salt_length = Base64.urlLength(key.algorithm.name == "AES-GCM" ? 12 : 16);
	const r = new Uint8Array(await window.crypto.subtle.decrypt({name: key.algorithm.name, iv: Base64.decode(message.substr(0,salt_length))}, key, Base64.decode(message.substr(salt_length))));
	if (encodeUTF8)
		return Utf8.encode(r); // single-byte this isn't a string, but raw bytes cast into UTF-16 string, prefer Binary-encoding for transfer
	return r;
}

function RandomBase64(bits = 512)
{
	return Base64.encodeUrl(window.crypto.getRandomValues(new Uint8Array((bits + 7) >> 3)));
}

async function KeyMaterial(passphrase, algorithm = "PBKDF2")
{
	return await window.crypto.subtle.importKey('raw', passphrase.byteLength ? passphrase : Utf8.decode(passphrase), { name: algorithm }, false, ["deriveKey", "deriveBits"]);
}
async function PBKDF2(passphrase, salt, iterations = 0, hash = "SHA-256", bit_length = 256)
{
	salt = salt.byteLength ? salt : Utf8.decode(salt);
	if (!iterations)
		iterations = 2e4 + passphrase.length + salt.length;
	return await window.crypto.subtle.deriveBits({ "name": "PBKDF2", salt: salt, "iterations": iterations, "hash": hash }, await KeyMaterial(passphrase, "PBKDF2"), bit_length);
}
async function PBKDF2Iterations(desired_ms = 2000, hash = "SHA-256", bit_length = 256)
{
	const tmp_salt = GenerateSalt();
	const tmp_pass = "consuming some CPU cycles";	
	for (let est = 1000;;)
	{
		const t0 = performance.now();
		await PBKDF2(tmp_pass, tmp_salt, est, hash, bit_length);
		const n_est = Math.trunc(est * desired_ms / (performance.now() - t0));
		if (Math.abs(n_est - est) / n_est < 0.5)
		{
			return n_est;
		}
		est = n_est;
	}
}


async function GetWrapKey(passphrase, salt, iterations = 0)
{
	return await window.crypto.subtle.importKey("raw", await PBKDF2(passphrase, salt, iterations, "SHA-256", 256), "AES-KW", false, ["wrapKey", "unwrapKey"]);
}

async function EncryptKey(wrapKey, key)
{		
	const cipher = await window.crypto.subtle.wrapKey("raw", key, wrapKey, "AES-KW");	
	return Base64.encodeUrl(new Uint8Array(cipher));
}

async function DecryptKey(wrapKey, key, use_cbc)
{
	const p = Base64.decode(key);
	return window.crypto.subtle.unwrapKey("raw", p, wrapKey, "AES-KW", {name: use_cbc ? "AES-CBC" : "AES-GCM", length: 256}, true, ["encrypt", "decrypt"]);
}
async function EncodeKey(key)
{
	return Base64.encodeUrl(new Uint8Array(await window.crypto.subtle.exportKey("raw", key)));
}
async function DecodeKey(encoded)
{
	return await window.crypto.subtle.importKey("raw", Base64.decode(encoded), "AES-GCM", true, ["encrypt", "decrypt"]);
}


async function GenerateKey(use_cbc, non_extractable)
{
	return await window.crypto.subtle.generateKey({name: use_cbc ? "AES-CBC" : "AES-GCM", length:256}, non_extractable ? false : true, ["encrypt", "decrypt"]);
}

function GenerateSalt()
{
	return window.crypto.getRandomValues(new Uint8Array(16));
}

function EncryptionSupport()
{
	return 'crypto' in window && 'subtle' in window.crypto && 'getRandomValues' in window.crypto &&
	 'encrypt' in window.crypto.subtle && 'decrypt' in window.crypto.subtle &&
	 'wrapKey' in window.crypto.subtle && 'importKey' in window.crypto.subtle && 'unwrapKey'in window.crypto.subtle && 'deriveKey' in window.crypto.subtle && 'exportKey' in window.crypto.subtle &&
	 'generateKey' in window.crypto.subtle;
}

async function TestEncryption()
{
	var salt = GenerateSalt();
	var key = await GenerateKey();

	var passphrase = 'secretPassphrase';
	var message = "i will be hidden";

	var wKey = await GetWrapKey(passphrase, salt);
	var encrypted = await EncryptMessage(key, message);
	var eKey = await EncryptKey(wKey, key);

	return await DecryptMessage(await DecryptKey(wKey, eKey), encrypted) == message;
}

function GenerateTOTPKey(){
	key = new Uint8Array(32);
	crypto.getRandomValues(key);
	return key;
}
async function TOTP(u8Key, t, digits, period, t0, hash){ // only use this to sent to server or verify server
	const K = await window.crypto.subtle.importKey("raw", u8Key, {name: "HMAC", hash: hash ? hash : "SHA-1"}, false, ["sign"]);
	
	const iter = Math.trunc(((t ? t : (new Date().getTime() / 1e3)) - (t0 ? t0 : 0)) / (period ? period : 30));
	const C = isLittleEndian ? swapByteOrder(new Uint32Array([0, iter])) : new Uint32Array([0, iter]); // uint64 in big-endian	
	
	const HMAC = new Uint8Array(await crypto.subtle.sign("HMAC", K, C)); //console.log(Hex.encode(HMAC));
	// extract31(HMAC, HMAC[19] & 0x0F)		
	const i = HMAC[HMAC.length - 1] & 0x0F; // 4 least-significant bits
	const HOTPu8 = HMAC.slice(i, i + 4); //console.log(Hex.encode(HOTPu8));
	HOTPu8[0] &= 0x7F; //console.log(Hex.encode(HOTPu8));
	const HOTP = (isLittleEndian ? swapByteOrder(new Uint32Array(HOTPu8.buffer)) : new Uint32Array(HOTPu8.buffer))[0];

	return HOTP % Math.pow(10, digits ? digits : 6);
}

async function TURNCredentials(name, secret, valid_seconds){ // should be performed on server-side
	const unix_epoch = Math.trunc(new Date().getTime() / 1000) + (valid_seconds ? valid_seconds : (24 * 3600));
	const username = [unix_epoch, name].join(':');
	
	const K = await window.crypto.subtle.importKey("raw", Utf8.decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
	const C = Utf8.decode(username);
	const HMAC = new Uint8Array(await crypto.subtle.sign("HMAC", K, C));
	
	return {username: username, credential: Base64.encode(HMAC)};
}
