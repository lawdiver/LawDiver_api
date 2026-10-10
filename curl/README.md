# cURL / shell recipes

Language-agnostic HTTP against `https://lawdiver.com/api/v1`.

On Windows, use [Git Bash](https://git-scm.com/), WSL, or translate the calls to PowerShell `Invoke-RestMethod`.

```bash
export LAWDIVER_API_KEY=ld_live_xxxxxxxxxxxxxxxxxxxx
bash curl/examples.sh          # discovery + usage + search + cite + retrieve
bash curl/examples.sh search
bash curl/examples.sh cite
bash curl/examples.sh pdf 2812209 windsor.pdf
bash curl/examples.sh document ./brief.pdf
bash curl/examples.sh bulk       # upload a small file, poll, print one result
# Optional: email results link (set EMAILS=a@x.com,b@y.com)
# EMAILS=partner@firm.com,associate@firm.com bash curl/examples.sh document-email ./brief.pdf
```

See also PowerShell one-liners in the root README quickstart section and the official docs at https://lawdiver.com/docs/api.
