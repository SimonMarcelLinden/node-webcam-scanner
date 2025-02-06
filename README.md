# open-webcam-scanner

Scans the web for open "IP Webcams".
You need NodeJS v~10. https://nodejs.org/en/

## Setup in command line

```sh
npm install
npm start <IP-ADDRESS> <SUBNET-MASK>
```

Example:

```sh
npm start 192.168.1.0 255.255.255.0
```

If no IP address and subnet mask are provided, the scanner will search the entire public IP range.

## Logging

-   All scan activities are logged in `log.txt`.
-   Found IP webcams are saved in `found.txt`.

## Visit for results

Visit: [http://localhost:1337/](http://localhost:1337/)
