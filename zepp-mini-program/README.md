# Zepp Health Extractor (Watch App)

This directory contains the Zepp OS Mini Program code that runs on the smartwatch and the companion smartphone.

## Architecture

1.  **Device App (`page/index.js`):** Runs on the smartwatch. It requests permissions and reads live sensor data (PAI, Sleep, HeartRate). When the user opens the app or clicks "Sync", it sends this payload to the smartphone.
2.  **Side Service (`app-side/index.js`):** Runs invisibly inside the Zepp App on the smartphone. It listens for the `SYNC_HEALTH_DATA` event from the watch and uses the `fetch()` API to HTTP POST the data to the Oracle Cloud Server.

## How to Build & Install

Make sure you have Node.js installed, then run:

```bash
cd zepp-mini-program
npm install
npm run build
```

After building, use the **Zepp OS Developer Bridge** or the `zeus` CLI to install the `.zab` package onto your physical Zepp smartwatch or the Zepp OS Simulator.

```bash
npx zeus preview
```
*(This will generate a QR code you can scan with the Zepp App on your phone to instantly install it on your connected watch!)*
