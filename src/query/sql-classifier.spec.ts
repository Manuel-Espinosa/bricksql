import { classifySelectShape } from './sql-classifier';

describe('classifySelectShape', () => {
  const engines: Array<'mysql' | 'postgres'> = ['mysql', 'postgres'];

  it.each(engines)('accepts a plain single-table SELECT (%s)', (engine) => {
    const shape = classifySelectShape('SELECT id, name FROM users', engine);
    expect(shape.editable).toBe(true);
    if (shape.editable) {
      expect(shape.baseTable).toBe('users');
      expect(shape.hasStar).toBe(false);
      expect(shape.columns).toEqual([
        { sourceColumn: 'id', isComputed: false },
        { sourceColumn: 'name', isComputed: false },
      ]);
    }
  });

  it.each(engines)('accepts SELECT * as a whole-star result (%s)', (engine) => {
    const shape = classifySelectShape('SELECT * FROM users', engine);
    expect(shape.editable).toBe(true);
    if (shape.editable) {
      expect(shape.hasStar).toBe(true);
      expect(shape.baseTable).toBe('users');
    }
  });

  it.each(engines)(
    'marks aliased/computed columns as computed, not the whole result (%s)',
    (engine) => {
      const shape = classifySelectShape(
        'SELECT id, name AS n, price * qty AS total FROM orders',
        engine,
      );
      expect(shape.editable).toBe(true);
      if (shape.editable) {
        expect(shape.columns).toEqual([
          { sourceColumn: 'id', isComputed: false },
          { sourceColumn: 'name', isComputed: false },
          { sourceColumn: null, isComputed: true },
        ]);
      }
    },
  );

  it.each(engines)('rejects a JOIN (%s)', (engine) => {
    const shape = classifySelectShape(
      'SELECT a.id FROM a JOIN b ON a.id = b.id',
      engine,
    );
    expect(shape.editable).toBe(false);
  });

  it.each(engines)('rejects a subquery in FROM (%s)', (engine) => {
    const shape = classifySelectShape(
      'SELECT id FROM (SELECT id FROM x) t',
      engine,
    );
    expect(shape.editable).toBe(false);
  });

  it.each(engines)('rejects GROUP BY (%s)', (engine) => {
    const shape = classifySelectShape('SELECT id FROM t GROUP BY id', engine);
    expect(shape.editable).toBe(false);
  });

  it.each(engines)('rejects DISTINCT (%s)', (engine) => {
    const shape = classifySelectShape('SELECT DISTINCT id FROM t', engine);
    expect(shape.editable).toBe(false);
  });

  it.each(engines)('rejects an aggregate function (%s)', (engine) => {
    const shape = classifySelectShape('SELECT COUNT(*) FROM t', engine);
    expect(shape.editable).toBe(false);
  });

  it.each(engines)(
    'rejects an aggregate buried inside an expression (%s)',
    (engine) => {
      const shape = classifySelectShape(
        'SELECT SUM(a) + 1 AS x FROM t',
        engine,
      );
      expect(shape.editable).toBe(false);
    },
  );

  it.each(engines)('rejects unparseable SQL (%s)', (engine) => {
    const shape = classifySelectShape('SELECT FROM WHERE', engine);
    expect(shape.editable).toBe(false);
  });

  it.each(engines)('rejects a non-SELECT statement (%s)', (engine) => {
    const shape = classifySelectShape(
      'UPDATE t SET a = 1 WHERE id = 1',
      engine,
    );
    expect(shape.editable).toBe(false);
  });

  it('resolves the base table ignoring an alias (mysql)', () => {
    const shape = classifySelectShape('SELECT id FROM users u', 'mysql');
    expect(shape.editable).toBe(true);
    if (shape.editable) expect(shape.baseTable).toBe('users');
  });

  it('resolves the base table ignoring schema qualification (postgres)', () => {
    const shape = classifySelectShape(
      'SELECT id FROM public.users',
      'postgres',
    );
    expect(shape.editable).toBe(true);
    if (shape.editable) expect(shape.baseTable).toBe('users');
  });
});
