const request = require("request");
const express = require("express");
const { parse } = require("node-html-parser");
const fs = require("fs");
const ipaddr = require("ipaddr.js");

const app = express();

app.use(express.static("public"));

app.get("/", function (req, res) {
	res.sendFile(__dirname + "/index.html");
});

const listener = app.listen(process.env.PORT || 1337, function () {
	console.log(
		"Your app is listening on port http://localhost:" +
			listener.address().port
	);
	fs.appendFileSync(
		"log.txt",
		`Server gestartet auf Port: ${listener.address().port}\n`
	);
});

app.get("/webcamurls", function (req, res) {
	res.send(webcamUrls);
});

let webcamUrls = [];

const BASE_IP = process.argv[2] || "0.0.0.0"; // IP-Adresse als Parameter oder Standardwert
const SUBNET_MASK = process.argv[3] || "0.0.0.0"; // Subnetzmaske als Parameter oder Standardwert

function getIpRange(baseIp, subnetMask) {
	if (baseIp === "0.0.0.0" || subnetMask === "0.0.0.0") {
		return { startIp: "1.0.0.0", endIp: "223.255.255.255" }; // Gesamter öffentlicher Bereich
	}
	const network = ipaddr.IPv4.parse(baseIp);
	const mask = ipaddr.IPv4.parse(subnetMask);
	const networkAddress = network
		.toByteArray()
		.map((byte, i) => byte & mask.toByteArray()[i]);
	const broadcastAddress = networkAddress.map(
		(byte, i) => byte | (~mask.toByteArray()[i] & 0xff)
	);

	const startIp = networkAddress;
	startIp[3] += 1; // Erste nutzbare Adresse
	const endIp = broadcastAddress;
	endIp[3] -= 1; // Letzte nutzbare Adresse

	return { startIp: startIp.join("."), endIp: endIp.join(".") };
}

const { startIp, endIp } = getIpRange(BASE_IP, SUBNET_MASK);
const [start1, start2, start3, start4] = startIp.split(".").map(Number);
const [end1, end2, end3, end4] = endIp.split(".").map(Number);

async function startScanner() {
	console.log("Scan gestartet");
	fs.appendFileSync("log.txt", "Scan gestartet\n");
	webcamUrls = [];

	for (let oct1 = start1; oct1 <= end1; oct1++) {
		for (let oct2 = start2; oct2 <= end2; oct2++) {
			for (let oct3 = start3; oct3 <= end3; oct3++) {
				for (let oct4 = start4; oct4 <= end4; oct4++) {
					const ip = `${oct1}.${oct2}.${oct3}.${oct4}`;

					await checkConnection(ip, 80);
					await checkConnection(ip, 8080);
					await checkConnection(ip, 8081);
				}
			}
		}
	}
	setTimeout(startScanner, 120 * 60 * 1000);
}
startScanner();

function checkConnection(ip, port) {
	return new Promise((resolve, reject) => {
		const url = `http://${ip}:${port}/`;
		request({ url: url, timeout: 1500 }, (error, response) => {
			if (
				error ||
				!response ||
				response.statusCode < 200 ||
				response.statusCode >= 300
			) {
				fs.appendFileSync(
					"log.txt",
					`Fehlgeschlagene Verbindung zu: ${url}\n`
				);
				return resolve();
			}

			const document = parse(response.body);
			const output = [
				`IP: ${ip}, Port: ${port}`,
				`Webserver gefunden: ${url}`,
				`Server-Header: ${response.headers.server || "keine Angabe"}`,
			];
			const title = document.querySelector("title");
			if (title) output.push(`Title: ${title.text}`);

			let passwordInputPosition = document.innerHTML
				.toLowerCase()
				.indexOf('type="password"');
			if (passwordInputPosition < 0) {
				passwordInputPosition = document.innerHTML
					.toLowerCase()
					.indexOf("type='password'");
			}
			output.push(
				`Login: ${passwordInputPosition >= 0 ? "true" : "noauth"}`
			);

			const logEntry = output.join(", ");
			console.log(logEntry);
			fs.appendFileSync("log.txt", logEntry + "\n");

			if (
				(response.headers.server || "")
					.toLowerCase()
					.includes("ip webcam")
			) {
				const videoUrl = `http://${ip}:${port}/video`;
				console.log(`>>> IP Webcam gefunden: ${videoUrl}`);
				fs.appendFileSync(
					"log.txt",
					`IP Webcam gefunden: ${videoUrl}\n`
				);
				fs.appendFileSync("found.txt", videoUrl + "\n");
				webcamUrls.push(videoUrl);
			}
			resolve();
		});
	});
}
