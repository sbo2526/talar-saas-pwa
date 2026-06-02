type SqliteValue = string | number | bigint | Uint8Array | null;

type SqliteMasterRow = {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string | null;
};

export type SqliteTableRow = Record<string, SqliteValue>;

type SqliteRecord = {
  rowId: number;
  values: SqliteValue[];
};

const textDecoder = new TextDecoder("utf-8", { fatal: false });

function readUInt16(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUInt32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
  ) >>> 0;
}

function readSignedInteger(bytes: Uint8Array, offset: number, length: number): number | bigint {
  if (length <= 0) {
    return 0;
  }

  let value = BigInt(0);
  for (let index = 0; index < length; index += 1) {
    value = (value << BigInt(8)) + BigInt(bytes[offset + index]);
  }

  const bits = BigInt(length * 8);
  const signBit = BigInt(1) << (bits - BigInt(1));
  if ((value & signBit) !== BigInt(0)) {
    value -= BigInt(1) << bits;
  }

  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  return value >= minSafe && value <= maxSafe ? Number(value) : value;
}

function readFloat64(bytes: Uint8Array, offset: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
  return view.getFloat64(0, false);
}

function readVarint(bytes: Uint8Array, offset: number): { value: number; nextOffset: number } {
  let value = BigInt(0);
  let nextOffset = offset;

  for (let index = 0; index < 9; index += 1) {
    const byte = bytes[nextOffset];
    nextOffset += 1;

    if (index === 8) {
      value = (value << BigInt(8)) | BigInt(byte);
      break;
    }

    value = (value << BigInt(7)) | BigInt(byte & 0x7f);
    if ((byte & 0x80) === 0) {
      break;
    }
  }

  return { value: Number(value), nextOffset };
}

function pageOffset(pageNumber: number, pageSize: number) {
  return (pageNumber - 1) * pageSize;
}

function readPageType(bytes: Uint8Array, pageNumber: number, pageSize: number) {
  const offset = pageOffset(pageNumber, pageSize) + (pageNumber === 1 ? 100 : 0);
  return bytes[offset];
}

function readBtreeHeader(bytes: Uint8Array, pageNumber: number, pageSize: number) {
  const offset = pageOffset(pageNumber, pageSize) + (pageNumber === 1 ? 100 : 0);
  const pageType = bytes[offset];
  const cellCount = readUInt16(bytes, offset + 3);
  const headerSize = pageType === 0x05 ? 12 : 8;
  const rightMostPointer = pageType === 0x05 ? readUInt32(bytes, offset + 8) : null;
  const cellPointerStart = offset + headerSize;
  const cellPointers = Array.from({ length: cellCount }, (_, index) =>
    pageOffset(pageNumber, pageSize) + readUInt16(bytes, cellPointerStart + index * 2),
  );

  return { offset, pageType, cellCount, cellPointers, rightMostPointer };
}

function readRecord(bytes: Uint8Array, payloadOffset: number, payloadLength: number): SqliteValue[] {
  const endOffset = payloadOffset + payloadLength;
  const headerLengthVarint = readVarint(bytes, payloadOffset);
  const headerEndOffset = payloadOffset + headerLengthVarint.value;
  const serialTypes: number[] = [];
  let cursor = headerLengthVarint.nextOffset;

  while (cursor < headerEndOffset) {
    const serialType = readVarint(bytes, cursor);
    serialTypes.push(serialType.value);
    cursor = serialType.nextOffset;
  }

  let valueOffset = headerEndOffset;
  return serialTypes.map((serialType) => {
    if (serialType === 0) {
      return null;
    }
    if (serialType === 1) {
      const value = readSignedInteger(bytes, valueOffset, 1);
      valueOffset += 1;
      return value;
    }
    if (serialType === 2) {
      const value = readSignedInteger(bytes, valueOffset, 2);
      valueOffset += 2;
      return value;
    }
    if (serialType === 3) {
      const value = readSignedInteger(bytes, valueOffset, 3);
      valueOffset += 3;
      return value;
    }
    if (serialType === 4) {
      const value = readSignedInteger(bytes, valueOffset, 4);
      valueOffset += 4;
      return value;
    }
    if (serialType === 5) {
      const value = readSignedInteger(bytes, valueOffset, 6);
      valueOffset += 6;
      return value;
    }
    if (serialType === 6) {
      const value = readSignedInteger(bytes, valueOffset, 8);
      valueOffset += 8;
      return value;
    }
    if (serialType === 7) {
      const value = readFloat64(bytes, valueOffset);
      valueOffset += 8;
      return value;
    }
    if (serialType === 8) {
      return 0;
    }
    if (serialType === 9) {
      return 1;
    }

    if (serialType >= 12) {
      const isText = serialType % 2 === 1;
      const length = isText ? (serialType - 13) / 2 : (serialType - 12) / 2;
      const sliceEnd = Math.min(valueOffset + length, endOffset);
      const slice = bytes.slice(valueOffset, sliceEnd);
      valueOffset += length;
      return isText ? textDecoder.decode(slice) : slice;
    }

    return null;
  });
}

function extractColumnNames(createTableSql: string | null): string[] {
  if (!createTableSql) {
    return [];
  }

  const start = createTableSql.indexOf("(");
  const end = createTableSql.lastIndexOf(")");
  if (start < 0 || end <= start) {
    return [];
  }

  const body = createTableSql.slice(start + 1, end);
  const definitions: string[] = [];
  let current = "";
  let quote: string | null = null;
  let depth = 0;

  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[") {
      quote = "]";
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      definitions.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    definitions.push(current.trim());
  }

  const reserved = new Set([
    "constraint",
    "primary",
    "foreign",
    "unique",
    "check",
    "key",
  ]);

  return definitions
    .map((definition) => definition.replace(/--.*$/gm, "").trim())
    .filter(Boolean)
    .filter((definition) => !reserved.has(definition.split(/\s+/)[0]?.toLowerCase() ?? ""))
    .map((definition) => {
      const match = /^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([^\s]+))/.exec(definition);
      return (match?.[1] ?? match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
    })
    .filter(Boolean);
}

export class SqliteReader {
  private readonly bytes: Uint8Array;
  private readonly pageSize: number;
  private readonly tableCache = new Map<string, SqliteMasterRow>();
  private readonly columnCache = new Map<string, string[]>();

  constructor(bytes: Uint8Array) {
    if (bytes.length < 100 || textDecoder.decode(bytes.slice(0, 16)) !== "SQLite format 3\u0000") {
      throw new Error("INVALID_SQLITE_FILE");
    }

    this.bytes = bytes;
    const declaredPageSize = readUInt16(bytes, 16);
    this.pageSize = declaredPageSize === 1 ? 65536 : declaredPageSize;

    if (!Number.isInteger(this.pageSize) || this.pageSize < 512) {
      throw new Error("INVALID_SQLITE_PAGE_SIZE");
    }
  }

  listTables(): SqliteMasterRow[] {
    return this.readMasterRows().filter((row) => row.type === "table");
  }

  hasTable(tableName: string) {
    return Boolean(this.findTable(tableName));
  }

  readTable(tableName: string): SqliteTableRow[] {
    const table = this.findTable(tableName);
    if (!table) {
      throw new Error(`MISSING_TABLE:${tableName}`);
    }

    const columns = this.getColumns(table);
    const records = this.readTableRecords(table.rootpage);

    return records.map((record) => {
      const row: SqliteTableRow = {};
      columns.forEach((column, index) => {
        const value = record.values[index] ?? null;
        row[column] = value === null && index === 0 && column.toLowerCase() === "id"
          ? record.rowId
          : value;
      });
      return row;
    });
  }

  private readMasterRows(): SqliteMasterRow[] {
    if (this.tableCache.size > 0) {
      return Array.from(this.tableCache.values());
    }

    const records = this.readTableRecords(1);
    const rows = records
      .map((record) => record.values)
      .map((record) => ({
        type: String(record[0] ?? ""),
        name: String(record[1] ?? ""),
        tbl_name: String(record[2] ?? ""),
        rootpage: Number(record[3] ?? 0),
        sql: record[4] === null || record[4] === undefined ? null : String(record[4]),
      }))
      .filter((row) => row.type && row.name && Number.isInteger(row.rootpage));

    rows.forEach((row) => this.tableCache.set(row.name, row));
    return rows;
  }

  private findTable(tableName: string) {
    if (this.tableCache.size === 0) {
      this.readMasterRows();
    }
    return this.tableCache.get(tableName) ?? null;
  }

  private getColumns(table: SqliteMasterRow) {
    const cached = this.columnCache.get(table.name);
    if (cached) {
      return cached;
    }

    const columns = extractColumnNames(table.sql);
    this.columnCache.set(table.name, columns);
    return columns;
  }

  private readTableRecords(rootPage: number): SqliteRecord[] {
    const records: SqliteRecord[] = [];
    const visited = new Set<number>();

    const walk = (pageNumber: number) => {
      if (pageNumber <= 0 || visited.has(pageNumber)) {
        return;
      }
      visited.add(pageNumber);

      const pageType = readPageType(this.bytes, pageNumber, this.pageSize);
      const header = readBtreeHeader(this.bytes, pageNumber, this.pageSize);

      if (pageType === 0x0d) {
        for (const cellOffset of header.cellPointers) {
          const payloadLength = readVarint(this.bytes, cellOffset);
          const rowId = readVarint(this.bytes, payloadLength.nextOffset);
          const payloadOffset = rowId.nextOffset;
          records.push({
            rowId: rowId.value,
            values: readRecord(this.bytes, payloadOffset, payloadLength.value),
          });
        }
        return;
      }

      if (pageType === 0x05) {
        for (const cellOffset of header.cellPointers) {
          const leftChildPage = readUInt32(this.bytes, cellOffset);
          walk(leftChildPage);
        }
        if (header.rightMostPointer) {
          walk(header.rightMostPointer);
        }
        return;
      }

      throw new Error(`UNSUPPORTED_SQLITE_BTREE_PAGE:${pageType}`);
    };

    walk(rootPage);
    return records;
  }
}
