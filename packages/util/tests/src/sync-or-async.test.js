import {
  syncOrAsync,
  forEachSyncOrAsync,
  mapSyncOrAsync,
  reduceSyncOrAsync,
  mapObjectSyncOrAsync
} from '../../..';

describe('Sync or async', () => {
  test('syncOrAsync()', async () => {
    const syncFunc = () => 'a';
    let result = syncOrAsync(syncFunc(), result => result + 'b');
    expect(result).toBe('ab');

    const asyncFunc = () => new Promise(resolve => setTimeout(() => resolve('a'), 5));
    result = await syncOrAsync(asyncFunc(), result => result + 'b');
    expect(result).toBe('ab');

    const asyncFunc2 = () => syncOrAsync(asyncFunc(), result => result + 'b');
    result = await syncOrAsync(asyncFunc2(), result => result + 'c');
    expect(result).toBe('abc');

    const asyncFunc3 = () =>
      syncOrAsync(
        asyncFunc2(),
        result => new Promise(resolve => setTimeout(() => resolve(result + 'c'), 5))
      );
    result = await syncOrAsync(asyncFunc3(), result => result + 'd');
    expect(result).toBe('abcd');
  });

  test('forEachSyncOrAsync()', async () => {
    let results = [];
    forEachSyncOrAsync([1, 2, 3], value => {
      results.push(value * 2);
    });
    expect(results).toEqual([2, 4, 6]);

    results = [];
    await forEachSyncOrAsync([1, 2, 3], value => {
      if (value === 2) {
        return makePromise(() => {
          results.push(value * 2);
        });
      }
      results.push(value * 2);
    });
    expect(results).toEqual([2, 4, 6]);
  });

  test('mapSyncOrAsync()', async () => {
    let results = mapSyncOrAsync([1, 2, 3], value => value * 2);
    expect(results).toEqual([2, 4, 6]);

    results = await mapSyncOrAsync([1, 2, 3], value => {
      if (value === 2) {
        return makePromise(value * 2);
      }
      return value * 2;
    });
    expect(results).toEqual([2, 4, 6]);
  });

  test('reduceSyncOrAsync()', async () => {
    let results = reduceSyncOrAsync(
      [1, 2, 3],
      (accumulator, currentValue) => [...accumulator, currentValue * 2],
      []
    );
    expect(results).toEqual([2, 4, 6]);

    results = await reduceSyncOrAsync(
      [1, 2, 3],
      (accumulator, currentValue) => {
        if (currentValue === 2) {
          return makePromise([...accumulator, currentValue * 2]);
        }
        return [...accumulator, currentValue * 2];
      },
      []
    );
    expect(results).toEqual([2, 4, 6]);
  });

  test('mapObjectSyncOrAsync()', async () => {
    let results = mapObjectSyncOrAsync({a: 1, b: 2, c: 3}, value => value * 2);
    expect(results).toEqual({a: 2, b: 4, c: 6});

    results = await mapObjectSyncOrAsync({a: 1, b: 2, c: 3}, value => {
      if (value === 2) {
        return makePromise(value * 2);
      }
      return value * 2;
    });
    expect(results).toEqual({a: 2, b: 4, c: 6});
  });
});

function makePromise(value) {
  return new Promise(resolve => {
    setTimeout(() => {
      while (typeof value === 'function') {
        value = value();
      }
      resolve(value);
    }, 5);
  });
}
