import MemoryProvider from './MemoryProvider.js';
import TestSuite from './TestSuite.js';

const provider = new MemoryProvider({ name: 'Test', domain: 'vapid.test', database: { type: 'memory' } });
TestSuite('Memory Provider', provider, provider.purge.bind(provider));
