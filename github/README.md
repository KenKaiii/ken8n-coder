# ken8n-coder GitHub Action

A GitHub Action that integrates [ken8n-coder](https://github.com/kenkaiii/ken8n-coder) directly into your GitHub workflow.

Mention `/ken8n-coder` in your comment, and ken8n-coder will execute tasks within your GitHub Actions runner.

## Features

#### Explain issues

Leave the following comment on a GitHub issue. `ken8n-coder` will read the entire thread, including all comments, and reply with a clear explanation.

```
/ken8n-coder explain this issue
```

#### Fix issues

Leave the following comment on a GitHub issue. ken8n-coder will create a new branch, implement the changes, and open a PR with the changes.

```
/ken8n-coder fix this
```

#### Review PRs and make changes

Leave the following comment on a GitHub PR. ken8n-coder will implement the requested change and commit it to the same PR.

```
Delete the attachment from S3 when the note is removed /oc
```

## Installation

### Step 1: Install ken8n-coder

First, install ken8n-coder globally via npm:

```bash
# Install globally via npm (works on Windows, Mac, and Linux)
npm i -g ken8n-coder@latest
```

### Step 2: Set up GitHub Integration

Run the following command in the terminal from your GitHub repo:

```bash
ken8n-coder github install
```

This will walk you through installing the GitHub app, creating the workflow, and setting up secrets.

### Manual Setup

1. Install the GitHub app https://github.com/apps/opencode-agent. Make sure it is installed on the target repository.
2. Add the following workflow file to `.github/workflows/ken8n-coder.yml` in your repo. Set the appropriate `model` and required API keys in `env`.

   ```yml
   name: ken8n-coder

   on:
     issue_comment:
       types: [created]

   jobs:
     ken8n-coder:
       if: |
         contains(github.event.comment.body, '/oc') ||
         contains(github.event.comment.body, '/ken8n-coder')
       runs-on: ubuntu-latest
       permissions:
         id-token: write
       steps:
         - name: Checkout repository
           uses: actions/checkout@v4
           with:
             fetch-depth: 1

         - name: Install ken8n-coder
           run: npm i -g ken8n-coder@latest

         - name: Run ken8n-coder
           env:
             ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
           run: ken8n-coder github run --model anthropic/claude-sonnet-4-20250514
   ```

3. Store the API keys in secrets. In your organization or project **settings**, expand **Secrets and variables** on the left and select **Actions**. Add the required API keys.

## Support

This is an early release. If you encounter issues or have feedback, please create an issue at https://github.com/kenkaiii/ken8n-coder/issues.

## Development

To test locally:

1. Navigate to a test repo (e.g. `hello-world`):

   ```bash
   cd hello-world
   ```

2. Run:

   ```bash
   MODEL=anthropic/claude-sonnet-4-20250514 \
     ANTHROPIC_API_KEY=sk-ant-api03-1234567890 \
     GITHUB_RUN_ID=dummy \
     bun /path/to/ken8n-coder/packages/ken8n-coder/src/index.ts github run \
     --token 'github_pat_1234567890' \
     --event '{"eventName":"issue_comment",...}'
   ```

   - `MODEL`: The model used by ken8n-coder. Same as the `MODEL` defined in the GitHub workflow.
   - `ANTHROPIC_API_KEY`: Your model provider API key. Same as the keys defined in the GitHub workflow.
   - `GITHUB_RUN_ID`: Dummy value to emulate GitHub action environment.
   - `/path/to/ken8n-coder`: Path to your cloned ken8n-coder repo. `bun /path/to/ken8n-coder/packages/ken8n-coder/src/index.ts` runs your local version of `ken8n-coder`.
   - `--token`: A GitHub personal access token. This token is used to verify you have `admin` or `write` access to the test repo. Generate a token [here](https://github.com/settings/personal-access-tokens).
   - `--event`: Mock GitHub event payload (see templates below).

### Issue comment event

```
--event '{"eventName":"issue_comment","repo":{"owner":"sst","repo":"hello-world"},"actor":"fwang","payload":{"issue":{"number":4},"comment":{"id":1,"body":"hey opencode, summarize thread"}}}'
```

Replace:

- `"owner":"sst"` with repo owner
- `"repo":"hello-world"` with repo name
- `"actor":"fwang"` with the GitHub username of commentor
- `"number":4` with the GitHub issue id
- `"body":"hey opencode, summarize thread"` with comment body

### Issue comment with image attachment.

```
--event '{"eventName":"issue_comment","repo":{"owner":"sst","repo":"hello-world"},"actor":"fwang","payload":{"issue":{"number":4},"comment":{"id":1,"body":"hey opencode, what is in my image ![Image](https://github.com/user-attachments/assets/xxxxxxxx)"}}}'
```

Replace the image URL `https://github.com/user-attachments/assets/xxxxxxxx` with a valid GitHub attachment (you can generate one by commenting with an image in any issue).

### PR comment event

```
--event '{"eventName":"issue_comment","repo":{"owner":"sst","repo":"hello-world"},"actor":"fwang","payload":{"issue":{"number":4,"pull_request":{}},"comment":{"id":1,"body":"hey opencode, summarize thread"}}}'
```
