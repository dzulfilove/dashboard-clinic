import fs from 'fs';
let code = fs.readFileSync('src/db/connection.ts', 'utf8');

if (!code.includes('getConnection: async ()')) {
  code = code.replace(
    /query: async \(sqlText: string, params: any\[\] = \[\]\): Promise<any> => \{/,
    `getConnection: async () => {
    if (!dbStatusInfo.isVirtual && mysqlPool) {
      return await mysqlPool.getConnection();
    }
    // Dummy connection for virtual mode
    return {
      query: async (sqlText, params) => { return [await db.query(sqlText, params)]; },
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };
  },
  query: async (sqlText: string, params: any[] = []): Promise<any> => {`
  );
  fs.writeFileSync('src/db/connection.ts', code);
}
