import TestSuite from './TestSuite';
import MemoryProvider from './MemoryProvider';

const provider = new MemoryProvider({});
TestSuite('Memory Provider', provider, provider.purge.bind(provider));