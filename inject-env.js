// inject-env.js
const fs = require('fs');

const filePath = './app.js'; // Path to your main JS file

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Define the placeholder and the environment variable name
    const key = 'TURNSTILE_SITEKEY';
    const placeholder = new RegExp(`"%${key}%"`, 'g');
    const value = process.env[key];
    
    if (!value) {
        throw new Error(`Environment variable ${key} is not set!`);
    }

    // Replace the placeholder with the actual value
    content = content.replace(placeholder, `"${value}"`);

    fs.writeFileSync(filePath, content);
    console.log('Successfully injected Turnstile site key into app.js');

} catch (error) {
    console.error('Error injecting environment variables:', error);
    process.exit(1); // Exit with an error code to fail the build
}