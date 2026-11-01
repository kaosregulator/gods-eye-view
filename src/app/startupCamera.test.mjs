import test from 'node:test';
import assert from 'node:assert/strict';
import { flyToAustin } from '../camera.js';

test('teardown before the initial camera delay prevents a late flight', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let flights = 0;
  let cancelled = 0;
  const stop = flyToAustin({
    isDestroyed: () => false,
    camera: {
      setView() {},
      flyTo() {
        flights++;
      },
      cancelFlight() {
        cancelled++;
      },
    },
  });
  stop();
  t.mock.timers.tick(1000);
  assert.equal(flights, 0);
  assert.equal(cancelled, 1);
});

test('the app opens over Pueblo unless the build names another home', async () => {
  const { resolveHomeView, homeCityName, HOME_VIEWS } =
    await import('../camera.js');
  assert.equal(resolveHomeView().city, 'pueblo');
  assert.equal(resolveHomeView('Austin').city, 'austin');
  assert.equal(resolveHomeView('atlantis').city, 'pueblo');
  assert.equal(homeCityName(HOME_VIEWS.pueblo), 'Pueblo');
});
