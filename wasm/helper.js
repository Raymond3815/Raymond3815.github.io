// Helpers for WebAssembly compiled source code

// ZStandard
(function(){
	const context_ptr = {cctx: 0, dctx: 0};	
	const loadContextPtr = ()=>{
		if (!context_ptr.cctx){
			context_ptr.cctx = Module.ZSTD_createCCtx();
		}
		if (!context_ptr.dctx){
			context_ptr.dctx = Module.ZSTD_createDCtx();
		}
		Object.freeze(context_ptr);
	};
	window_event_manager.callWhenModuleLoaded(loadContextPtr);
	window_event_manager.addEventListener(window_event_manager.EVENT_UNLOAD, () => {
		if (context_ptr.cctx){			
			Module.ZSTD_freeCCtx(context_ptr.cctx);		
		}
		if (context_ptr.dctx){
			Module.ZSTD_freeDCtx(context_ptr.dctx);
		}
	}, true, true);

	class ZSTDError extends Error {
		constructor(error_code, ...params){
			super(...params);
			Object.defineProperty(this, 'code', { value: error_code, writable: false });
			Object.defineProperty(this, 'message', { value: Module.ZSTD_getErrorName(error_code), writable: false });

			this.name = 'ZSTDError';
		}
	}

	const compress = function(data, level){
		if (!window_event_manager.module_is_loaded) {
			return new Promise(async (s, e) => {
				await window_event_manager.moduleLoadedAwaitable();
				s(compress(data, level));
			});
		}
		
		const dtype_is_str = typeof (data) == "string";
		if (dtype_is_str){
			data = Utf8.decode(data);
		}
		if (!(data instanceof Uint8Array)){
			throw TypeError("data must be of type Uint8Array");
		}
		
		if (!context_ptr.cctx){
			loadContextPtr();
		}

		if (typeof (level) != 'number' || !level) {
			level = Module.ZSTD_maxCLevel();
		}
		else {
			level = Math.max(Module.ZSTD_minCLevel(), Math.min(level, Module.ZSTD_maxCLevel()));
		}

		const compressed_capacity = Module.ZSTD_compressBound(data.length);

		let result = null;

		const data_in_ptr = Module._malloc(data.length);
		const data_out_ptr = Module._malloc(compressed_capacity);
		try{
			let data_in_heap = new Uint8Array(Module.HEAPU8.buffer, data_in_ptr, data.length);
			let data_out_heap = new Uint8Array(Module.HEAPU8.buffer, data_out_ptr, compressed_capacity);

			data_in_heap.set(data);

			// optimal size
			const compressed_size = Module.ZSTD_compress(context_ptr.cctx, data_out_heap.byteOffset, data_out_heap.length, data_in_heap.byteOffset, data_in_heap.length, level);
			const error_code = Module.ZSTD_isError(compressed_size);
			if (error_code){
				throw new ZSTDError(error_code);
			}

			if (!data_out_heap.length || !data_out_heap.BYTES_PER_ELEMENT){
				// memory growth memory buffer view just changed
				data_in_heap = new Uint8Array(Module.HEAPU8.buffer, data_in_ptr, data.length);
				data_out_heap = new Uint8Array(Module.HEAPU8.buffer, data_out_ptr, compressed_capacity);
			}
			
			// copy output
			result = new Uint8Array(data_out_heap.subarray(0, compressed_size));		
		}
		finally { 
			Module._free(data_in_ptr); 
			Module._free(data_out_ptr);
		}

		return dtype_is_str ? Base64.encodeUrl(result) : result;
	};
	const decompress = function(data){
		if (!window_event_manager.module_is_loaded) {
			return new Promise(async (s, e) => {
				await window_event_manager.moduleLoadedAwaitable();
				s(decompress(data));
			});
		}

		const dtype_is_str = typeof (data) == "string";
		if (dtype_is_str){
			data = Base64.decode(data);
		}

		if (!(data instanceof Uint8Array)) {
			throw TypeError("data must be of type Uint8Array");
		}
		
		if (!context_ptr.dctx){
			loadContextPtr();
		}
		let result = null;

		const data_in_ptr = Module._malloc(data.length);
		let data_in_heap = new Uint8Array(Module.HEAPU8.buffer, data_in_ptr, data.length);
		try{
			data_in_heap.set(data);
			const decompressed_capacity = Module.ZSTD_getFrameContentSize(data_in_heap.byteOffset, data_in_heap.length);
			const data_out_ptr = Module._malloc(decompressed_capacity);
			let data_out_heap = new Uint8Array(Module.HEAPU8.buffer, data_out_ptr, decompressed_capacity);
			if (!data_in_heap.length || !data_in_heap.BYTES_PER_ELEMENT){
				data_in_heap = new Uint8Array(Module.HEAPU8.buffer, data_in_ptr, data.length);
			}			
			try{
				const decompressed_size = Module.ZSTD_decompress(context_ptr.dctx, data_out_heap.byteOffset, data_out_heap.length, data_in_heap.byteOffset, data_in_heap.length);
				const error_code = Module.ZSTD_isError(decompressed_size);
				if (error_code){
					throw new ZSTDError(error_code);
				}

				if (!data_out_heap.length || !data_out_heap.BYTES_PER_ELEMENT){
					// memory growth
					data_in_heap = new Uint8Array(Module.HEAPU8.buffer, data_in_ptr, data.length);
					data_out_heap = new Uint8Array(Module.HEAPU8.buffer, data_out_ptr, decompressed_capacity);
				}

				// copy
				result = new Uint8Array(data_out_heap.subarray(0, decompressed_size));
			}
			finally{
				Module._free(data_out_ptr);
			}
		}
		finally{
			Module._free(data_in_ptr);
		}

		return dtype_is_str ? Utf8.encode(result) : result;
	};

	// default_max_dict_size = 110KiB

	const versionNumber = function () {
		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(version()), true, true);
			});
		}
		return Module.ZSTD_versionNumber();
	};
	const versionString = function(){
		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(version()), true, true);
			});
		}
		return Module.ZSTD_versionString();
	};
	const minCLevel = function () {
		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(minCLevel()), true, true);
			});
		}
		return Module.ZSTD_minCLevel();
	};
	const maxCLevel = function(){
		if (!window_event_manager.module_is_loaded) {			
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(maxCLevel()), true, true);
			});
		}
		return Module.ZSTD_maxCLevel();
	};
	

	const speed = function(level){
		if (!window_event_manager.module_is_loaded) {
			return new Promise(async (s, e) => {
				await window_event_manager.moduleLoadedAwaitable();
				s(speed(level));
			});
		}
		if (typeof (level) != 'number' || !level) {
			level = maxCLevel();
		}

		const ucomp = Utf8.decode(document.body.innerHTML);
		const r = {bytes: ucomp.length};

		
		const c_func = ()=>{
			const b_time = performance.now();	
			for (let iter = 1;; ++iter)
			{
				const c = compress(ucomp, level);
				const e_time = performance.now();
				if (e_time - b_time > 1000){					
					return [c, (e_time - b_time) / iter];
				}
			}
			return [null, 0];
		};
		const c = c_func();
		const d_func = () => {
			const b_time = performance.now();
			for (let iter = 1; ; ++iter) {
				const d = decompress(c[0]);
				const e_time = performance.now();
				if (e_time - b_time > 1000) {
					return [d, (e_time - b_time) / iter];
				}
			}
			return [null, 0];
		};		
		const d = d_func();
		

		if (Utf8.encode(ucomp) != Utf8.encode(d[0])){
			throw Error("failed to obtain correct decompressed outcome");
		}
		
		const c_time = c[1];
		const d_time = d[1];
		r["compress"] = { time: c_time, speed: r.bytes / (c_time * 1.024 * 1024)};
		r["decompress"] = { time: d_time, speed: r.bytes / (d_time * 1.024 * 1024) };
		r["unit"] = {time: 'ms', speed:"MiB/s"};
		r["compressed_bytes"] = c[0].length;
		r["compression_ratio"] = ucomp.length / c[0].length;		
		return r;
	};
	
	const ZStandard = {compress: compress, decompress: decompress, speed: speed};
	Object.defineProperty(ZStandard, 'version_number', { get: versionNumber });
	Object.defineProperty(ZStandard, 'version_string', { get: versionString });
	Object.defineProperty(ZStandard, 'min_compression_level', { get: minCLevel });
	Object.defineProperty(ZStandard, 'max_compression_level', { get: maxCLevel });
	Object.defineProperty(ZStandard, 'default_compression_level', { value: 3, writable: false });
	Object.defineProperty(ZStandard, 'is_async', { get: () => (!window_event_manager.module_is_loaded) });
	Object.defineProperty(ZStandard, 'cctx_size', { get: () => context_ptr.cctx ? Module.ZSTD_sizeof_CCtx(context_ptr.cctx) : 0 });
	Object.defineProperty(ZStandard, 'dctx_size', { get: () => context_ptr.dctx ? Module.ZSTD_sizeof_DCtx(context_ptr.dctx) : 0 });
	Object.freeze(ZStandard);
	Object.defineProperty(window, 'ZStandard', {value: ZStandard, writable: false});
})();

// QRCode
(function () {
	// Low, Medium, Quartile, High
	const ecc_str = "LMQH";

	const byte_sizes = [
		[17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
		[14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
		[11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
		[7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273]
	];

	const default_pixel_per_block = 8;

	const findVersion = function (data_length, ecc) {
		const sizes = byte_sizes[ecc];
		for (let i = 0; i < sizes.length; ++i) {
			if (sizes[i] >= data_length) {
				return i + 1;
			}
		}
		return -1;
	}
	const closestEcc = function (data_length, ecc) {
		switch (typeof (ecc)) {
			case 'string':
				ecc = ecc.length ? ecc_str.indexOf(ecc[0].toUpperCase()) : 3;
			case 'number':
				{
					ecc = ecc < 0 ? 10e6 : ecc;
					ecc = Math.max(0, Math.min(ecc, 3));
					break;
				}
			default:
				ecc = 3;
				break;
		}

		let version = -1;
		while (true) {
			version = findVersion(data_length, ecc);
			if (version > 0) {
				break;
			}
			--ecc;
			if (ecc < 0) {
				return -1;
			}
		}

		return ecc;
	};

	const maxCapacity = function(ecc){
		ecc = closestEcc(0,ecc);
		return byte_sizes[ecc][byte_sizes[ecc].length - 1];
	};

	const qrBits = function (data, ecc) {
		if (typeof (data) == 'string') {
			data = Utf8.decode(data);
		}
		if (!(data instanceof Uint8Array)) {
			throw TypeError("data must be of type Uint8Array");
		}
		ecc = closestEcc(data.length, ecc);
		if (ecc == -1) {
			throw Error("no valid qr code can contain this much bytes");
		}
		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(qrBits(data, ecc)), true, true);
			});
		}

		let result = null;
		const version = findVersion(data.length, ecc); // assured by closestEcc
		const qr_size = version * 4 + 17;

		const data_in_heap = new Uint8Array(Module.HEAPU8.buffer, Module._malloc(data.length), data.length);
		data_in_heap.set(data);

		const data_out_size = Math.ceil((qr_size * qr_size) / 8);
		const data_out_heap = new Uint8Array(Module.HEAPU8.buffer, Module._malloc(data_out_size), data_out_size);
		try {
			const succeeded = Module.qrcode(data_out_heap.byteOffset, data_out_heap.length, data_in_heap.byteOffset, data_in_heap.length, version, ecc);
			if (!succeeded) {
				throw Error("QRCode failed");
			}
			// copy
			result = new Uint8Array(data_out_heap.subarray(0, data_out_heap.length));
		}
		finally {
			Module._free(data_out_heap.byteOffset);
			Module._free(data_in_heap.byteOffset);
		}
		return result;
	};

	const qrToCanvas = function (ctx, data, ecc, fill_style_a, fill_style_b, dx, dy, dWidth, dHeight) {
		if (typeof (data) == 'string') {
			data = Utf8.decode(data);
		}
		if (!(ctx instanceof CanvasRenderingContext2D)) {
			throw TypeError("ctx must be of type CanvasRenderingContext2D");
		}
		if (!(data instanceof Uint8Array)) {
			throw TypeError("data must be of type Uint8Array");
		}
		ecc = closestEcc(data.length, ecc);
		if (ecc == -1) {
			throw Error("no valid qr code can contain this much bytes");
		}
		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(qrToCanvas(ctx, data, ecc, fill_style_a, fill_style_b, dx, dy, dWidth, dHeight)), true, true);
			});
		}

		// canvas draw checks
		const qr_size = findVersion(data.length, ecc) * 4 + 17;
		fill_style_a = fill_style_a ? fill_style_a : 'white';
		fill_style_b = fill_style_b ? fill_style_b : 'black';
		dx = dx ? dx : 0;
		dy = dy ? dy : 0;
		dWidth = dWidth ? Math.max(0, Math.min(dWidth, ctx.canvas.width - dx)) : (ctx.canvas.width - dx);
		dHeight = dHeight ? Math.max(0, Math.min(dHeight, ctx.canvas.height - dy)) : (ctx.canvas.height - dy);
		if (dWidth < qr_size) {
			throw TypeError("width of canvas is too small");
		}
		if (dHeight < qr_size) {
			throw TypeError("height of canvas is too small");
		}

		const pixel_size_block = Math.trunc(Math.min(dWidth, dHeight) / qr_size);
		const margin_left = dx + Math.trunc((dWidth - pixel_size_block * qr_size) / 2);
		const margin_top = dx + Math.trunc((dHeight - pixel_size_block * qr_size) / 2);

		const bits = qrBits(data, ecc);		
		let p = 0;
		for (let y = 0; y < qr_size; ++y) {
			for (let x = 0; x < qr_size; ++x) {
				const fill_style = (bits[Math.trunc(p / 8)] & (1 << (p % 8))) ? fill_style_b : fill_style_a;
				ctx.fillStyle = typeof (fill_style) == 'function' ? fill_style((x + 0.5) / qr_size, (y + 0.5) / qr_size, pixel_size_block) : fill_style;
				ctx.fillRect(margin_left + x * pixel_size_block, margin_top + y * pixel_size_block, pixel_size_block, pixel_size_block);
				++p;
			}
		}
	};

	const qrToDataURL = function (data, ecc, fill_style_a, fill_style_b, width_and_height, image_format) {
		if (typeof (data) == 'string') {
			data = Utf8.decode(data);
		}
		if (typeof(fill_style_a) == "function"){
			throw TypeError("doesn't support callback for fill_style_a, use qrToCanvas instead");
		}
		if (!(data instanceof Uint8Array)) {
			throw TypeError("data must be of type Uint8Array");
		}
		ecc = closestEcc(data.length, ecc);
		if (ecc == -1) {
			throw Error("no valid qr code can contain this much bytes");
		}
		const qr_size = findVersion(data.length, ecc) * 4 + 17;

		fill_style_a = fill_style_a ? fill_style_a : 'white';
		fill_style_b = fill_style_b ? fill_style_b : 'black';
		const ds = width_and_height ? 0 : default_pixel_per_block * 2;
		width_and_height = Math.trunc(width_and_height && typeof (width_and_height) == 'number' ? width_and_height : (qr_size * default_pixel_per_block + ds * 2));
		const dS = width_and_height - 2 * ds;

		if (width_and_height < qr_size) {
			throw TypeError("too small little area to fit qr code");
		}

		if (!window_event_manager.module_is_loaded) {
			return new Promise((s, e) => {
				window_event_manager.addEventListener(window_event_manager.EVENT_MODULE_LOADED, () => s(qrToDataURL(width_and_height, data, ecc, fill_style_a, fill_style_b)), true, true);
			});
		}

		const canvas = document.createElement("canvas");
		canvas.height = width_and_height;
		canvas.width = width_and_height;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = fill_style_a;
		ctx.fillRect(0, 0, width_and_height, width_and_height);
		qrToCanvas(ctx, data, ecc, fill_style_a, fill_style_b, ds, ds, dS, dS);
		return canvas.toDataURL(image_format ? image_format : "image/webp");

	};

	// data formats
	const TOTPtoData = function (account_name, secret, issuer, algorithm, digits, period) {
		if (!(typeof (account_name) == 'string') || !account_name.length) {
			throw TypeError("invalid account name");
		}
		if (!(secret instanceof Uint8Array) || !secret.length) {
			throw TypeError("invalid secret key");
		}
		let str = 'otpauth://totp/';
		str += encodeURIComponent(typeof (issuer) == 'string' ? issuer : "") + ':';
		str += encodeURIComponent(account_name) + '?secret=';
		str += Base32.encode(secret) + "&issuer=";
		str += encodeURIComponent(typeof (issuer) == 'string' ? issuer : "");

		if (algorithm || digits || period) {
			str += "&algorithm=" + (typeof (algorithm) == 'string' && algorithm.length ? algorithm.toUpperCase() : "SHA1");
			str += "&digits=" + String(typeof (digits) == 'number' && digits == 8 ? 8 : 6);
			str += "&period=" + String(typeof (period) == 'number' && period > 0 ? Math.trunc(period) : 30);
		}

		return Utf8.decode(str);
	};
	const URLtoData = function (url) {
		return Utf8.decode(url.startsWith("http") ? url : ("https://" + url));
	};

	
	const QRCode = { maxCapacity: maxCapacity, qrBits: qrBits, qrToCanvas: qrToCanvas, qrToDataURL: qrToDataURL, TOTPtoData: TOTPtoData, URLtoData: URLtoData };
	Object.defineProperty(QRCode, 'max_ecc', { get: () => 3 });
	Object.defineProperty(QRCode, 'is_async', { get: () => (!window_event_manager.module_is_loaded) });
	Object.defineProperty(QRCode, 'blueGradient', {
		writable: false, value: (x, y) => {
			const arr = new Uint8Array(3);
			arr.fill(150 - Math.SQRT2 * Math.hypot(x - 0.5, y - 0.5) * 128);
			arr[2] = 255;
			return '#' + Hex.encode(arr);
		}
	});
	
	Object.freeze(QRCode);
	Object.defineProperty(window, 'QRCode', { value: QRCode, writable: false });

})();


// libsodium
(function(){
	const loaded_ctx = {rc: -2};
	const assertLoaded = ()=>{
		if (loaded_ctx.rc > -2)
		{
			if (loaded_ctx.rc == -1)
			{
				throw new Error("failed to initiate libsodium");
			}
			return;
		}
		loaded_ctx.rc = Module.lsodium_init();
		Object.freeze(loaded_ctx);
	};

	const scrypt = function(password, salt, N, r, p, outLen){
		if (!window_event_manager.module_is_loaded) {
			return new Promise(async (s, e) => {
				await window_event_manager.moduleLoadedAwaitable();
				s(scrypt(password, salt, N, r, p));
			});
		}

		const dtype_is_str = typeof(salt) == "string";
		if (dtype_is_str){
			salt = Utf8.decode(salt);
		}
		if (!(salt instanceof Uint8Array)){
			throw TypeError("salt must be of type Uint8Array");
		}

		if (typeof(password) == "string"){
			password = Utf8.decode(password);
		}
		if (!(password instanceof Uint8Array)){
			throw TypeError("password must be of type Uint8Array");
		}


		outLen = outLen || 32;
		if (!Number.isInteger(outLen) || outLen < 16) {
			throw RangeError("outLen must be an integer >= 16");
		}
		
		assertLoaded();

		if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
			throw TypeError("N, r, p must be integers");
		}
		if (N <= 1 || (N & (N - 1)) !== 0) {
			throw RangeError("N must be a power of 2 greater than 1");
		}
		if (r < 1 || p < 1) {
			throw RangeError("r and p must be >= 1");
		}
		if (r > 0xffffffff || p > 0xffffffff) {
			throw RangeError("r and p must fit in uint32");
		}
		if (N >= 2 ** 53) {
			throw RangeError("N is too large for JS Number");
		}
		if (r * p >= 2 ** 30) {
			throw RangeError("r * p must be < 2^30");
		}

		const bytes = 128 * N * r;
		if (!Number.isSafeInteger(bytes) || bytes > 256 * 1024 * 1024) {
			throw RangeError("scrypt working buffer too large (" + bytes + " bytes)");
		}


		let result = null;

		const passPtr = Module._malloc(password.length);
		const saltPtr = Module._malloc(salt.length);
		const outPtr  = Module._malloc(outLen);
		try {
			new Uint8Array(Module.HEAPU8.buffer, passPtr, password.length).set(password);
			new Uint8Array(Module.HEAPU8.buffer, saltPtr, salt.length).set(salt);
			let data_out_heap = new Uint8Array(Module.HEAPU8.buffer, outPtr, outLen);

			const rc = Module.lsodium_scrypt_ll(
				passPtr, password.length,
				saltPtr, salt.length,
				N, r, p,
				outPtr, outLen
			);
			if (rc !== 0) {
				throw Error("scrypt_ll failed (rc=" + rc + ")");
			}

			result = new Uint8Array(data_out_heap.subarray(0, outLen));		
		} finally {
			Module._free(passPtr);
			Module._free(saltPtr);
			Module._free(outPtr);
		}

		return dtype_is_str ? Base64.encodeUrl(result) : result;
	};


	const LSodium = { scrypt: scrypt };
	
	

	Object.freeze(LSodium);

	Object.defineProperty(window, 'LSodium', {value: LSodium, writable: false});

})();