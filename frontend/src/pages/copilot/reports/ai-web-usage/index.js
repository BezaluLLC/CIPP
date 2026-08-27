import { useState } from 'react'
import { Layout as DashboardLayout } from '../../../../layouts/index.js'
import { CippInfoBar } from '../../../../components/CippCards/CippInfoBar'
import { CippImageCard } from '../../../../components/CippCards/CippImageCard'
import { CippChartCard } from '../../../../components/CippCards/CippChartCard'
import { CippDataTable } from '../../../../components/CippTable/CippDataTable'
import { CippHead } from '../../../../components/CippComponents/CippHead'
import { ApiGetCall } from '../../../../api/ApiCall'
import { useSettings } from '../../../../hooks/use-settings'
import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  SvgIcon,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Grid } from '@mui/system'
import {
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'

const riskChipColor = (risk) => {
  switch (String(risk).toLowerCase()) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    case 'informational':
      return 'success'
    default:
      return 'default'
  }
}

const WebUsageDetail = ({ row }) => {
  if (!row) return null

  const properties = [
    { label: 'Vendor', value: row.vendor },
    { label: 'Category', value: row.category },
    { label: 'Domains', value: row.domains },
    { label: 'Connections', value: row.connections },
    { label: 'Active Users', value: row.activeUsers },
    { label: 'Devices', value: row.devices },
    {
      label: 'First Seen',
      value: row.firstSeen
        ? new Date(row.firstSeen).toLocaleString()
        : 'Unknown',
    },
    {
      label: 'Last Seen',
      value: row.lastSeen ? new Date(row.lastSeen).toLocaleString() : 'Unknown',
    },
  ]

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="h6">{row.aiTool}</Typography>
        <Chip
          size="small"
          variant="outlined"
          label={row.risk}
          color={riskChipColor(row.risk)}
        />
        <Chip
          size="small"
          variant="outlined"
          label={row.status ?? 'Unsanctioned'}
          color={row.status === 'Sanctioned' ? 'success' : 'warning'}
        />
      </Stack>
      {row.toolDescription && (
        <Typography variant="body2" color="text.secondary">
          {row.toolDescription}
        </Typography>
      )}
      {row.riskReason && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '4px solid',
            borderLeftColor: (() => {
              const color = riskChipColor(row.catalogRisk ?? row.risk)
              return color === 'default' ? 'divider' : `${color}.main`
            })(),
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Why {row.aiTool} is rated {row.catalogRisk ?? row.risk} risk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {row.riskReason}
          </Typography>
        </Box>
      )}
      <Divider />
      <Grid container spacing={2}>
        {properties
          .filter(
            (property) =>
              property.value !== undefined &&
              property.value !== null &&
              property.value !== ''
          )
          .map((property) => (
            <Grid size={{ md: 4, xs: 12 }} key={property.label}>
              <Typography variant="subtitle2" color="text.secondary">
                {property.label}
              </Typography>
              <Typography variant="body2">{String(property.value)}</Typography>
            </Grid>
          ))}
      </Grid>
      <Divider />
      <CippDataTable
        noCard={true}
        title="Recent Endpoint Events"
        data={row.usageEvents ?? []}
        simpleColumns={[
          'timestamp',
          'domain',
          'deviceName',
          'userPrincipalName',
          'processName',
          'protocol',
          'actionType',
        ]}
      />
    </Stack>
  )
}

const Page = () => {
  const currentTenant = useSettings().currentTenant
  const [period, setPeriod] = useState('D7')
  const queryKey = `ListShadowAIWebUsage-${currentTenant}-${period}`

  const webUsage = ApiGetCall({
    url: '/api/ListShadowAIWebUsage',
    data: { tenantFilter: currentTenant, period },
    queryKey,
    waiting: !!currentTenant && currentTenant !== 'AllTenants',
    retry: 1,
  })

  const data = webUsage.data ?? {}
  const summary = data.summary ?? {}
  const byCategory = data.byCategory ?? []
  const byRisk = data.byRisk ?? []
  const topTools = data.topTools ?? []
  const usageRows = data.webUsage ?? []
  const showCharts =
    webUsage.isFetching || byCategory.length > 0 || byRisk.length > 0

  const sanctionActions = [
    {
      label: 'Mark as Company Sanctioned',
      type: 'POST',
      url: '/api/ExecShadowAISanction',
      icon: (
        <SvgIcon fontSize="small">
          <CheckCircleIcon />
        </SvgIcon>
      ),
      data: { Tool: 'aiTool', Action: '!Sanction' },
      confirmText:
        "Mark [aiTool] as company sanctioned for this tenant? Its risk level will report as Informational and its status as 'Sanctioned'.",
      relatedQueryKeys: [queryKey],
      condition: (row) => row.status !== 'Sanctioned',
      multiPost: false,
    },
    {
      label: 'Remove Company Sanctioned Status',
      type: 'POST',
      url: '/api/ExecShadowAISanction',
      icon: (
        <SvgIcon fontSize="small">
          <NoSymbolIcon />
        </SvgIcon>
      ),
      data: { Tool: 'aiTool', Action: '!Unsanction' },
      confirmText:
        "Remove the company sanctioned status from [aiTool]? Its catalog risk level will apply again and its status will report as 'Unsanctioned'.",
      relatedQueryKeys: [queryKey],
      condition: (row) => row.status === 'Sanctioned',
      multiPost: false,
    },
  ]

  const statusFilters = [
    {
      filterName: 'Sanctioned',
      value: [{ id: 'status', value: 'Sanctioned' }],
      type: 'column',
    },
    {
      filterName: 'Unsanctioned',
      value: [{ id: 'status', value: 'Unsanctioned' }],
      type: 'column',
    },
    {
      filterName: 'High Risk',
      value: [{ id: 'risk', value: 'High' }],
      type: 'column',
    },
  ]

  if (currentTenant === 'AllTenants') {
    return (
      <>
        <CippHead title="AI Web Usage" />
        <Container maxWidth={false} sx={{ flexGrow: 1, py: 2 }}>
          <CippImageCard
            title="Not supported"
            imageUrl="/assets/illustrations/undraw_website_ij0l.svg"
            text="AI Web Usage requires a single tenant because Defender for Endpoint hunting data is tenant-scoped. Select a tenant from the dropdown above."
          />
        </Container>
      </>
    )
  }

  return (
    <>
      <CippHead title="AI Web Usage" />
      <Container maxWidth={false} sx={{ flexGrow: 1, py: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ md: 12, xs: 12 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="h5">AI Web Usage</Typography>
                <Typography variant="body2" color="text.secondary">
                  Business Premium-compatible endpoint network telemetry for
                  known AI services.
                </Typography>
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={period}
                onChange={(event, value) => value && setPeriod(value)}
                aria-label="Usage period"
              >
                <ToggleButton value="D7">Last 7 days</ToggleButton>
                <ToggleButton value="D30">Last 30 days</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>
          <Grid size={{ md: 12, xs: 12 }}>
            <Alert severity="info">
              This report uses Microsoft Defender for Endpoint{' '}
              <code>DeviceNetworkEvents</code> through Microsoft Graph. It
              reports matching network connections, not page content, traffic
              volume, or Defender for Cloud Apps Cloud Discovery data.
            </Alert>
          </Grid>
          {webUsage.isError && (
            <Grid size={{ md: 12, xs: 12 }}>
              <Alert severity="error">
                {webUsage.error?.response?.data?.error ??
                  webUsage.error?.message ??
                  'Failed to load AI web usage.'}
              </Alert>
            </Grid>
          )}
          {summary.noDataReason && !webUsage.isError && (
            <Grid size={{ md: 12, xs: 12 }}>
              <Alert severity="warning">{summary.noDataReason}</Alert>
            </Grid>
          )}
          {summary.resultsTruncated && !webUsage.isError && (
            <Grid size={{ md: 12, xs: 12 }}>
              <Alert severity="warning">
                The query returned the 10,000-event limit. Counts are a lower
                bound for this period; narrow the period to inspect the data in
                smaller windows.
              </Alert>
            </Grid>
          )}
          <Grid size={{ md: 12, xs: 12 }}>
            <CippInfoBar
              isFetching={webUsage.isFetching}
              data={[
                {
                  icon: <GlobeAltIcon />,
                  name: 'AI Sites Detected',
                  data: `${summary.aiToolsDetected ?? 0}`,
                },
                {
                  icon: <ExclamationTriangleIcon />,
                  name: 'Web Connections',
                  data: `${summary.webConnections ?? 0}`,
                },
                {
                  icon: <UserGroupIcon />,
                  name: 'Active Users',
                  data: `${summary.activeUsers ?? 0}`,
                },
                {
                  icon: <ComputerDesktopIcon />,
                  name: 'Active Devices',
                  data: `${summary.activeDevices ?? 0}`,
                },
              ]}
            />
          </Grid>
          {showCharts && (
            <>
              <Grid size={{ md: 4, xs: 12 }}>
                <CippChartCard
                  title="AI Sites by Category"
                  isFetching={webUsage.isFetching}
                  chartType="donut"
                  labels={byCategory.map((item) => item.category)}
                  chartSeries={byCategory.map((item) => item.tools)}
                  totalLabel="Sites"
                />
              </Grid>
              <Grid size={{ md: 4, xs: 12 }}>
                <CippChartCard
                  title="Most Active AI Sites"
                  isFetching={webUsage.isFetching}
                  chartType="bar"
                  labels={topTools.map((item) => item.aiTool)}
                  chartSeries={topTools.map((item) => item.connections ?? 0)}
                  totalLabel="Connections"
                />
              </Grid>
              <Grid size={{ md: 4, xs: 12 }}>
                <CippChartCard
                  title="AI Site Risk Distribution"
                  isFetching={webUsage.isFetching}
                  chartType="pie"
                  labels={byRisk.map((item) => item.risk)}
                  chartSeries={byRisk.map((item) => item.tools)}
                  totalLabel="Sites"
                />
              </Grid>
            </>
          )}
          <Grid size={{ md: 12, xs: 12 }}>
            <CippDataTable
              title={`AI Web Usage (${period === 'D30' ? '30 days' : '7 days'})`}
              isFetching={webUsage.isFetching}
              data={usageRows}
              actions={sanctionActions}
              filters={statusFilters}
              offCanvas={{
                size: 'lg',
                children: (row) => <WebUsageDetail row={row} />,
              }}
              offCanvasOnRowClick={true}
              refreshFunction={webUsage}
              simpleColumns={[
                'aiTool',
                'vendor',
                'category',
                'risk',
                'status',
                'domains',
                'connections',
                'activeUsers',
                'devices',
                'firstSeen',
                'lastSeen',
              ]}
            />
          </Grid>
        </Grid>
      </Container>
    </>
  )
}

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default Page
