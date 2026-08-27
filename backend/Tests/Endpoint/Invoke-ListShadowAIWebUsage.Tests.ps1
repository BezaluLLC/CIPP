# Pester tests for the Business Premium-compatible Shadow AI web usage endpoint.

BeforeAll {
    $BackendRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath))
    $FunctionPath = Join-Path $BackendRoot 'Modules/CIPPHTTP/Public/Entrypoints/HTTP Functions/Tenant/Standards/Invoke-ListShadowAIWebUsage.ps1'
    if (-not (Test-Path $FunctionPath)) { throw "Could not locate $FunctionPath" }

    class HttpResponseContext {
        [object]$StatusCode
        [object]$Body
    }

    $Accelerators = [psobject].Assembly.GetType('System.Management.Automation.TypeAccelerators')
    if (-not $Accelerators::Get.ContainsKey('HttpStatusCode')) {
        $Accelerators::Add('HttpStatusCode', [System.Net.HttpStatusCode])
    }

    function Get-CippException {
        param($Exception)
        [pscustomobject]@{ NormalizedError = $Exception.Exception.Message }
    }
    function Get-CIPPTable { param($TableName) @{ TableName = $TableName } }
    function Get-CIPPAzDataTableEntity { param($TableName, $Filter) }
    function New-GraphPostRequest {
        param($Uri, $tenantid, $type, $body, $AsApp, $maxRetries)
    }
    function Write-LogMessage { param($API, $tenant, $message, $sev, $LogData) }

    . $FunctionPath

    $script:PreviousCippRootPath = $env:CIPPRootPath
    $env:CIPPRootPath = $BackendRoot

    function New-WebUsageRequest {
        param(
            [hashtable]$Query = @{},
            [hashtable]$Body = @{}
        )
        [pscustomobject]@{
            Query   = [pscustomobject]$Query
            Body    = [pscustomobject]$Body
            Headers = @{}
        }
    }

    $script:Events = @(
        [pscustomobject]@{
            Timestamp = '2026-08-27T09:00:00Z'
            DeviceId = 'device-1'
            DeviceName = 'PC-1'
            RemoteUrl = 'https://chatgpt.com/c/one'
            RemoteIP = '203.0.113.10'
            RemotePort = 443
            Protocol = 'Tcp'
            InitiatingProcessAccountUpn = 'alice@contoso.com'
            InitiatingProcessAccountName = 'alice'
            InitiatingProcessFileName = 'msedge.exe'
            ActionType = 'ConnectionSuccess'
        }
        [pscustomobject]@{
            Timestamp = '2026-08-27T08:00:00Z'
            DeviceId = 'device-2'
            DeviceName = 'PC-2'
            RemoteUrl = 'https://www.chatgpt.com/'
            RemoteIP = '203.0.113.11'
            RemotePort = 443
            Protocol = 'Tcp'
            InitiatingProcessAccountUpn = 'bob@contoso.com'
            InitiatingProcessAccountName = 'bob'
            InitiatingProcessFileName = 'chrome.exe'
            ActionType = 'ConnectionSuccess'
        }
        [pscustomobject]@{
            Timestamp = '2026-08-26T08:00:00Z'
            DeviceId = 'device-1'
            DeviceName = 'PC-1'
            RemoteUrl = 'https://claude.ai/new'
            RemoteIP = '203.0.113.12'
            RemotePort = 443
            Protocol = 'Tcp'
            InitiatingProcessAccountUpn = 'alice@contoso.com'
            InitiatingProcessAccountName = 'alice'
            InitiatingProcessFileName = 'msedge.exe'
            ActionType = 'ConnectionSuccess'
        }
        [pscustomobject]@{
            Timestamp = '2026-08-27T07:00:00Z'
            DeviceId = 'device-3'
            DeviceName = 'PC-3'
            RemoteUrl = 'https://example.com/'
            RemoteIP = '203.0.113.13'
            RemotePort = 443
            Protocol = 'Tcp'
            InitiatingProcessAccountUpn = 'carol@contoso.com'
            InitiatingProcessAccountName = 'carol'
            InitiatingProcessFileName = 'msedge.exe'
            ActionType = 'ConnectionSuccess'
        }
    )
}

AfterAll {
    $env:CIPPRootPath = $script:PreviousCippRootPath
}

Describe 'Invoke-ListShadowAIWebUsage' {
    BeforeEach {
        $script:CapturedHuntingBody = $null
        Mock -CommandName Write-LogMessage -MockWith { }
        Mock -CommandName Get-CIPPAzDataTableEntity -MockWith { @() }
        Mock -CommandName New-GraphPostRequest -MockWith {
            $script:CapturedHuntingBody = $body | ConvertFrom-Json
            [pscustomobject]@{ results = $script:Events }
        }
    }

    It 'queries endpoint network telemetry and aggregates known AI domains' {
        $Response = Invoke-ListShadowAIWebUsage `
            -Request (New-WebUsageRequest -Query @{ tenantFilter = 'contoso.onmicrosoft.com' }) `
            -TriggerMetadata $null

        $Response.StatusCode | Should -Be ([System.Net.HttpStatusCode]::OK)
        $Response.Body.summary.source | Should -Be 'Microsoft Defender for Endpoint'
        $Response.Body.summary.dataTable | Should -Be 'DeviceNetworkEvents'
        $Response.Body.summary.periodDays | Should -Be 7
        $Response.Body.summary.webConnections | Should -Be 3
        $Response.Body.summary.activeUsers | Should -Be 2
        $Response.Body.summary.activeDevices | Should -Be 2
        @($Response.Body.webUsage).Count | Should -Be 2

        $ChatGPT = $Response.Body.webUsage | Where-Object aiTool -eq 'ChatGPT'
        $ChatGPT.connections | Should -Be 2
        $ChatGPT.activeUsers | Should -Be 2
        $ChatGPT.devices | Should -Be 2
        @($ChatGPT.usageEvents).Count | Should -Be 2
        $ChatGPT.usageEvents[0].remoteUrl | Should -BeNullOrEmpty
        $ChatGPT.usageEvents[0].domain | Should -Be 'chatgpt.com'

        $script:CapturedHuntingBody.Timespan | Should -Be 'P7D'
        $script:CapturedHuntingBody.Query | Should -Match 'DeviceNetworkEvents'
        $script:CapturedHuntingBody.Query | Should -Match "RemoteUrl contains 'chatgpt.com'"
        Should -Invoke New-GraphPostRequest -Times 1 -Exactly -ParameterFilter {
            $Uri -eq 'https://graph.microsoft.com/v1.0/security/runHuntingQuery' -and
            $tenantid -eq 'contoso.onmicrosoft.com' -and
            $AsApp -eq $true -and
            $maxRetries -eq 1
        }
    }

    It 'honors the thirty-day period and applies the tenant sanction state' {
        Mock -CommandName Get-CIPPAzDataTableEntity -MockWith {
            @([pscustomobject]@{ Tool = 'ChatGPT' })
        }

        $Response = Invoke-ListShadowAIWebUsage `
            -Request (New-WebUsageRequest -Query @{
                tenantFilter = 'contoso.onmicrosoft.com'
                period       = 'D30'
            }) `
            -TriggerMetadata $null

        $Response.Body.summary.period | Should -Be 'D30'
        $Response.Body.summary.periodDays | Should -Be 30
        $script:CapturedHuntingBody.Timespan | Should -Be 'P30D'
        $ChatGPT = $Response.Body.webUsage | Where-Object aiTool -eq 'ChatGPT'
        $ChatGPT.status | Should -Be 'Sanctioned'
        $ChatGPT.risk | Should -Be 'Informational'
    }

    It 'rejects unsupported periods without querying Defender' {
        $Response = Invoke-ListShadowAIWebUsage `
            -Request (New-WebUsageRequest -Query @{
                tenantFilter = 'contoso.onmicrosoft.com'
                period       = 'D90'
            }) `
            -TriggerMetadata $null

        $Response.StatusCode | Should -Be ([System.Net.HttpStatusCode]::BadRequest)
        $Response.Body.error | Should -Match 'Valid values: D7, D30'
        Should -Invoke New-GraphPostRequest -Times 0 -Exactly
    }

    It 'surfaces a hunting query failure instead of returning an empty success' {
        Mock -CommandName New-GraphPostRequest -MockWith { throw 'Threat hunting permission is missing' }

        $Response = Invoke-ListShadowAIWebUsage `
            -Request (New-WebUsageRequest -Query @{ tenantFilter = 'contoso.onmicrosoft.com' }) `
            -TriggerMetadata $null

        $Response.StatusCode | Should -Be ([System.Net.HttpStatusCode]::InternalServerError)
        $Response.Body.error | Should -Be 'Threat hunting permission is missing'
        $Response.Body.source | Should -Be 'Microsoft Defender for Endpoint DeviceNetworkEvents'
    }

    It 'reports an empty telemetry result without counting a null response item' {
        Mock -CommandName New-GraphPostRequest -MockWith {
            [pscustomobject]@{ results = @() }
        }

        $Response = Invoke-ListShadowAIWebUsage `
            -Request (New-WebUsageRequest -Query @{ tenantFilter = 'contoso.onmicrosoft.com' }) `
            -TriggerMetadata $null

        $Response.Body.summary.eventsReturned | Should -Be 0
        $Response.Body.summary.resultsTruncated | Should -BeFalse
        $Response.Body.summary.noDataReason | Should -Match 'No matching network events'
        @($Response.Body.webUsage).Count | Should -Be 0
    }
}
