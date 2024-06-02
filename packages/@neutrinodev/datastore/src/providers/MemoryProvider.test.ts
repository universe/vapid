import MemoryProvider from './MemoryProvider.js';
import TestSuite from './TestSuite.js';

const provider = new MemoryProvider();
TestSuite('Memory Provider', provider, provider.purge.bind(provider));
