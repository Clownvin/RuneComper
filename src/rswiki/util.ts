import {loadWikiPage} from '.';
// NOTE: Obtained from the "Nothing interesting happens" wiki page
const DEFAULT_IMAGE =
  '/images/thumb/Weird_gloop_detail.png/69px-Weird_gloop_detail.png';

export async function getImageFromPage(page: string | cheerio.Root) {
  const $ = typeof page === 'string' ? await loadWikiPage(`${page}`) : page;
  const image =
    // Quest info image
    $('td.infobox-image img').attr()?.src ??
    // Miniquest requirements floating icon
    $('table.questdetails tbody tr td div.floatright a.image img').attr()
      ?.src ??
    // Skill (or other) floating image at start of main text
    $('div.mw-body-content div.floatleft a.image img').attr()?.src ??
    // Or the default image
    DEFAULT_IMAGE;
  return `https://runescape.wiki${image.split('?').shift()}`;
}
