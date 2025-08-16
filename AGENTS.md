# ken8n-coder Agent Guidelines

## PRIMARY PURPOSE

Create n8n workflow JSON files with Super Code nodes for automation tasks.

## SUPER CODE NODE ESSENTIALS (CRITICAL)

- **Parameter**: `code` (NOT `jsCode`)
- **Type**: `@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe`
- **VM Environment**: NO require() statements - libraries pre-loaded as globals
- **Memory**: context data persists between node executions in same workflow run

## FILE REQUIREMENTS (CRITICAL)

- **Save to**: `ken8n-workflows/` directory within project
- **Naming**: descriptive-kebab-case.json
- **Security**: Cannot create files outside project directory
- **Format**: Valid n8n workflow JSON with nodes array and connections

## AVAILABLE LIBRARIES (HIGH PRIORITY)

Global libraries in Super Code VM:

```javascript
// Pre-loaded globals (no import/require needed)
;(_(lodash), axios, cheerio, dayjs, uuid, crypto - js, jsonwebtoken, bcrypt)
;(validator, moment, numeral, mysql2, pg, mongodb, redis, nodemailer)
;(puppeteer, playwright, sharp, jimp, pdf - parse, xlsx, xml2js, csv - parse)
;(fs, path, os, util, url, querystring, zlib, stream, events, buffer)
```

## WORKFLOW PATTERNS

- **Trigger Node**: Manual, webhook, cron, or file watcher
- **Super Code Node**: Business logic with pre-loaded libraries
- **Output Node**: HTTP response, file write, email, webhook
- **Node Positioning**: x/y coordinates for visual layout
- **Connections**: Link nodes via outputIndex/inputIndex

## VALIDATION

- Ensure valid JSON structure with nodes/connections arrays
- Verify Super Code uses `code` parameter with global library syntax
- Test workflows are importable in n8n interface
