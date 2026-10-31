import { ReadOnlySqlError, validateReadOnlySelect } from './read-only-select';

describe('validateReadOnlySelect', () => {
  const engines: Array<'mysql' | 'postgres'> = ['mysql', 'postgres'];

  it.each(engines)('accepts a plain SELECT and strips the trailing ; (%s)', (e) => {
    expect(validateReadOnlySelect('SELECT * FROM a;  ', e)).toEqual({
      sql: 'SELECT * FROM a',
      hasLimit: false,
    });
  });

  it.each(engines)('detects an explicit LIMIT (%s)', (e) => {
    expect(validateReadOnlySelect('SELECT * FROM a LIMIT 5', e).hasLimit).toBe(true);
  });

  it.each(engines)('does not mistake a subquery LIMIT for a top-level one (%s)', (e) => {
    expect(
      validateReadOnlySelect('SELECT * FROM (SELECT * FROM a LIMIT 3) t', e).hasLimit,
    ).toBe(false);
  });

  it.each(engines)('accepts SELECT CTEs and UNION (%s)', (e) => {
    expect(() => validateReadOnlySelect('WITH x AS (SELECT 1) SELECT * FROM x', e)).not.toThrow();
    expect(() => validateReadOnlySelect('SELECT 1 UNION SELECT 2', e)).not.toThrow();
  });

  it.each(engines)('rejects multiple statements (%s)', (e) => {
    expect(() => validateReadOnlySelect('SELECT 1; DROP TABLE a', e)).toThrow(ReadOnlySqlError);
  });

  it.each(engines)('rejects non-SELECT statements (%s)', (e) => {
    for (const sql of ['DELETE FROM a', 'UPDATE a SET x = 1', 'DROP TABLE a', "INSERT INTO a VALUES (1)"]) {
      expect(() => validateReadOnlySelect(sql, e)).toThrow(ReadOnlySqlError);
    }
  });

  it.each(engines)('rejects SELECT ... INTO (%s)', (e) => {
    expect(() => validateReadOnlySelect('SELECT * INTO x FROM a', e)).toThrow(ReadOnlySqlError);
  });

  it.each(engines)('rejects data-modifying CTEs (%s)', (e) => {
    expect(() =>
      validateReadOnlySelect('WITH x AS (DELETE FROM a RETURNING *) SELECT * FROM x', e),
    ).toThrow(ReadOnlySqlError);
  });

  it('rejects locking clauses and OUTFILE in MySQL', () => {
    expect(() => validateReadOnlySelect('SELECT * FROM a FOR UPDATE', 'mysql')).toThrow(ReadOnlySqlError);
    expect(() => validateReadOnlySelect('SELECT * FROM a LOCK IN SHARE MODE', 'mysql')).toThrow(ReadOnlySqlError);
    expect(() => validateReadOnlySelect("SELECT * FROM a INTO OUTFILE '/tmp/x'", 'mysql')).toThrow(ReadOnlySqlError);
  });

  it.each(engines)('rejects empty input (%s)', (e) => {
    expect(() => validateReadOnlySelect('  ;  ', e)).toThrow(ReadOnlySqlError);
  });
});
