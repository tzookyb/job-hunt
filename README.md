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

All your personal data lives in the `user-data/` folder, separate from the app code (and ignored by git):

- `user-data/data.json` is your database, created on your first edit. The server prints its path when it starts.
- `user-data/data.backup.json` holds the previous save, as a safety net.
- `user-data/backups/` holds automatic backups: when you use the app and the newest backup is more than 6 hours old, a new
  `auto-<date>.json` is made. Backups older than 7 days are deleted. Nothing happens while you're not using the
  app, and other files you put there are never touched. The ⤓ button makes one right away.
- To move your data to another machine, copy `user-data/`. To give the app to someone else, copy the folder
  without it; they start with an empty tracker. To keep the data somewhere else: `DATA_DIR=/path/to/folder npm start`.

If the top-right corner says **"No server — saving in this browser only"**, the page isn't talking to the server
(it was opened as a file, or the server isn't running). Start it and open http://localhost:4317.

### Why a server?

Browsers don't let a web page write files to your disk. The server's only job is to receive your data and write
`data.json`; everything else happens in the page.
