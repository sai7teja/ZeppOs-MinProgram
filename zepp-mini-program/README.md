# Zepp OS Mini Program (Coming Soon)

This directory will contain the source code for the Zepp OS smartwatch application.

It consists of two main parts:
1.  **Device App (app.js):** Runs on the watch, uses `@zos/sensor` to collect PAI, Sleep, and Workout data, and uses `@zos/ble` (Messaging API) to send it to the phone.
2.  **Side Service (app-side/index.js):** Runs in the Zepp App on the smartphone. It receives data from the watch and uses the `fetch()` API to HTTP POST the data to the Oracle Cloud receiver URL.
