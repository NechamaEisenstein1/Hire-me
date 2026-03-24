export const environment = {
  production: true,
  apiBaseUrl: '',
  apiRequestTimeoutMs: 30000,
  graphqlUrl: '/graphql',
  wsVisitorsUrl: (() => {
    const protocol = globalThis.location?.protocol === 'https:' ? 'wss' : 'ws';
    const host = globalThis.location?.host ?? 'localhost:8000';
    return `${protocol}://${host}/ws/visitors`;
  })()
};
