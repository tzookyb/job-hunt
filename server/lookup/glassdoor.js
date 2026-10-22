// The company's Glassdoor page, found through a site: search.
import { searchFor } from './search.js';

const GLASSDOOR = /https?:\/\/(?:www\.)?glassdoor\.[a-z.]+\/(?:Overview|Reviews|Salary|Salaries|Interview|Benefits|Photos|Jobs)\/[^/"'&\s<>?#]+/gi;

export const pickGlassdoor = key => text => {
  for (const [url] of text.matchAll(GLASSDOOR)) if (url.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key.slice(0, 5))) return url;
  return '';
};

export const findGlassdoor = (get, name, key) => searchFor(get, `${name} site:glassdoor.com`, pickGlassdoor(key));
