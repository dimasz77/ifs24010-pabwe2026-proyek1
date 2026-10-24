import * as matchers from '@testing-library/jest-dom/matchers';

// Daftarkan matcher ke expect global milik runner yang sedang berjalan,
// supaya tetap benar walau ada lebih dari satu salinan vitest di node_modules.
expect.extend(matchers);