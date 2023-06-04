import {isNullish} from './helpers';
import {upperFirst} from './string';

export function formatQuery<T extends object>(query: T) {
  const pairs: string[] = [];
  for (const key in query) {
    pairs.push(`${key}=${encodeURI('' + query[key])}`);
  }
  if (pairs.length === 0) {
    return '';
  }
  return '?' + pairs.join('&');
}

export class URLBuilder {
  constructor(private page = 'https://') {}

  add(part: string) {
    return new URLBuilder(`${this.page}${part}`);
  }

  build(query?: object): string;
  build(page: string, query?: object): string;
  build(queryOrPage?: object | string, query?: object): string {
    if (isNullish(queryOrPage)) {
      return this.page;
    }
    if (typeof queryOrPage === 'string') {
      return `${this.page}${queryOrPage}${formatQuery(query || {})}`;
    }
    return `${this.page}${formatQuery(queryOrPage)}`;
  }
}
