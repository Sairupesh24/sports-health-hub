const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const userInputs = [];
    for await (const line of rl) {
        try {
            const obj = JSON.parse(line);
            if (obj.type === 'USER_INPUT') {
                userInputs.push(obj);
            }
        } catch (e) {}
    }

    console.log("Found", userInputs.length, "USER_INPUT steps:");
    // Print last 10
    const last10 = userInputs.slice(-10);
    last10.forEach((ui, idx) => {
        console.log(`\n--- [${ui.step_index}] ${ui.created_at} ---`);
        console.log(ui.content);
    });
}
run();
