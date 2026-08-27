function Invoke-ListShadowAIWebUsage {
    <#
    .FUNCTIONALITY
        Entrypoint
    .ROLE
        Tenant.Standards.Read
    .DESCRIPTION
        Reports known AI web usage from Microsoft Defender for Endpoint
        DeviceNetworkEvents through the Microsoft Graph security hunting API.
        This uses endpoint telemetry available with Microsoft Defender for Business
        (included in Microsoft 365 Business Premium), not Defender for Cloud Apps
        Cloud Discovery or CloudAppEvents.
    #>
    [CmdletBinding()]
    param($Request, $TriggerMetadata)
    $null = $TriggerMetadata

    $TenantFilter = $Request.Query.tenantFilter ?? $Request.Body.tenantFilter
    $Period = [string]($Request.Query.period ?? $Request.Body.period ?? 'D7')
    $PeriodDays = switch ($Period) {
        'D7' { 7 }
        'D30' { 30 }
        default {
            return [HttpResponseContext]@{
                StatusCode = [HttpStatusCode]::BadRequest
                Body       = @{ error = "Invalid period '$Period'. Valid values: D7, D30." }
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($TenantFilter)) {
        return [HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::BadRequest
            Body       = @{ error = 'tenantFilter is required.' }
        }
    }

    $CatalogPath = Join-Path $env:CIPPRootPath 'Config\ShadowAI.json'
    try {
        $Catalog = @(Get-Content -Path $CatalogPath -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop)
    } catch {
        $ErrorMessage = Get-CippException -Exception $_
        Write-LogMessage -API 'ShadowAIWebUsage' -tenant $TenantFilter `
            -message "Could not load Shadow AI catalog: $($ErrorMessage.NormalizedError)" `
            -sev 'Error' -LogData $ErrorMessage
        return [HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::InternalServerError
            Body       = @{ error = 'The Shadow AI catalog could not be loaded.' }
        }
    }

    # Domain matching is deliberately explicit. Generic catalog matchNames are too broad for
    # network telemetry (for example, "copilot" or "openai" would create noisy false positives).
    $DomainMap = @{}
    foreach ($Entry in $Catalog) {
        foreach ($Domain in @($Entry.webDomains)) {
            $NormalizedDomain = ([string]$Domain).Trim().ToLowerInvariant() `
                -replace '^https?://', '' `
                -replace '[/?#].*$', '' `
                -replace '^\*\.', ''
            if ($NormalizedDomain -notmatch '^[a-z0-9](?:[a-z0-9-]*\.)+[a-z]{2,}$') { continue }
            if (-not $DomainMap.ContainsKey($NormalizedDomain)) {
                $DomainMap[$NormalizedDomain] = $Entry
            }
        }
    }

    if ($DomainMap.Count -eq 0) {
        return [HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::InternalServerError
            Body       = @{ error = 'The Shadow AI catalog contains no web domain mappings.' }
        }
    }

    $SanctionedTools = @{}
    try {
        $SanctionTable = Get-CIPPTable -TableName 'ShadowAIConfig'
        $EscapedTenant = $TenantFilter -replace "'", "''"
        foreach ($Row in @(Get-CIPPAzDataTableEntity @SanctionTable -Filter "PartitionKey eq '$EscapedTenant'")) {
            $ToolName = if ($Row.Tool) { $Row.Tool } else { $Row.RowKey }
            if ($ToolName) { $SanctionedTools[$ToolName.ToLower()] = $true }
        }
    } catch {
        Write-LogMessage -API 'ShadowAIWebUsage' -tenant $TenantFilter `
            -message "Could not load sanctioned AI tools: $($_.Exception.Message)" -sev 'Warning'
    }

    # Keep the KQL predicate bounded to catalogued domains so the query does not return the
    # tenant's complete network history. The catalog is code-owned and domain values are escaped
    # before they are inserted into the query.
    $DomainPredicate = @(
        foreach ($Domain in ($DomainMap.Keys | Sort-Object)) {
            "RemoteUrl contains '$($Domain -replace "'", "''")'"
        }
    ) -join ' or '

    $Query = @(
        'DeviceNetworkEvents'
        "| where Timestamp >= ago(${PeriodDays}d)"
        '| where isnotempty(RemoteUrl)'
        "| where ($DomainPredicate)"
        '| project Timestamp, DeviceId, DeviceName, RemoteUrl, RemoteIP, RemotePort, Protocol, InitiatingProcessAccountUpn, InitiatingProcessAccountName, InitiatingProcessFileName, ActionType'
        '| order by Timestamp desc'
        '| limit 10000'
    ) -join "`n"

    try {
        $HuntingBody = @{
            Query    = $Query
            Timespan = "P${PeriodDays}D"
        } | ConvertTo-Json -Compress

        $HuntingResponse = New-GraphPostRequest `
            -Uri 'https://graph.microsoft.com/v1.0/security/runHuntingQuery' `
            -tenantid $TenantFilter `
            -type POST `
            -body $HuntingBody `
            -AsApp $true `
            -maxRetries 1

        $Events = @($HuntingResponse.results | Where-Object { $_ })
        $UsageMap = @{}
        foreach ($NetworkEvent in $Events) {
            $RemoteHost = ([string]$NetworkEvent.RemoteUrl).Trim().ToLowerInvariant() `
                -replace '^[a-z][a-z0-9+.-]*://', '' `
                -replace '[/?#].*$', '' `
                -replace ':\d+$', '' `
                -replace '^\.+|\.+$', ''
            if ([string]::IsNullOrWhiteSpace($RemoteHost)) { continue }

            $MatchedDomain = @(
                $DomainMap.Keys |
                    Where-Object { $RemoteHost -eq $_ -or $RemoteHost.EndsWith(".$_") } |
                    Sort-Object Length -Descending
            ) | Select-Object -First 1
            if (-not $MatchedDomain) { continue }

            $CatalogEntry = $DomainMap[$MatchedDomain]
            if (-not $UsageMap.ContainsKey($CatalogEntry.name)) {
                $UsageMap[$CatalogEntry.name] = [PSCustomObject]@{
                    Match         = $CatalogEntry
                    Sanctioned    = $SanctionedTools.ContainsKey($CatalogEntry.name.ToLower())
                    Domains       = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
                    Users         = @{}
                    Devices       = @{}
                    Events        = [System.Collections.Generic.List[object]]::new()
                    ConnectionCount = 0
                    FirstSeen     = $null
                    LastSeen      = $null
                }
            }

            $Usage = $UsageMap[$CatalogEntry.name]
            $Usage.ConnectionCount++
            [void]$Usage.Domains.Add($MatchedDomain)

            $User = [string]($NetworkEvent.InitiatingProcessAccountUpn ?? $NetworkEvent.InitiatingProcessAccountName)
            if (-not [string]::IsNullOrWhiteSpace($User)) {
                if (-not $Usage.Users.ContainsKey($User)) { $Usage.Users[$User] = 0 }
                $Usage.Users[$User]++
            }

            $Device = [string]($NetworkEvent.DeviceId ?? $NetworkEvent.DeviceName)
            if (-not [string]::IsNullOrWhiteSpace($Device)) {
                if (-not $Usage.Devices.ContainsKey($Device)) {
                    $Usage.Devices[$Device] = [PSCustomObject]@{
                        name = [string]$NetworkEvent.DeviceName
                        id   = [string]$NetworkEvent.DeviceId
                    }
                }
            }

            $Timestamp = [string]$NetworkEvent.Timestamp
            if ($Timestamp -and (-not $Usage.FirstSeen -or $Timestamp -lt $Usage.FirstSeen)) {
                $Usage.FirstSeen = $Timestamp
            }
            if ($Timestamp -and (-not $Usage.LastSeen -or $Timestamp -gt $Usage.LastSeen)) {
                $Usage.LastSeen = $Timestamp
            }

            if ($Usage.Events.Count -lt 50) {
                $Usage.Events.Add([PSCustomObject]@{
                        timestamp       = $Timestamp
                        domain          = $MatchedDomain
                        deviceName      = [string]$NetworkEvent.DeviceName
                        userPrincipalName = if ($NetworkEvent.InitiatingProcessAccountUpn) {
                            [string]$NetworkEvent.InitiatingProcessAccountUpn
                        } else {
                            [string]$NetworkEvent.InitiatingProcessAccountName
                        }
                        processName     = [string]$NetworkEvent.InitiatingProcessFileName
                        protocol        = [string]$NetworkEvent.Protocol
                        actionType      = [string]$NetworkEvent.ActionType
                    })
            }
        }

        $Rows = foreach ($Usage in $UsageMap.Values) {
            $Match = $Usage.Match
            $TopUsers = @(
                $Usage.Users.GetEnumerator() |
                    Sort-Object Value -Descending |
                    Select-Object -First 10 |
                    ForEach-Object {
                        [PSCustomObject]@{
                            userPrincipalName = $_.Key
                            connections       = [int]$_.Value
                        }
                    }
            )
            $TopDevices = @(
                $Usage.Devices.GetEnumerator() |
                    Sort-Object Key |
                    Select-Object -First 10 |
                    ForEach-Object {
                        [PSCustomObject]@{
                            deviceName = $_.Value.name
                            deviceId   = $_.Value.id
                        }
                    }
            )

            [PSCustomObject]@{
                aiTool        = $Match.name
                vendor        = $Match.vendor
                category      = $Match.category
                risk          = if ($Usage.Sanctioned) { 'Informational' } else { $Match.risk }
                catalogRisk   = $Match.risk
                status        = if ($Usage.Sanctioned) { 'Sanctioned' } else { 'Unsanctioned' }
                domains       = @($Usage.Domains | Sort-Object) -join ', '
                connections   = [int]$Usage.ConnectionCount
                activeUsers   = [int]$Usage.Users.Count
                devices       = [int]$Usage.Devices.Count
                firstSeen     = $Usage.FirstSeen
                lastSeen      = $Usage.LastSeen
                topUsers      = $TopUsers
                topDevices    = $TopDevices
                usageEvents   = @($Usage.Events)
                toolDescription = $Match.description
                riskReason    = $Match.riskReason
            }
        }

        $Rows = @($Rows | Sort-Object connections, aiTool -Descending)
        $ByCategory = foreach ($Group in ($Rows | Group-Object category)) {
            [PSCustomObject]@{
                category    = $Group.Name
                tools       = $Group.Count
                connections = [int](($Group.Group | Measure-Object -Property connections -Sum).Sum)
            }
        }
        $ByRisk = foreach ($Group in ($Rows | Group-Object risk)) {
            [PSCustomObject]@{
                risk        = $Group.Name
                tools       = $Group.Count
                connections = [int](($Group.Group | Measure-Object -Property connections -Sum).Sum)
            }
        }
        $TopTools = @(
            $Rows | Select-Object -First 8 aiTool, category, risk, status, connections, activeUsers, devices
        )
        $UniqueUsers = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        $UniqueDevices = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($Usage in $UsageMap.Values) {
            foreach ($User in $Usage.Users.Keys) { [void]$UniqueUsers.Add($User) }
            foreach ($Device in $Usage.Devices.Keys) { [void]$UniqueDevices.Add($Device) }
        }

        $Body = [PSCustomObject]@{
            summary = [PSCustomObject]@{
                aiToolsDetected  = $Rows.Count
                webConnections    = [int](($Rows | Measure-Object -Property connections -Sum).Sum)
                activeUsers       = $UniqueUsers.Count
                activeDevices     = $UniqueDevices.Count
                period            = $Period
                periodDays        = $PeriodDays
                source            = 'Microsoft Defender for Endpoint'
                dataTable         = 'DeviceNetworkEvents'
                queryWindow       = "P${PeriodDays}D"
                resultLimit       = 10000
                eventsReturned    = $Events.Count
                resultsTruncated   = $Events.Count -ge 10000
                catalogDomains    = $DomainMap.Count
                noDataReason      = if ($Rows.Count -eq 0) {
                    'No matching network events were returned. Confirm that devices are onboarded to Defender for Endpoint and reporting network telemetry.'
                } else {
                    $null
                }
            }
            byCategory = @($ByCategory)
            byRisk     = @($ByRisk)
            topTools   = @($TopTools)
            webUsage   = @($Rows)
        }

        return [HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::OK
            Body       = $Body
        }
    } catch {
        $ErrorMessage = Get-CippException -Exception $_
        Write-LogMessage -API 'ShadowAIWebUsage' -tenant $TenantFilter `
            -message "Failed to retrieve AI web usage: $($ErrorMessage.NormalizedError)" `
            -sev 'Error' -LogData $ErrorMessage
        return [HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::InternalServerError
            Body       = @{
                error  = $ErrorMessage.NormalizedError
                source = 'Microsoft Defender for Endpoint DeviceNetworkEvents'
            }
        }
    }
}
