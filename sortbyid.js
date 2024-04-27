import matched from './matched.json' assert { type: 'json' };
import fs from 'fs/promises';

// Path: sortbyid.js
// sort json by id and save it to a file
const sorted = matched.sort((a, b) => a.id - b.id);
await fs.writeFile('sorted.json', JSON.stringify(sorted, null, 2));
