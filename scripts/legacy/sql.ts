/** One cell from a phpMyAdmin `INSERT` value list. */
export type SqlValue = null | string | number;

export type SqlInsert = {
  table: string;
  columns: string[];
  rows: SqlValue[][];
};

/**
 * Reads plain `INSERT INTO \`table\` (cols) VALUES (...),(...);` statements.
 * Strings use MySQL escapes (`\'`, `\\`) and doubled quotes (`''`). Other
 * statements, including `users`, are skipped by the caller.
 */
export function parseInserts(sql: string): SqlInsert[] {
  const text = sql.charCodeAt(0) === 0xfeff ? sql.slice(1) : sql;
  const inserts: SqlInsert[] = [];
  let i = 0;
  while (i < text.length) {
    i = skipTrivia(text, i);
    if (i >= text.length) break;
    const insertAt = matchKeyword(text, i, "insert");
    if (insertAt === null) {
      i = skipStatement(text, i);
      continue;
    }
    const parsed = readInsert(text, insertAt);
    inserts.push(parsed.insert);
    i = parsed.next;
  }
  return inserts;
}

function readInsert(sql: string, i: number): { insert: SqlInsert; next: number } {
  i = expectKeyword(sql, i, "into");
  let table = readIdentifier(sql, i);
  i = skipTrivia(sql, table.next);
  if (sql[i] === ".") {
    table = readIdentifier(sql, i + 1);
    i = table.next;
  } else {
    i = table.next;
  }
  i = skipTrivia(sql, i);
  if (sql[i] !== "(") {
    throw parseError(sql, i, "INSERT is missing a column list");
  }
  const columns = readColumnList(sql, i);
  i = expectKeyword(sql, columns.next, "values");
  const rows: SqlValue[][] = [];
  while (i < sql.length) {
    i = skipTrivia(sql, i);
    if (sql[i] === ";") {
      i += 1;
      break;
    }
    if (sql[i] !== "(") {
      throw parseError(sql, i, "expected a VALUES tuple");
    }
    const tuple = readTuple(sql, i);
    if (tuple.values.length !== columns.names.length) {
      throw parseError(
        sql,
        i,
        `${table.name} row has ${tuple.values.length} values for ${columns.names.length} columns`,
      );
    }
    rows.push(tuple.values);
    i = skipTrivia(sql, tuple.next);
    if (sql[i] === ",") {
      i += 1;
      continue;
    }
    if (sql[i] === ";") {
      i += 1;
      break;
    }
    throw parseError(sql, i, "expected a comma or semicolon after a VALUES tuple");
  }
  return { insert: { table: table.name, columns: columns.names, rows }, next: i };
}

function readColumnList(sql: string, i: number): { names: string[]; next: number } {
  if (sql[i] !== "(") throw parseError(sql, i, "expected a column list");
  i += 1;
  const names: string[] = [];
  while (i < sql.length) {
    i = skipTrivia(sql, i);
    if (sql[i] === ")") return { names, next: i + 1 };
    const ident = readIdentifier(sql, i);
    names.push(ident.name);
    i = skipTrivia(sql, ident.next);
    if (sql[i] === ",") {
      i += 1;
      continue;
    }
    if (sql[i] === ")") return { names, next: i + 1 };
    throw parseError(sql, i, "expected a comma or ) in the column list");
  }
  throw parseError(sql, i, "unclosed column list");
}

function readTuple(sql: string, i: number): { values: SqlValue[]; next: number } {
  if (sql[i] !== "(") throw parseError(sql, i, "expected (");
  i += 1;
  const values: SqlValue[] = [];
  while (i < sql.length) {
    i = skipTrivia(sql, i);
    if (sql[i] === ")") return { values, next: i + 1 };
    const value = readValue(sql, i);
    values.push(value.value);
    i = skipTrivia(sql, value.next);
    if (sql[i] === ",") {
      i += 1;
      continue;
    }
    if (sql[i] === ")") return { values, next: i + 1 };
    throw parseError(sql, i, "expected a comma or ) in a VALUES tuple");
  }
  throw parseError(sql, i, "unclosed VALUES tuple");
}

function readValue(sql: string, i: number): { value: SqlValue; next: number } {
  i = skipTrivia(sql, i);
  if (sql[i] === "'") return readString(sql, i);
  const nullAt = matchKeyword(sql, i, "null");
  if (nullAt !== null) return { value: null, next: nullAt };
  const number = /^-?(?:\d+(?:\.\d+)?|\.\d+)/.exec(sql.slice(i));
  if (number) return { value: Number(number[0]), next: i + number[0].length };
  throw parseError(sql, i, "expected a string, number, or NULL");
}

function readString(sql: string, i: number): { value: string; next: number } {
  if (sql[i] !== "'") throw parseError(sql, i, "expected a string");
  i += 1;
  let value = "";
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "\\") {
      const escaped = sql[i + 1];
      if (escaped === undefined) throw parseError(sql, i, "string ends in a backslash");
      value += MYSQL_ESCAPES[escaped] ?? escaped;
      i += 2;
      continue;
    }
    if (ch === "'") {
      if (sql[i + 1] === "'") {
        value += "'";
        i += 2;
        continue;
      }
      return { value, next: i + 1 };
    }
    value += ch;
    i += 1;
  }
  throw parseError(sql, i, "unclosed string");
}

const MYSQL_ESCAPES: Record<string, string> = {
  "0": "\0",
  b: "\b",
  n: "\n",
  r: "\r",
  t: "\t",
  Z: "\u001a",
  "\\": "\\",
  "'": "'",
  '"': '"',
};

function readIdentifier(sql: string, i: number): { name: string; next: number } {
  i = skipTrivia(sql, i);
  if (sql[i] === "`") {
    let name = "";
    i += 1;
    while (i < sql.length) {
      if (sql[i] === "`" && sql[i + 1] === "`") {
        name += "`";
        i += 2;
        continue;
      }
      if (sql[i] === "`") return { name, next: i + 1 };
      name += sql[i];
      i += 1;
    }
    throw parseError(sql, i, "unclosed identifier");
  }
  const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(i));
  if (!ident) throw parseError(sql, i, "expected an identifier");
  return { name: ident[0], next: i + ident[0].length };
}

function expectKeyword(sql: string, i: number, word: string): number {
  i = skipTrivia(sql, i);
  const next = matchKeyword(sql, i, word);
  if (next === null) throw parseError(sql, i, `expected ${word.toUpperCase()}`);
  return next;
}

function matchKeyword(sql: string, i: number, word: string): number | null {
  if (sql.slice(i, i + word.length).toLowerCase() !== word) return null;
  const after = sql[i + word.length];
  if (after !== undefined && /[A-Za-z0-9_]/.test(after)) return null;
  return i + word.length;
}

function skipTrivia(sql: string, i: number): number {
  while (i < sql.length) {
    const ch = sql[i];
    if (ch !== undefined && /\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (sql.startsWith("--", i) || ch === "#") {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) throw parseError(sql, i, "unclosed comment");
      i = end + 2;
      continue;
    }
    break;
  }
  return i;
}

function skipStatement(sql: string, i: number): number {
  let inString = false;
  while (i < sql.length) {
    if (!inString && (sql.startsWith("--", i) || sql[i] === "#")) {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (!inString && sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    const ch = sql[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "'" && sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") inString = false;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      i += 1;
      continue;
    }
    if (ch === ";") return i + 1;
    i += 1;
  }
  return i;
}

function parseError(sql: string, index: number, message: string): Error {
  let line = 1;
  for (let i = 0; i < index && i < sql.length; i += 1) {
    if (sql[i] === "\n") line += 1;
  }
  return new Error(`SQL line ${line}: ${message}`);
}
