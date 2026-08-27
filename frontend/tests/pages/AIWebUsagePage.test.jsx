import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithTheme } from '../test-utils'

const { apiGetCall } = vi.hoisted(() => ({ apiGetCall: vi.fn() }))

vi.mock('../../src/api/ApiCall', () => ({
  ApiGetCall: apiGetCall,
}))

vi.mock('../../src/hooks/use-settings', () => ({
  useSettings: () => ({ currentTenant: 'testdomain.com' }),
}))

vi.mock('../../src/components/CippComponents/CippHead', () => ({
  CippHead: () => null,
}))

vi.mock('../../src/components/CippCards/CippInfoBar', () => ({
  CippInfoBar: ({ data }) => (
    <div>
      {data.map((item) => (
        <span key={item.name}>
          {item.name}: {item.data}
        </span>
      ))}
    </div>
  ),
}))

vi.mock('../../src/components/CippCards/CippImageCard', () => ({
  CippImageCard: ({ title, text }) => (
    <div>
      {title}: {text}
    </div>
  ),
}))

vi.mock('../../src/components/CippCards/CippChartCard', () => ({
  CippChartCard: ({ title }) => <div>{title}</div>,
}))

vi.mock('../../src/components/CippTable/CippDataTable', () => ({
  CippDataTable: ({ title }) => <div>{title}</div>,
}))

import Page from '../../src/pages/copilot/reports/ai-web-usage/index.js'

const sampleData = {
  summary: {
    aiToolsDetected: 2,
    webConnections: 3,
    activeUsers: 2,
    activeDevices: 2,
    period: 'D7',
    periodDays: 7,
    source: 'Microsoft Defender for Endpoint',
    dataTable: 'DeviceNetworkEvents',
  },
  byCategory: [{ category: 'AI Assistant', tools: 2, connections: 3 }],
  byRisk: [{ risk: 'High', tools: 1, connections: 2 }],
  topTools: [{ aiTool: 'ChatGPT', connections: 2 }],
  webUsage: [{ aiTool: 'ChatGPT', connections: 2 }],
}

describe('AI Web Usage page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiGetCall.mockReturnValue({
      data: sampleData,
      isFetching: false,
      isError: false,
    })
  })

  it('renders the endpoint source, summary cards, charts, and table', () => {
    renderWithTheme(<Page />)

    expect(
      screen.getByText(
        'Business Premium-compatible endpoint network telemetry for known AI services.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Microsoft Defender for Endpoint'
    )
    expect(screen.getByText('AI Sites Detected: 2')).toBeInTheDocument()
    expect(screen.getByText('Web Connections: 3')).toBeInTheDocument()
    expect(screen.getByText('AI Web Usage (7 days)')).toBeInTheDocument()
  })

  it('refetches with the selected thirty-day period', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Page />)

    await user.click(screen.getByRole('button', { name: 'Last 30 days' }))

    expect(apiGetCall).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { tenantFilter: 'testdomain.com', period: 'D30' },
        queryKey: 'ListShadowAIWebUsage-testdomain.com-D30',
      })
    )
  })
})
