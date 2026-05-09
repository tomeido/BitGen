const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

// Mock CryptoJS
const CryptoJS = {
  lib: {
    WordArray: {
      create: (bytes) => ({ bytes })
    }
  },
  SHA256: () => ({}),
  RIPEMD160: () => ({})
};

// Load HTML file
const html = fs.readFileSync('index.html', 'utf8');

// Extract script content
const scriptMatches = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi);
const mainScriptMatch = scriptMatches.find(s => s.includes('function base58Encode'));
const code = mainScriptMatch.replace(/<script\b[^>]*>|<\/script>/gi, '');

// Create a sandbox context
const sandbox = {
  CryptoJS,
  BigInt,
  Uint8Array,
  Array,
  Number,
  parseInt,
  console,
  document: {
    getElementById: () => ({
      classList: { add: () => {}, remove: () => {} },
      style: {}
    }),
    createElement: () => ({ appendChild: () => {} })
  },
  window: {}
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const testCases = [
  {
    name: "Empty input",
    input: [],
    expected: ""
  },
  {
    name: "Single zero byte",
    input: [0],
    expected: "1"
  },
  {
    name: "Multiple leading zeros",
    input: [0, 0, 0, 1],
    expected: "1112"
  },
  {
    name: "Single non-zero byte",
    input: [57],
    expected: "z"
  },
  {
    name: "Two bytes",
    input: [1, 1],
    expected: "5S"
  },
  {
    name: "Large value (4 bytes 0xFF)",
    input: [255, 255, 255, 255],
    expected: "7YXq9G"
  }
];

let passed = 0;
let failed = 0;

console.log("Running tests for base58Encode...");

for (const testCase of testCases) {
  let actual;
  try {
    const input = new Uint8Array(testCase.input);
    actual = sandbox.base58Encode(input);

    assert.strictEqual(actual, testCase.expected);
    console.log(`✅ ${testCase.name} Passed`);
    passed++;
  } catch (err) {
    console.error(`❌ ${testCase.name} Failed:`);
    console.error(`   Expected: "${testCase.expected}"`);
    console.error(`   Actual:   "${actual}"`);
    failed++;
  }
}

console.log("\n--- Test Summary ---");
console.log(`Total:  ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
