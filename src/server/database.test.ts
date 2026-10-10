import assert from 'node:assert/strict';
import test from 'node:test';
import { toPostgresPlaceholders } from './database.js';

test('converte apenas placeholders SQL para marcadores PostgreSQL', () => {
  assert.equal(
    toPostgresPlaceholders("SELECT * FROM members WHERE id = ? AND role = '?' AND name = ? -- ?\n/* ? */"),
    "SELECT * FROM members WHERE id = $1 AND role = '?' AND name = $2 -- ?\n/* ? */"
  );
});

test('respeita aspas escapadas e comentários multilinha', () => {
  assert.equal(
    toPostgresPlaceholders("SELECT 'it''s ?' AS literal, \"quoted?\" FROM users WHERE id = ? /* outer ? /* nested ? */ still ? */ AND active = ?"),
    "SELECT 'it''s ?' AS literal, \"quoted?\" FROM users WHERE id = $1 /* outer ? /* nested ? */ still ? */ AND active = $2"
  );
});

test('preserva SQL sem parâmetros', () => {
  assert.equal(toPostgresPlaceholders('SELECT 1 AS ok'), 'SELECT 1 AS ok');
});

test('preserva operadores de existência JSONB do PostgreSQL', () => {
  assert.equal(toPostgresPlaceholders(`SELECT payload_json ? 'key', payload_json ?| array['a'] FROM jobs WHERE job_id = ?`), `SELECT payload_json ? 'key', payload_json ?| array['a'] FROM jobs WHERE job_id = $1`);
});
