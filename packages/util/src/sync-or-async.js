import isPromise from 'is-promise';

/* eslint-disable prefer-arrow-callback */

export function syncOrAsync(valueOrPromise, func) {
  if (isPromise(valueOrPromise)) {
    return valueOrPromise.then(function (value) {
      return func(value);
    });
  }
  return func(valueOrPromise);
}

export function forEachSyncOrAsync(iterable, func) {
  const iterator = iterable[Symbol.iterator]();

  const iterate = function () {
    const {value, done} = iterator.next();
    if (!done) {
      return syncOrAsync(func(value), function () {
        return iterate();
      });
    }
  };

  return iterate();
}

export function mapSyncOrAsync(iterable, mapper) {
  const results = [];
  return syncOrAsync(
    forEachSyncOrAsync(iterable, function (value) {
      return syncOrAsync(mapper(value), function (result) {
        results.push(result);
      });
    }),
    function () {
      return results;
    }
  );
}

export function reduceSyncOrAsync(iterable, reducer, accumulator) {
  return syncOrAsync(
    forEachSyncOrAsync(iterable, function (value) {
      return syncOrAsync(reducer(accumulator, value), function (result) {
        accumulator = result;
      });
    }),
    function () {
      return accumulator;
    }
  );
}

export function mapObjectSyncOrAsync(object, mapper) {
  const result = {};
  return syncOrAsync(
    forEachSyncOrAsync(Object.entries(object), function ([key, value]) {
      return syncOrAsync(mapper(value), function (value) {
        result[key] = value;
      });
    }),
    function () {
      return result;
    }
  );
}
