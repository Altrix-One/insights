import { safeJSONParse } from '@/utils'
import { watchOnce } from '@vueuse/core'
import { InjectionKey, reactive, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import useChart from '../charts/chart'
import { ChartConfig, ChartType } from '../charts/helpers'
import useDashboard from '../dashboard/dashboard'
import { getUniqueId } from '../helpers'
import useDocumentResource from '../helpers/resource'
import { createToast } from '../helpers/toasts'
import useQuery from '../query/query'

export default function useWorkbook(name: string) {
	const resource = getWorkbookResource(name)

	type ActiveTabType = 'query' | 'chart' | 'dashboard' | ''
	const workbook = reactive({
		...toRefs(resource),

		activeTabType: '' as ActiveTabType,
		activeTabIdx: 0,

		setActiveTab(type: ActiveTabType, idx: number) {
			workbook.activeTabType = type
			workbook.activeTabIdx = idx
		},
		isActiveTab(type: ActiveTabType, idx: number) {
			return workbook.activeTabType === type && workbook.activeTabIdx === idx
		},

		addQuery() {
			const idx = workbook.doc.queries.length
			workbook.doc.queries.push({
				name: getUniqueId(),
				title: `Query ${idx + 1}`,
				operations: [],
			})
			workbook.setActiveTab('query', idx)
		},

		removeQuery(queryName: string) {
			const idx = workbook.doc.queries.findIndex((row) => row.name === queryName)
			if (idx === -1) return
			workbook.doc.queries.splice(idx, 1)
			if (workbook.isActiveTab('query', idx)) {
				workbook.setActiveTab('', 0)
			}
		},

		addChart() {
			const idx = workbook.doc.charts.length
			workbook.doc.charts.push({
				name: getUniqueId(),
				title: `Chart ${idx + 1}`,
				query: '',
				chart_type: 'Line',
				config: {} as ChartConfig,
			})
			workbook.setActiveTab('chart', idx)
		},

		removeChart(chartName: string) {
			const idx = workbook.doc.charts.findIndex((row) => row.name === chartName)
			if (idx === -1) return
			workbook.doc.charts.splice(idx, 1)
			if (workbook.isActiveTab('chart', idx)) {
				workbook.setActiveTab('', 0)
			}
		},

		addDashboard() {
			const idx = workbook.doc.dashboards.length
			workbook.doc.dashboards.push({
				name: getUniqueId(),
				title: `Dashboard ${idx + 1}`,
				items: [],
			})
			workbook.setActiveTab('dashboard', idx)
		},

		removeDashboard(dashboardName: string) {
			const idx = workbook.doc.dashboards.findIndex((row) => row.name === dashboardName)
			if (idx === -1) return
			workbook.doc.dashboards.splice(idx, 1)
			if (workbook.isActiveTab('dashboard', idx)) {
				workbook.setActiveTab('', 0)
			}
		},
	})

	const router = useRouter()
	workbook.onAfterInsert(() => {
		router.replace(`/workbook/${workbook.doc.name}`)
	})
	workbook.onAfterSave(() =>
		createToast({
			title: 'Saved',
			variant: 'success',
		})
	)

	// set first tab as active
	watchOnce(
		() => workbook.doc.name,
		() => {
			workbook.doc.queries.forEach((query) => useQuery(query))
			workbook.doc.charts.forEach((chart) => useChart(chart))
			workbook.doc.dashboards.forEach((dashboard) => useDashboard(dashboard))

			if (workbook.doc.queries.length) {
				workbook.setActiveTab('query', 0)
			}
		}
	)

	return workbook
}

export type Workbook = ReturnType<typeof useWorkbook>
export const workbookKey = Symbol() as InjectionKey<Workbook>

function getWorkbookResource(name: string) {
	const doctype = 'Insights Workbook'
	const workbook = useDocumentResource<InsightsWorkbook>(doctype, name, {
		initialDoc: {
			doctype,
			name: '',
			title: '',
			queries: [],
			charts: [],
			dashboards: [],
		},
		transform(doc) {
			doc.queries = safeJSONParse(doc.queries) || []
			doc.charts = safeJSONParse(doc.charts) || []
			doc.dashboards = safeJSONParse(doc.dashboards) || []
			return doc
		},
	})
	return workbook
}

type InsightsWorkbook = {
	doctype: 'Insights Workbook'
	name: string
	title: string
	queries: WorkbookQuery[]
	charts: WorkbookChart[]
	dashboards: WorkbookDashboard[]
}

export type WorkbookQuery = {
	name: string
	title: string
	operations: Operation[]
}

export type WorkbookChart = {
	name: string
	title: string
	query: string
	chart_type: ChartType
	config: ChartConfig
}

export type WorkbookDashboard = {
	name: string
	title: string
	items: WorkbookDashboardItem[]
}
export type WorkbookDashboardItem =
	| WorkbookDashboardChart
	| WorkbookDashboardFilter
	| WorkbookDashboardText
export type Layout = {
	i: string
	x: number
	y: number
	w: number
	h: number
}
export type WorkbookDashboardChart = {
	type: 'chart'
	chart: string
	layout: Layout
}
export type WorkbookDashboardFilter = {
	type: 'filter'
	filter: object
	layout: Layout
}
export type WorkbookDashboardText = {
	type: 'text'
	text: string
	layout: Layout
}
