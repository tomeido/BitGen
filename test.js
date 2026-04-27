const fs = require('fs');
const crypto = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');

// Use regex to find the script block containing privateKeyToWIF
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = '';

while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1].includes('function privateKeyToWIF')) {
    scriptContent = match[1];
    break;
  }
}

global.CryptoJS = {
  lib: {
    WordArray: {
      create: function(bytes) {
        return { sigBytes: bytes.length, words: bytes };
      }
    }
  },
  SHA256: function(wa) {
    const bytes = wa.words;
    const hash = crypto.createHash('sha256').update(new Uint8Array(bytes)).digest();
    return {
      toString: function() {
        return hash.toString('hex');
      }
    };
  },
  enc: {
    Hex: 'hex'
  }
};

global.window = { addEventListener: () => {} };
global.document = { getElementById: () => ({ addEventListener: () => {} }), querySelectorAll: () => [] };
global.navigator = {};
global.QRCode = function() {};
global.ethers = { Mnemonic: { fromEntropy: () => ({ phrase: "test" }) }, Wallet: function() {} };
global.BigInt = BigInt;

const testLogic = `
  console.log("Running tests...");
  let failed = 0;

  // Test Case 1: valid private key -> valid WIF
  const hexKey = "0C28FCA386C7A227600B2FE50B7CAE11EC86D3BF1FBE471BE89827E19D72AA1D";
  const privKeyBytes = hexToBytes(hexKey);
  const expectedWIF = "KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617";
  const actualWIF = privateKeyToWIF(privKeyBytes);

  if (actualWIF !== expectedWIF) {
    console.error(\`Test 1 failed! Expected \${expectedWIF}, but got \${actualWIF}\`);
    failed++;
  } else {
    console.log("✅ privateKeyToWIF: correctly generates expected WIF");
  }

  // Test Case 2: all zeros key (edge case)
  const zeroKey = "0000000000000000000000000000000000000000000000000000000000000000";
  const expectedZeroWIF = "KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73Nd2Mcv1";
  const actualZeroWIF = privateKeyToWIF(hexToBytes(zeroKey));

  if (actualZeroWIF !== expectedZeroWIF) {
    console.error(\`Test 2 failed! Expected \${expectedZeroWIF}, got \${actualZeroWIF}\`);
    failed++;
  } else {
    console.log("✅ privateKeyToWIF: handles all zeros edge case");
  }

  // Test Case 3: all ones key (edge case)
  const onesKey = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
  const expectedOnesWIF = "L5oLkpV3aqBjhki6LmvChTCq73v9gyymzzMpBbhDLjDpKCuAXpsi";
  const actualOnesWIF = privateKeyToWIF(hexToBytes(onesKey));

  if (actualOnesWIF !== expectedOnesWIF) {
    console.error(\`Test 3 failed! Expected \${expectedOnesWIF}, got \${actualOnesWIF}\`);
    failed++;
  } else {
    console.log("✅ privateKeyToWIF: handles all FFs edge case");
  }

  if (failed > 0) {
    throw new Error(\`\${failed} tests failed!\`);
  }
`;

const fullScript = scriptContent + "\n\n" + testLogic;

try {
  eval(fullScript);
  console.log("All tests passed.");
} catch (e) {
  console.error("Error evaluating script:", e);
  process.exit(1);
}
