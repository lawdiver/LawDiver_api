# LawDiver API -- PowerShell recipes (Windows)

Set your key (session-scoped):

```powershell
$env:LAWDIVER_API_KEY = "ld_live_xxxxxxxxxxxxxxxxxxxx"
$Base = "https://lawdiver.com/api/v1"
$Headers = @{
  Authorization = "Bearer $env:LAWDIVER_API_KEY"
  "User-Agent" = "LawDiver-API-Examples/1.0 (+https://github.com/lawdiver/LawDiver_api; powershell)"
}
```

## Discovery (no key)

```powershell
Invoke-RestMethod -Uri $Base | ConvertTo-Json -Depth 6
```

## Usage

```powershell
Invoke-RestMethod -Uri "$Base/usage?days=30" -Headers $Headers | ConvertTo-Json -Depth 6
```

## Case search

```powershell
$body = @{
  query = "qualified immunity excessive force"
  jurisdiction = @{ type = "federal_circuit"; circuit = "11" }
  limit = 5
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri "$Base/search" -Headers $Headers `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

## Cite check

```powershell
$body = @{ citations = @("570 U.S. 744", "999 F.3d 1") } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$Base/citecheck/cite" -Headers $Headers `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

## Retrieve

```powershell
$body = @{ query = "410 U.S. 113" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$Base/cases/retrieve" -Headers $Headers `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

## Download a case PDF

```powershell
Invoke-WebRequest -Uri "$Base/cases/2812209/pdf" -Headers $Headers -OutFile "windsor.pdf"
```

## Bulk upload

Every API call has a time limit. When usage is high, a complex search can time out. Bulk upload attempts each call 3 times and returns one JSON document when the job finishes. When usage is low, calls in the file run in parallel.

```powershell
$body = @{
  requests = @(
    @{ id = "jurisdictions"; method = "GET"; path = "/api/v1/jurisdictions" }
    @{
      id = "search"; method = "POST"; path = "/api/v1/search"
      body = @{ query = "qualified immunity"; jurisdiction = @{ type = "us_supreme_court" }; limit = 3 }
    }
  )
} | ConvertTo-Json -Depth 6

$started = Invoke-RestMethod -Method Post -Uri "$Base/bulk" -Headers $Headers -ContentType "application/json" -Body $body
do {
  Start-Sleep -Seconds 5
  $status = Invoke-RestMethod -Method Get -Uri $started.statusUrl -Headers $Headers
  Write-Host $status.status $status.completedCount "/" $status.requestCount
} while ($status.status -eq "queued" -or $status.status -eq "processing")

# One combined output
Invoke-RestMethod -Method Get -Uri $started.resultUrl -Headers $Headers | ConvertTo-Json -Depth 8
```

## Document cite check upload

```powershell
# Multipart upload (poll for status / report yourself)
$file = "C:\path\to\brief.pdf"
Invoke-RestMethod -Method Post -Uri "$Base/citecheck/document" -Headers $Headers `
  -Form @{ file = Get-Item $file } | ConvertTo-Json -Depth 6
```

```powershell
# Email a secure results-page link when the check finishes (poll/PDF still work)
$file = "C:\path\to\brief.pdf"
Invoke-RestMethod -Method Post -Uri "$Base/citecheck/document" -Headers $Headers `
  -Form @{
    file = Get-Item $file
    delivery = "email_link"
    emails = "partner@firm.com", "associate@firm.com"
  } | ConvertTo-Json -Depth 6
```

Prefer the TypeScript or Python example projects for polling loops and typed clients.
