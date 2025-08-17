#!/usr/bin/env node

/**
 * SuperCode Validator for n8n
 * Validates JavaScript code for n8n SuperCode nodes before deployment
 * Ensures 100% compatibility with the n8n execution environment
 *
 * Usage:
 *   node validate-supercode.js <code-file.js> [--data input-data.json]
 *   node validate-supercode.js test.js --data sample-input.json
 *   echo "const data = \$input.first().json; return data;" | node validate-supercode.js -
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createContext, runInContext } = vm;

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
};

// All libraries available in SuperCode node
const availableLibraries = {
	// Core utilities
	_: require('lodash'),
	lodash: require('lodash'),

	// HTTP & Web
	axios: (() => {
		try {
			return require('axios');
		} catch {
			return undefined;
		}
	})(),
	cheerio: require('cheerio'),

	// Date/Time
	dayjs: require('dayjs'),
	moment: require('moment-timezone'),
	dateFns: require('date-fns'),
	dateFnsTz: require('date-fns-tz'),

	// Validation & Data
	joi: require('joi'),
	Joi: require('joi'),
	validator: require('validator'),
	uuid: require('uuid'),
	Ajv: require('ajv'),
	yup: (() => {
		try {
			return require('yup');
		} catch {
			return undefined;
		}
	})(),

	// Parsing & Processing
	csvParse: require('csv-parse'),
	xml2js: require('xml2js'),
	XMLParser: require('fast-xml-parser').XMLParser,
	YAML: require('yaml'),
	papaparse: require('papaparse'),
	Papa: require('papaparse'),

	// Templating
	Handlebars: require('handlebars'),

	// Security & Crypto
	CryptoJS: require('crypto-js'),
	forge: (() => {
		try {
			return require('node-forge');
		} catch {
			return undefined;
		}
	})(),
	jwt: require('jsonwebtoken'),
	bcrypt: require('bcryptjs'),
	bcryptjs: require('bcryptjs'),

	// Files & Documents
	XLSX: require('xlsx'),
	pdfLib: (() => {
		try {
			return require('pdf-lib');
		} catch {
			return undefined;
		}
	})(),
	archiver: (() => {
		try {
			return require('archiver');
		} catch {
			return undefined;
		}
	})(),

	// Images & Media
	Jimp: (() => {
		try {
			return require('jimp');
		} catch {
			return undefined;
		}
	})(),
	QRCode: require('qrcode'),

	// Math & Science
	math: (() => {
		try {
			return require('mathjs');
		} catch {
			return undefined;
		}
	})(),
	mathjs: (() => {
		try {
			return require('mathjs');
		} catch {
			return undefined;
		}
	})(),

	// Text & Language
	fuzzy: require('fuse.js'),
	stringSimilarity: require('string-similarity'),
	slug: require('slug'),
	pluralize: require('pluralize'),

	// HTTP/API utilities
	qs: require('qs'),
	FormData: require('form-data'),

	// File formats
	ini: require('ini'),
	toml: require('toml'),

	// Utilities
	nanoid: require('nanoid').nanoid,
	ms: (() => {
		try {
			return require('ms');
		} catch {
			return undefined;
		}
	})(),
	bytes: require('bytes'),

	// Financial & Geographic
	currency: require('currency.js'),
	phoneNumber: require('libphonenumber-js'),
	iban: require('iban'),

	// Blockchain (optional)
	ethers: (() => {
		try {
			return require('ethers');
		} catch {
			return undefined;
		}
	})(),
	web3: (() => {
		try {
			return require('web3');
		} catch {
			return undefined;
		}
	})(),
};

// Validation result structure
class ValidationResult {
	constructor() {
		this.success = true;
		this.errors = [];
		this.warnings = [];
		this.info = [];
		this.output = null;
		this.performance = {};
		this.librariesUsed = new Set();
		this.returnFormat = null;
	}

	addError(message, details = null) {
		this.success = false;
		this.errors.push({ message, details });
	}

	addWarning(message, details = null) {
		this.warnings.push({ message, details });
	}

	addInfo(message, details = null) {
		this.info.push({ message, details });
	}
}

// Create n8n-like sandbox environment
function createSandbox(inputData = null, validationResult) {
	// Default test data if none provided
	const defaultData = {
		customers: [
			{ name: 'John Doe', email: 'john@example.com', value: 100 },
			{ name: 'Jane Smith', email: 'jane@example.com', value: 200 },
		],
		message: 'Test data for validation',
	};

	const testData = inputData || defaultData;
	const items = Array.isArray(testData) ? testData : [{ json: testData }];

	// Create utils object similar to SuperCode node
	const utils = {
		memoryUsage: () => {
			const usage = process.memoryUsage();
			return {
				heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
				heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
				external: `${Math.round(usage.external / 1024 / 1024)} MB`,
				rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
			};
		},
		cleanup: (libs) => {
			validationResult.addInfo(`cleanup() called for: ${libs.join(', ')}`);
			return { cleaned: libs.length };
		},
		formatDate: (date) => new Date(date).toISOString(),
		isEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
		retry: async (fn, options = {}) => fn(),
		getAvailableLibraries: () => Object.keys(availableLibraries),
		sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
	};

	// Create sandbox with n8n globals
	const sandbox = {
		// $input object as in n8n
		$input: {
			all: () => items,
			first: () => items[0],
			last: () => items[items.length - 1],
			json: items.length === 1 ? items[0].json : items.map((item) => item.json),
		},

		// $workflow mock
		$workflow: {
			name: 'Validation Test Workflow',
			id: 'test-workflow-123',
		},

		// $node mock
		$node: {
			name: 'Super Code',
			type: 'superCodeNodeVmSafe',
		},

		// All libraries
		...availableLibraries,

		// Utilities
		utils,

		// Console with tracking
		console: {
			log: (...args) => {
				console.log(`${colors.cyan}[Code Output]${colors.reset}`, ...args);
				validationResult.addInfo('Console.log used', args);
			},
			error: (...args) => {
				console.error(`${colors.red}[Code Error]${colors.reset}`, ...args);
				validationResult.addWarning('Console.error used', args);
			},
			warn: (...args) => {
				console.warn(`${colors.yellow}[Code Warning]${colors.reset}`, ...args);
				validationResult.addWarning('Console.warn used', args);
			},
		},

		// JavaScript built-ins
		setTimeout,
		clearTimeout,
		setInterval,
		clearInterval,
		Promise,
		JSON,
		Date,
		Math,
		Object,
		Array,
		String,
		Number,
		Boolean,
		RegExp,
		Error,
		Buffer,
	};

	// Track library usage
	const handler = {
		get(target, prop) {
			if (
				availableLibraries[prop] &&
				!['console', 'utils', '$input', '$workflow', '$node'].includes(prop)
			) {
				validationResult.librariesUsed.add(prop);
			}
			return target[prop];
		},
	};

	return new Proxy(sandbox, handler);
}

// Validate code structure and patterns
function validateCodeStructure(code, result) {
	// Check for common anti-patterns
	const antiPatterns = [
		{
			pattern: /^[\s;]*\(function\s*\(\s*\)\s*{/,
			message: 'Code wrapped in IIFE - write direct code without function wrappers',
			severity: 'error',
		},
		{
			pattern: /require\s*\(/g,
			message: 'Uses require() - libraries are pre-loaded as globals',
			severity: 'error',
		},
		{
			pattern: /import\s+.+\s+from/g,
			message: 'Uses import statements - libraries are pre-loaded as globals',
			severity: 'error',
		},
		{
			pattern: /return\s+\[\s*{\s*json\s*:/g,
			message: 'Returns [{ json: }] wrapper - should return data directly',
			severity: 'error',
		},
		{
			pattern: /eval\s*\(/g,
			message: 'Uses eval() - security risk',
			severity: 'error',
		},
		{
			pattern: /new Function\s*\(/g,
			message: 'Uses Function constructor - security risk',
			severity: 'error',
		},
		{
			pattern: /process\.(exit|env|cwd)/g,
			message: 'Accesses process object - not available in sandbox',
			severity: 'error',
		},
		{
			pattern: /fs\.(readFile|writeFile|readdir)/g,
			message: 'Attempts file system access - not available in sandbox',
			severity: 'error',
		},
		{
			pattern: /child_process/g,
			message: 'Attempts to use child_process - not available in sandbox',
			severity: 'error',
		},
		{
			pattern: /\$input\.(first|all|last|json)/g,
			message: 'Correctly uses $input for data access',
			severity: 'info',
			positive: true,
		},
		{
			pattern: /const\s+data\s*=\s*\$input\.first\(\)\.json/g,
			message: 'Follows recommended pattern for getting input data',
			severity: 'info',
			positive: true,
		},
	];

	for (const antiPattern of antiPatterns) {
		const matches = code.match(antiPattern.pattern);
		if (matches) {
			if (antiPattern.positive) {
				result.addInfo(antiPattern.message, `Found ${matches.length} occurrence(s)`);
			} else if (antiPattern.severity === 'error') {
				result.addError(antiPattern.message, `Found: ${matches.join(', ')}`);
			} else {
				result.addWarning(antiPattern.message, `Found: ${matches.join(', ')}`);
			}
		}
	}

	// Check if code uses $input at all
	if (!code.includes('$input')) {
		result.addWarning('Code does not use $input - may not be processing workflow data');
	}

	// Check for return statement
	if (!code.includes('return')) {
		result.addError('Code does not return any data');
	}

	// Check for try-catch wrapping entire code
	const entireCodeInTryCatch = /^\s*try\s*{[\s\S]*}\s*catch[\s\S]*}\s*$/;
	if (entireCodeInTryCatch.test(code.trim())) {
		result.addWarning('Entire code wrapped in try-catch - node handles errors automatically');
	}

	// Check for sample data generation
	const sampleDataPatterns = [
		/for\s*\([^)]*\)\s*{\s*[^}]*push\s*\(\s*{[^}]*}\s*\)/,
		/const\s+sampleData\s*=\s*\[/,
		/const\s+testData\s*=\s*\[/,
		/Math\.random\(\)/,
	];

	let generatesSampleData = false;
	for (const pattern of sampleDataPatterns) {
		if (pattern.test(code) && !code.includes('$input')) {
			generatesSampleData = true;
			break;
		}
	}

	if (generatesSampleData) {
		result.addWarning('Code appears to generate sample data instead of processing $input');
	}
}

// Validate the return value format
function validateReturnValue(returnValue, result) {
	if (returnValue === undefined) {
		result.addError('Code returns undefined - must return data');
		return;
	}

	// Check if it's wrapped in [{ json: }] format (wrong)
	if (
		Array.isArray(returnValue) &&
		returnValue.length === 1 &&
		returnValue[0].json !== undefined &&
		Object.keys(returnValue[0]).length === 1
	) {
		result.addError('Return value uses [{ json: data }] format - should return data directly');
		result.returnFormat = 'wrapped';
	} else {
		result.returnFormat = 'direct';
		result.addInfo('Return format is correct (direct return)');
	}

	// Validate data structure
	if (returnValue === null) {
		result.addWarning('Returns null - consider returning empty object or array');
	} else if (typeof returnValue === 'object') {
		result.addInfo(
			`Returns ${Array.isArray(returnValue) ? 'array' : 'object'} with ${Object.keys(returnValue).length} keys`,
		);
	} else {
		result.addWarning(`Returns primitive type: ${typeof returnValue}`);
	}
}

// Execute and validate the code
async function validateCode(code, inputData, options = {}) {
	const result = new ValidationResult();

	console.log(
		`\n${colors.bright}${colors.blue}═══ SuperCode Validator for n8n ═══${colors.reset}\n`,
	);

	// Step 1: Validate code structure
	console.log(`${colors.yellow}▶ Validating code structure...${colors.reset}`);
	validateCodeStructure(code, result);

	// Step 2: Prepare execution environment
	console.log(`${colors.yellow}▶ Creating n8n sandbox environment...${colors.reset}`);
	const sandbox = createSandbox(inputData, result);
	const context = createContext(sandbox);

	// Step 3: Wrap code for execution
	const wrappedCode = `
		(async function() {
			const executionStartTime = Date.now();
			let operationCount = 0;
			const maxOperations = 100000;

			const checkTimeout = () => {
				operationCount++;
				if (operationCount > maxOperations) {
					throw new Error('Possible infinite loop detected (>100k operations)');
				}
				if (Date.now() - executionStartTime > 30000) {
					throw new Error('Code execution timeout (30s limit)');
				}
			};

			try {
				${code}
			} catch (_error) {
				throw _error;
			}
		})();
	`;

	// Step 4: Execute the code
	console.log(`${colors.yellow}▶ Executing code in sandbox...${colors.reset}`);
	const startTime = Date.now();

	try {
		const output = await runInContext(wrappedCode, context, {
			timeout: 30000,
			breakOnSigint: true,
		});

		const executionTime = Date.now() - startTime;
		result.performance.executionTime = `${executionTime}ms`;
		result.output = output;

		console.log(`${colors.green}✓ Code executed successfully in ${executionTime}ms${colors.reset}`);

		// Step 5: Validate output
		console.log(`${colors.yellow}▶ Validating output format...${colors.reset}`);
		validateReturnValue(output, result);
	} catch (error) {
		result.addError(`Execution failed: ${error.message}`, error.stack);
	}

	// Step 6: Check memory usage
	const memUsage = process.memoryUsage();
	result.performance.memoryUsed = `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`;

	return result;
}

// Format and display results
function displayResults(result, options = {}) {
	console.log(`\n${colors.bright}${colors.cyan}═══ Validation Results ═══${colors.reset}\n`);

	// Overall status
	if (result.success) {
		console.log(
			`${colors.bright}${colors.green}✅ PASSED - Code is ready for n8n!${colors.reset}\n`,
		);
	} else {
		console.log(
			`${colors.bright}${colors.red}❌ FAILED - Code needs fixes before using in n8n${colors.reset}\n`,
		);
	}

	// Errors
	if (result.errors.length > 0) {
		console.log(`${colors.red}${colors.bright}Errors (${result.errors.length}):${colors.reset}`);
		result.errors.forEach((error) => {
			console.log(`  ${colors.red}✗${colors.reset} ${error.message}`);
			if (error.details && !options.quiet) {
				console.log(`    ${colors.bright}Details:${colors.reset} ${error.details}`);
			}
		});
		console.log();
	}

	// Warnings
	if (result.warnings.length > 0) {
		console.log(
			`${colors.yellow}${colors.bright}Warnings (${result.warnings.length}):${colors.reset}`,
		);
		result.warnings.forEach((warning) => {
			console.log(`  ${colors.yellow}⚠${colors.reset} ${warning.message}`);
			if (warning.details && !options.quiet) {
				console.log(`    ${colors.bright}Details:${colors.reset} ${warning.details}`);
			}
		});
		console.log();
	}

	// Info
	if (result.info.length > 0 && !options.quiet) {
		console.log(`${colors.blue}${colors.bright}Info (${result.info.length}):${colors.reset}`);
		result.info.forEach((info) => {
			console.log(`  ${colors.blue}ℹ${colors.reset} ${info.message}`);
			if (info.details) {
				console.log(`    ${colors.bright}Details:${colors.reset} ${info.details}`);
			}
		});
		console.log();
	}

	// Performance & Libraries
	console.log(`${colors.magenta}${colors.bright}Execution Stats:${colors.reset}`);
	console.log(`  Execution Time: ${result.performance.executionTime || 'N/A'}`);
	console.log(`  Memory Used: ${result.performance.memoryUsed || 'N/A'}`);
	console.log(
		`  Libraries Used: ${result.librariesUsed.size > 0 ? Array.from(result.librariesUsed).join(', ') : 'None detected'}`,
	);
	console.log(`  Return Format: ${result.returnFormat || 'N/A'}`);

	// Output preview
	if (result.output !== null && result.output !== undefined) {
		console.log(`\n${colors.cyan}${colors.bright}Output Preview:${colors.reset}`);
		const preview = JSON.stringify(result.output, null, 2);
		const lines = preview.split('\n');
		const maxLines = 10;

		if (lines.length <= maxLines) {
			console.log(preview);
		} else {
			console.log(lines.slice(0, maxLines).join('\n'));
			console.log(`... (${lines.length - maxLines} more lines)`);
		}
	}

	// Recommendations
	if (!result.success) {
		console.log(`\n${colors.yellow}${colors.bright}Recommendations:${colors.reset}`);
		console.log('1. Ensure code starts with: const data = $input.first().json;');
		console.log('2. Return data directly without [{ json: }] wrapper');
		console.log("3. Don't use require() or import - libraries are pre-loaded");
		console.log('4. Remove try-catch wrapping entire code - node handles errors');
		console.log("5. Process actual workflow data, don't generate sample data");
	}

	console.log(`\n${colors.bright}${colors.blue}═════════════════════════${colors.reset}\n`);
}

// Main CLI interface
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
		console.log(`
${colors.bright}SuperCode Validator for n8n${colors.reset}

Validates JavaScript code for n8n SuperCode nodes before deployment.

${colors.bright}Usage:${colors.reset}
  node validate-supercode.js <code-file.js> [options]
  node validate-supercode.js - [options]              # Read from stdin

${colors.bright}Options:${colors.reset}
  --data <file.json>    Input data file to test with
  --quiet, -q           Show only errors and warnings
  --json                Output results as JSON
  --help, -h            Show this help message

${colors.bright}Examples:${colors.reset}
  node validate-supercode.js my-code.js
  node validate-supercode.js my-code.js --data input.json
  cat code.js | node validate-supercode.js -
  echo "return {test: 'data'};" | node validate-supercode.js -

${colors.bright}Exit Codes:${colors.reset}
  0 - Validation passed
  1 - Validation failed
  2 - File not found or other error
		`);
		process.exit(0);
	}

	const options = {
		quiet: args.includes('--quiet') || args.includes('-q'),
		json: args.includes('--json'),
	};

	// Read code
	let code;
	const codeFile = args[0];

	try {
		if (codeFile === '-') {
			// Read from stdin
			code = await new Promise((resolve, reject) => {
				let data = '';
				process.stdin.on('data', (chunk) => (data += chunk));
				process.stdin.on('end', () => resolve(data));
				process.stdin.on('error', reject);
			});
		} else {
			// Read from file
			code = fs.readFileSync(codeFile, 'utf8');
		}
	} catch (error) {
		console.error(`${colors.red}Error reading code file: ${error.message}${colors.reset}`);
		process.exit(2);
	}

	// Read input data if provided
	let inputData = null;
	const dataIndex = args.indexOf('--data');
	if (dataIndex !== -1 && args[dataIndex + 1]) {
		try {
			const dataFile = args[dataIndex + 1];
			const dataContent = fs.readFileSync(dataFile, 'utf8');
			inputData = JSON.parse(dataContent);
		} catch (error) {
			console.error(`${colors.red}Error reading data file: ${error.message}${colors.reset}`);
			process.exit(2);
		}
	}

	// Validate the code
	const result = await validateCode(code, inputData, options);

	// Display results
	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		displayResults(result, options);
	}

	// Exit with appropriate code
	process.exit(result.success ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
	console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
	process.exit(2);
});

// Run if called directly
if (require.main === module) {
	main();
}

// Export for programmatic use
module.exports = { validateCode, ValidationResult };
