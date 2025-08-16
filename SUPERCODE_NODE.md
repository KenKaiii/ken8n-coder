# Ken's Super Code Node for n8n

## Node Details
- **Type**: `@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe`
- **Execution Environment**: JavaScript VM (safe execution)
- **Parameter**: `code` (JavaScript code string)

## Sample Node JSON Structure
```json
{
  "nodes": [
    {
      "parameters": {
        "code": "This is supercode"
      },
      "type": "@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe",
      "typeVersion": 1,
      "position": [1376, 1072],
      "id": "9f6cad11-913f-47dd-b171-9e47994bc065",
      "name": "Super Code"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "06e26b0d7e6948ba12652857e44e214004f1c7520cc3c8bf5c37d4f9af5a6f4f"
  }
}
```

## Available Libraries
The Super Code node has access to these pre-loaded libraries:

### Core Utilities
- **lodash** - Utility functions
- **axios** - HTTP client
- **cheerio** - Server-side jQuery
- **dayjs** - Date manipulation
- **moment** - Date/time library
- **uuid** - UUID generation
- **nanoid** - ID generation
- **bytes** - Byte utilities

### Data Processing & Validation
- **joi/Joi** - Schema validation
- **validator** - String validation
- **Ajv** - JSON schema validator
- **yup** - Schema validation
- **csvParse** - CSV parsing
- **papaparse/Papa** - CSV parser
- **xml2js** - XML parsing
- **XMLParser** - XML utilities
- **YAML** - YAML parsing
- **ini** - INI file parsing
- **toml** - TOML parsing
- **qs** - Query string utilities

### Templating & Text Processing
- **Handlebars** - Template engine
- **stringSimilarity** - String comparison
- **slug** - URL slug generation
- **pluralize** - String pluralization
- **fuzzy** - Fuzzy search

### Cryptography & Security
- **CryptoJS** - Cryptographic functions
- **forge** - Cryptographic toolkit
- **jwt** - JSON Web Tokens
- **bcrypt** - Password hashing
- **bcryptjs** - Password hashing (JS)

### File & Document Processing
- **XLSX** - Excel file processing
- **pdfLib** - PDF manipulation
- **archiver** - Archive creation
- **Jimp** - Image processing
- **QRCode** - QR code generation

### Mathematics & Computation
- **math** - Mathematical operations

### Network & API
- **FormData** - Form data handling
- **phoneNumber** - Phone number utilities
- **iban** - IBAN validation

### Blockchain
- **ethers** - Ethereum library
- **web3** - Web3 utilities

### Media Processing
- **ytdl** - YouTube downloader
- **ffmpeg** - FFmpeg bindings
- **ffmpegStatic** - Static FFmpeg

### Date/Time
- **dateFns** - Date functions
- **dateFnsTz** - Date timezone functions

## Ken8n-Coder Focus
- **Target Models**: GPT-5 and Anthropic (Claude) only
- **Purpose**: Generate JavaScript code for the Super Code node
- **Context**: All code should be compatible with the VM safe environment and available libraries