import axios from 'axios';
import {UpperFirst, retry, upperFirst} from '../util';
import {URLBuilder} from '../util/url';
import cheerio from 'cheerio';
import {mkdir, readFile, writeFile} from 'fs';
import {promisify} from 'util';
import {Skill} from '../model/runescape';

export type SkillPage<S extends Skill = Skill> = `/w/${UpperFirst<S>}`;

export function getSkillPage<S extends Skill = Skill>(skill: S): SkillPage<S> {
  return `/w/${upperFirst(skill)}` as const;
}

const WIKI_URL = 'https://runescape.wiki' as const;
const CACHE_DIR = './pages/' as const;

export const WIKI_URL_BUILDER = new URLBuilder(WIKI_URL);

export async function loadWikiPage(page: string) {
  let html: string;
  const path = getCachePath(page);
  try {
    html = await getHtmlCached(path);
  } catch {
    html = await getHtmlFromUrl(page);
    await cacheHtml(path, html);
  }
  return cheerio.load(html);
}

function getCachePath(page: string) {
  return `${CACHE_DIR}${formatPagePath(page)}.html`;
}

function formatPagePath(page: string) {
  return page.split('/w/').pop()!.replace(/\//g, '_-_').toLocaleLowerCase();
}

export async function getHtmlFromUrl(page: string) {
  const url = WIKI_URL_BUILDER.build(page);
  const result = await retry(() => axios.get(url));
  return result.data as string;
}

const readAsync = promisify(readFile);

async function getHtmlCached(path: string) {
  const buff = await readAsync(path);
  return buff.toString();
}

const mkdirAsync = promisify(mkdir);
const writeAsync = promisify(writeFile);

async function cacheHtml(path: string, html: string) {
  await mkdirAsync(CACHE_DIR, {recursive: true});
  await writeAsync(path, html);
}
