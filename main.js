"use strict";

// deps

	// natives
	const { join } = require("node:path");
	const { exec } = require("node:child_process");
	const { EOL } = require("node:os");
	const { readFile, writeFile } = require("node:fs/promises");

// consts

	const CANCEL_ADDRESS = "127.0.0.1";
	const HOSTS_FILE = join("C:", "Windows", "System32", "drivers", "etc", "hosts");
	const BASIC_HOSTS_FILE = join(__dirname, "basic_hostsfile.txt");

	const hosts = require(join(__dirname, "hosts.js"));

// private

	function _nslookup (host) {

		return new Promise((resolve, reject) => {

			exec("nslookup " + host, (err, stdout) => {

				if (err) {
					reject(err);
				}
				else {

					const result = {
						"host": host
					};

					try {

						const lines = stdout.trim().replace(/\r\n/g, "\n").split("\n").filter((line) => {
							return "" !== line.trim();
						});

						let lastKey = "";

						lines.forEach((line) => {

							if (line.includes("DNS request timed out") || line.includes("timeout was")) { // not reachable
								return;
							}

							if (line === line.trim()) {

								const [ key, value ] = line.split(": ").map((s) => {
									return s.trim();
								});

								lastKey = key;

								result[key] = value;

							}
							else if ("string" === typeof result[lastKey]) {
								result[lastKey] = [ result[lastKey], line.trim() ];
							}
							else {
								result[lastKey].push(line.trim());
							}

						});

					}
					catch (e) {
						console.log(stdout);
						console.error(e);
					}

					return resolve(result);

				}

			});

		}).then((data) => {

			let aliases = [];
			if (data.Aliases) {
				aliases = ("string" === typeof data.Aliases ? [ data.Aliases ] : data.Aliases);
			}

			let addresses = [];
			if (data.Addresses) {
				addresses = ("string" === typeof data.Addresses ? [ data.Addresses ] : data.Addresses);
			}

			return {
				"host": data.host,
				"name": data.Nom ? data.Nom : "",
				"server": {
					"name": data.Serveur ? data.Serveur : "",
					"address": data.Address ? data.Address : "",
				},
				"aliases": aliases,
				"addresses": addresses
			};

		});

	}

// module

console.log("host file", HOSTS_FILE);
console.log("registered hosts", hosts);

Promise.all([
	...hosts,
	...hosts.map((h) => {
		return "www." + h
	})
].map(async (h) => {
	return await _nslookup(h);
})).then((data) => {

	let text = "";

	data.forEach((lu) => {

		lu.aliases.forEach((alias) => {

			if (alias.startsWith("www.")) {
				alias = alias.substring(4, alias.length);
			}

			if (!hosts.includes(alias)) {
				console.log("FORGOTTEN (ALIAS)", alias);
			}

		});

		if (lu.name) {
			text += "# " + lu.name + EOL;
		}

		if (lu.host) {
			text += CANCEL_ADDRESS + "   " + lu.host + EOL;
		}
		else {
			console.log("WTF ??");
		}

		text += EOL;

	});

	return readFile(BASIC_HOSTS_FILE, "utf-8").then((content) => {
		return writeFile(HOSTS_FILE, content + text, "utf-8");
	});

}).catch((err) => {

	console.error(err);

	process.exitCode = 1;
	process.exit(1);

});
