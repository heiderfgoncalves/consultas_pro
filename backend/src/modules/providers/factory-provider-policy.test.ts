import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFactoryEndpointAllowed,
  assertFactoryProviderAllowed,
  findFactoryProviderPolicy,
} from './factory-provider-policy';

const sollos = { name: 'Sollos', slug: 'sollos' };
const brasilCred = { name: 'Brasil Cred', slug: 'brasil-cred' };

const SOLLOS_BASE = 'https://api.sollosconsultas.com.br';
const BC_BASE = 'https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1';

test('preserva a trava original da Sollos', () => {
  const policy = assertFactoryProviderAllowed(sollos);
  assert.equal(policy.slug, 'sollos');

  // O unico destino aceito continua sendo a homologacao.
  assertFactoryEndpointAllowed(policy, SOLLOS_BASE, '/json/homologa.aspx');

  // Producao da Sollos permanece bloqueada.
  assert.throws(
    () => assertFactoryEndpointAllowed(policy, SOLLOS_BASE, '/json/consulta.aspx'),
    /somente a homologação da Sollos/,
  );
  // Host de terceiro permanece bloqueado.
  assert.throws(
    () =>
      assertFactoryEndpointAllowed(
        policy,
        'https://api.exemplo.com.br',
        '/json/homologa.aspx',
      ),
    /somente a homologação da Sollos/,
  );
  // HTTP puro permanece bloqueado.
  assert.throws(
    () =>
      assertFactoryEndpointAllowed(
        policy,
        'http://api.sollosconsultas.com.br',
        '/json/homologa.aspx',
      ),
    /somente a homologação da Sollos/,
  );
});

test('habilita a Brasil Cred apenas no Radar PRONAMPE', () => {
  const policy = assertFactoryProviderAllowed(brasilCred);
  assert.equal(policy.slug, 'brasil-cred');
  assert.equal(policy.async, true);

  assertFactoryEndpointAllowed(policy, BC_BASE, '/consult/radar-pronampe');

  // Outros produtos da mesma API continuam fora da Fabrica.
  assert.throws(
    () => assertFactoryEndpointAllowed(policy, BC_BASE, '/consult/credit/pf'),
    /somente o Radar PRONAMPE/,
  );
  // Um provedor nao pode usar o destino do outro.
  assert.throws(
    () => assertFactoryEndpointAllowed(policy, SOLLOS_BASE, '/json/homologa.aspx'),
    /somente o Radar PRONAMPE/,
  );
});

test('recusa provedor fora da allowlist', () => {
  assert.equal(findFactoryProviderPolicy({ name: 'EHM', slug: 'ehm' }), null);
  assert.throws(
    () => assertFactoryProviderAllowed({ name: 'EHM', slug: 'ehm' }),
    /não está habilitada para o provedor EHM/,
  );
});
