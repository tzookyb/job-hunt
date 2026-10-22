// Composition root: wire up every feature, load the data, show the first view.
import { load } from './store.js';
import * as router from './router.js';
import * as header from './views/header.js';
import * as fields from './views/fields.js';
import * as sheet from './views/sheet.js';
import * as detail from './views/detail.js';
import * as stageList from './views/stageList.js';
import * as notes from './views/notes.js';
import * as popover from './views/popover.js';
import * as stagesDialog from './views/stagesDialog.js';
import * as addCompany from './views/addCompany.js';
import * as contacts from './views/contacts.js';
import * as logoEditor from './views/logoEditor.js';

[header, fields, sheet, detail, stageList, popover, stagesDialog, addCompany, contacts, logoEditor, notes, router].forEach(m => m.init());
await load();
router.route();
