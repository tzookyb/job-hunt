# Job Hunt

A local, spreadsheet-like tracker for job applications and interviews. It runs in a browser tab and saves every
edit to a JSON file on your machine. No accounts, no cloud, no dependencies.

## Run

You need [Node.js](https://nodejs.org) 18 or newer.

```sh
npm start
```

Then open http://localhost:4317. To use another port: `PORT=5000 npm start`.

## Where is my data?

- Everything is saved to `data.json` in this folder (created on your first edit). The server prints its path when
  it starts.
- `data.backup.json` holds the previous save, as a safety net.
- To move the app to another machine, copy the folder, data included.

If the top-right corner says **"No server — saving in this browser only"**, the page isn't talking to the server
(it was opened as a file, or the server isn't running). Start it and open http://localhost:4317.

### Why a server?

Browsers don't let a web page write files to your disk. The server's only job is to receive your data and write
`data.json`; everything else happens in the page.
