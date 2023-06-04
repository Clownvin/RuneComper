import axios from 'axios';
import {retry, upperFirst} from '../util';
import {URLBuilder} from '../util/url';
import cheerio from 'cheerio';

export const WIKI_URL = new URLBuilder('https://runescape.wiki');

function addW(page: string) {
  if (page.startsWith('/w/')) {
    return page;
  }
  if (page.startsWith('/')) {
    return `/w${page}`;
  } else {
    return `/w/${page}`;
  }
}

function formatPage(page: string) {
  return addW(upperFirst(page.toLocaleLowerCase()).replace(/\s/g, '_'));
}

export async function loadWikiPage(page: string) {
  const url = WIKI_URL.build(formatPage(page));
  const result = await retry(() => axios.get(url));
  return cheerio.load(result.data);
}
