import { describe, expect, it } from 'vitest';

import { parseLocalList, toggledLocalList } from './local-list';

describe('the saved list as this browser stores it', () => {
  it.each<[string, string | null, string[]]>([
    ['nothing stored', null, []],
    ['a corrupt value', '{not json', []],
    ['a value that is not a list', '{"ids":["a"]}', []],
    ['a list with something other than ids in it', '["a", 3, null, "b"]', ['a', 'b']],
    ['a list of ids, in the order they were saved', '["b","a"]', ['b', 'a']],
  ])('reads %s', (_label, raw, expected) => {
    expect(parseLocalList(raw)).toEqual(expected);
  });

  it.each<[string, string[], string, string[]]>([
    ['saves a product at the end', ['a'], 'b', ['a', 'b']],
    ['unsaves a product already there', ['a', 'b'], 'a', ['b']],
  ])('%s', (_label, ids, productId, expected) => {
    expect(toggledLocalList(ids, productId)).toEqual(expected);
  });
});
