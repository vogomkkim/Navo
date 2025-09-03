// Jest stub for db.instance to avoid real DB connections in tests
// Provides minimal chainable API used in repositories

type AnyFn = (...args: any[]) => any;

const returning = async (_args?: any) => [
  { id: 'mock-id', htmlContent: '<html></html>' },
];

const whereChain = () => ({
  orderBy: (_arg?: any) => ({
    limit: async (_n?: number) => [],
  }),
});

const fromChain = () => ({
  where: (_arg?: any) => whereChain(),
});

export const db: any = {
  insert: (_table: any) => ({
    values: (_values: any) => ({ returning }),
  }),
  update: (_table: any) => ({
    set: (_set: any) => ({
      where: (_arg?: any) => ({ returning }),
    }),
  }),
  select: (_cols?: any) => ({
    from: (_table: any) => fromChain(),
  }),
};

export const client: any = {};

export default db;
