import { SelectShape } from './sql-classifier';

export interface EditableMeta {
  editable: boolean;
  reason?: string;
  table?: string;
  primaryKey?: string[];
  /** output (driver-returned) column name -> physical column name, for non-PK direct-reference columns */
  editableColumns?: Record<string, string>;
}

/**
 * Combines the SQL-parser-derived shape with driver-reported column origins
 * and live primary-key metadata into the EditableMeta sent to the frontend.
 * `origins` is null for a bare `SELECT *` (every returned column is trivially
 * a direct reference — see sql-classifier's hasStar handling).
 */
export function buildEditableMeta(
  shape: SelectShape,
  columns: string[],
  origins: (string | null)[] | null,
  pkColumns: string[],
): EditableMeta {
  if (!shape.editable) {
    return { editable: false, reason: shape.reason };
  }

  if (pkColumns.length === 0) {
    return { editable: false, reason: 'table has no primary key' };
  }

  const missingPk = pkColumns.filter((pk) => !columns.includes(pk));
  if (missingPk.length > 0) {
    return {
      editable: false,
      reason: `primary key column(s) not included in SELECT: ${missingPk.join(', ')}`,
    };
  }

  if (shape.hasStar) {
    const editableColumns: Record<string, string> = {};
    columns.forEach((c, i) => {
      if (pkColumns.includes(c)) return;
      if (origins && origins[i] !== shape.baseTable) return;
      editableColumns[c] = c;
    });
    return {
      editable: true,
      table: shape.baseTable,
      primaryKey: pkColumns,
      editableColumns,
    };
  }

  if (shape.columns.length !== columns.length) {
    return { editable: false, reason: 'column origin mismatch' };
  }

  if (origins && origins.length === columns.length) {
    for (let i = 0; i < shape.columns.length; i++) {
      const col = shape.columns[i];
      if (!col.isComputed && origins[i] !== shape.baseTable) {
        return { editable: false, reason: 'column origin mismatch' };
      }
    }
  }

  const editableColumns: Record<string, string> = {};
  shape.columns.forEach((col, i) => {
    const outputName = columns[i];
    if (col.isComputed || !col.sourceColumn) return;
    if (pkColumns.includes(outputName)) return;
    editableColumns[outputName] = col.sourceColumn;
  });

  return {
    editable: true,
    table: shape.baseTable,
    primaryKey: pkColumns,
    editableColumns,
  };
}
