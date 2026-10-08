import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIntentInstruction, classifyAgentIntent, filterToolDeclarations, isToolAllowed } from './intent-router.js';

test('software-only requests do not receive browser tools', () => {
  const intent = classifyAgentIntent('Crie um dashboard financeiro com filtros e formulários interativos.');
  assert.equal(intent.mode, 'app_creation');
  assert.equal(isToolAllowed(intent, 'file_write'), true);
  assert.equal(isToolAllowed(intent, 'browser_navigate'), false);
});

test('browser-only requests do not receive WebDev file-write tools', () => {
  const intent = classifyAgentIntent('Acesse https://example.com no navegador do agente e leia a página.');
  assert.equal(intent.mode, 'cloud_computer');
  assert.equal(isToolAllowed(intent, 'browser_navigate'), true);
  assert.equal(isToolAllowed(intent, 'file_write'), false);
});

test('explicit combined browser and code work receives both tool families in one turn', () => {
  const intent = classifyAgentIntent('Edite o código do projeto e use o navegador do agente para abrir https://example.com e corrigir a interface conforme a referência.');
  assert.equal(intent.mode, 'integrated');
  assert.equal(intent.taskMode, 'edit_existing');
  assert.equal(isToolAllowed(intent, 'browser_navigate'), true);
  assert.equal(isToolAllowed(intent, 'file_read'), true);
  assert.equal(isToolAllowed(intent, 'file_write'), true);

  const instruction = buildIntentInstruction(intent);
  assert.match(instruction, /INTEGRATED/);
  assert.doesNotMatch(instruction, /aguarde nova mensagem|somente uma chamada/i);
});

test('agent-browser live-streaming and code complaint routes to integrated tools', () => {
  const intent = classifyAgentIntent('O navegador do agente tem erros; enquanto navega, o agente precisa gerar código e chamar o MCP WebDev, com a tela ao vivo em streaming.');
  assert.equal(intent.mode, 'integrated');
  assert.equal(isToolAllowed(intent, 'browser_navigate'), true);
  assert.equal(isToolAllowed(intent, 'file_write'), true);
  assert.equal(isToolAllowed(intent, 'bash_exec'), true);
});

test('tool declaration filtering follows the classified mixed scope', () => {
  const declarations = [
    { name: 'browser_navigate' },
    { name: 'file_write' },
    { name: 'file_delete' }
  ];
  const intent = classifyAgentIntent('Edite o código e acesse https://example.com no navegador do agente.');
  const visible = filterToolDeclarations(intent, declarations).map((item: any) => item.name);
  assert.deepEqual(visible.sort(), ['browser_navigate', 'file_write']);
});

test('natural web research stays in the browser research mode', () => {
  const intent = classifyAgentIntent(
    'Estou pensando em instalar energia solar numa casa em São Paulo. Pesquise na web, usando fontes oficiais e confiáveis, quais são as etapas atuais para conectar um sistema residencial à rede elétrica.'
  );
  assert.equal(intent.mode, 'web_research');
  assert.equal(intent.taskMode, 'research');
  assert.equal(isToolAllowed(intent, 'web_search'), true);
  assert.equal(isToolAllowed(intent, 'browser_navigate'), true);
  assert.equal(isToolAllowed(intent, 'file_write'), false);
});

test('explicit terminal requests stay in the computer execution mode', () => {
  const intent = classifyAgentIntent('Execute no terminal `printf "Hello World"` e mostre o resultado.');
  assert.equal(intent.mode, 'cloud_computer');
  assert.equal(intent.taskMode, 'computer_action');
  assert.equal(isToolAllowed(intent, 'bash_exec'), true);
  assert.equal(isToolAllowed(intent, 'file_write'), false);
});
