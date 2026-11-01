// Composition root: wire up every feature, load the data, show the first view.
import { load } from './store.js';
import * as router from './router.js';
import * as header from './views/header.js';
import * as fields from './views/fields.js';
import * as sheet from './views/sheet.js';
import * as detail from './views/detail.js';
import * as stageList from './views/stageList.js';
import * as notes from './views/notes.js';
import * as action from './views/action.js';
import * as popover from './views/popover.js';
import * as stagesDialog from './views/stagesDialog.js';
import * as addCompany from './views/addCompany.js';
import * as contacts from './views/contacts.js';
import * as logoEditor from './views/logoEditor.js';
import * as research from './views/research.js';
import * as bookmarks from './views/bookmarks.js';
import * as backupButton from './views/backupButton.js';
import * as cv from './views/cv.js';
import * as cvPreview from './views/cvPreview.js';
import * as deleteDialog from './views/deleteDialog.js';
import * as aiSettings from './views/aiSettings.js';
import * as aiNotes from './views/aiNotes.js';
import * as suggestDialog from './views/suggestDialog.js';

[header, backupButton, fields, sheet, detail, stageList, popover, stagesDialog, addCompany, contacts, logoEditor, research, bookmarks, notes, action, cv, cvPreview, deleteDialog, aiSettings, aiNotes, suggestDialog, router].forEach(m => m.init());
await load();
router.route();
