import TestSuite from './TestSuite';
import MemoryProvider from './MemoryProvider';

const provider = new MemoryProvider({ name: 'Test', domain: 'vapid.test', database: { type: 'memory' } });
TestSuite('Memory Provider', provider, provider.purge.bind(provider));