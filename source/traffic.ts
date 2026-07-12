const CLOUDFLARE_GRAPHQL_API_URL =
	'https://api.cloudflare.com/client/v4/graphql';
const CLOUDFLARE_SI_HOSTNAME = 'cdn.simpleicons.org';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const LAST_ONE_MONTH_IN_DAYS = 30;

export type Traffic = {
	dataServed: number;
	requests: number;
	uniqueVisitors: number;
};

type CloudflareSite = {
	accountTag: string;
	hostname: string;
	zoneTag: string;
};

let cache: { expiresAt: number; traffic: Traffic } | undefined;
let inFlightRequest: Promise<Traffic> | undefined;

type CloudflareGraphqlResponse = {
	data?: {
		viewer?: {
			accounts?: Array<{
				traffic?: Array<{
					count?: number | string | null;
					sum?: {
						edgeResponseBytes?: number | string | null;
					};
				}>;
			}>;
			zones?: Array<{
				uniqueVisitors?: Array<{
					uniq?: {
						uniques?: number | string | null;
					};
				}>;
			}>;
		};
	};
	errors?: Array<{
		message?: string;
	}>;
};

type Fetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

type LastOneMonthTrafficOptions = {
	fetch?: Fetch;
	getEnv?: (name: string) => string | undefined;
	now?: () => Date;
};

type FetchLastOneMonthTrafficOptions =
	& Omit<LastOneMonthTrafficOptions, 'now'>
	& { now: () => Date };

// Cloudflare exposes unique IPs only through its zone rollups, whose filters do
// not include hostnames. Requests and data served remain hostname-scoped.
const lastOneMonthTrafficQuery = `
	query LastOneMonthTraffic(
		$accountTag: string
		$zoneTag: string
		$hostname: string
		$start: Time
		$end: Time
		$startDate: Date
		$endDate: Date
	) {
		viewer {
			accounts(filter: { accountTag: $accountTag }) {
				traffic: httpRequestsAdaptiveGroups(
					limit: 1
					filter: {
						zoneTag: $zoneTag
						clientRequestHTTPHost: $hostname
						datetime_geq: $start
						datetime_lt: $end
						requestSource: "eyeball"
					}
				) {
					count
					sum {
						edgeResponseBytes
					}
				}
			}
			zones(filter: { zoneTag: $zoneTag }) {
				uniqueVisitors: httpRequests1dGroups(
					limit: 1
					filter: {
						date_geq: $startDate
						date_lt: $endDate
					}
				) {
					uniq {
						uniques
					}
				}
			}
		}
	}
`;

const getRequiredEnv = (
	getEnv: (name: string) => string | undefined,
	...names: string[]
) => {
	for (const name of names) {
		const value = getEnv(name);
		if (value) {
			return value;
		}
	}

	throw new Error(
		`Missing required environment variable: ${names.join(' or ')}`,
	);
};

const getCloudflareSite = (
	getEnv: (name: string) => string | undefined,
): CloudflareSite => ({
	accountTag: getRequiredEnv(
		getEnv,
		'CLOUDFLARE_SI_ACCOUNT_ID',
		'CLOUDFLARE_ACCOUNT_ID',
	),
	hostname: CLOUDFLARE_SI_HOSTNAME,
	zoneTag: getRequiredEnv(
		getEnv,
		'CLOUDFLARE_SI_ZONE_ID',
		'CLOUDFLARE_ZONE_ID',
	),
});

const toCloudflareTime = (date: Date) =>
	date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const parseCountValue = (value: number | string | null | undefined) => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value !== 'string') {
		return 0;
	}

	const trimmedValue = value.trim();
	if (!trimmedValue) {
		return 0;
	}

	const suffixMatch = trimmedValue.match(/^([+-]?\d+(?:\.\d+)?)\s*([KMB])$/i);
	if (suffixMatch) {
		const [, baseValue, suffix] = suffixMatch;
		let multiplier = 1;
		switch (suffix.toUpperCase()) {
			case 'K':
				multiplier = 1_000;
				break;
			case 'M':
				multiplier = 1_000_000;
				break;
			case 'B':
				multiplier = 1_000_000_000;
				break;
		}

		return Number(baseValue) * multiplier;
	}

	const numericValue = Number(trimmedValue);
	return Number.isFinite(numericValue) ? numericValue : 0;
};

export const formatCount = (value: number) => {
	const absoluteValue = Math.abs(value);
	const formatWithSuffix = (divisor: number, suffix: string) => {
		const formatted = (value / divisor).toFixed(0);
		return `${formatted}${suffix}`;
	};

	if (absoluteValue >= 1_000_000_000) {
		const formatted = (value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '');
		return `${formatted} billion`;
	}

	if (absoluteValue >= 1_000_000) {
		return formatWithSuffix(1_000_000, 'M');
	}

	if (absoluteValue >= 1_000) {
		return formatWithSuffix(1_000, 'K');
	}

	return String(value);
};

export const formatBytes = (value: number) => {
	const absoluteValue = Math.abs(value);
	const formatWithUnit = (divisor: number, unit: string) => {
		const formatted = (value / divisor).toFixed(0);
		return `${formatted}${unit}`;
	};

	if (absoluteValue >= 1_000_000_000_000_000) {
		return formatWithUnit(1_000_000_000_000_000, 'PB');
	}

	if (absoluteValue >= 1_000_000_000_000) {
		const formatted = (value / 1_000_000_000_000).toFixed(2).replace(
			/\.?0+$/,
			'',
		);
		return `${formatted}TB`;
	}

	if (absoluteValue >= 1_000_000_000) {
		return formatWithUnit(1_000_000_000, 'GB');
	}

	if (absoluteValue >= 1_000_000) {
		return formatWithUnit(1_000_000, 'MB');
	}

	if (absoluteValue >= 1_000) {
		return formatWithUnit(1_000, 'KB');
	}

	return `${value}B`;
};

const getLastOneMonthDateRange = (now: Date) => {
	const end = new Date(Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
	));
	const start = new Date(
		end.getTime() - LAST_ONE_MONTH_IN_DAYS * DAY_IN_MILLISECONDS,
	);

	return {
		end: toCloudflareTime(end),
		endDate: end.toISOString().slice(0, 10),
		start: toCloudflareTime(start),
		startDate: start.toISOString().slice(0, 10),
	};
};

const fetchSiteTraffic = async (
	{
		apiToken,
		dateRange,
		fetcher,
		site,
	}: {
		apiToken: string;
		dateRange: ReturnType<typeof getLastOneMonthDateRange>;
		fetcher: Fetch;
		site: CloudflareSite;
	},
): Promise<Traffic> => {
	const response = await fetcher(CLOUDFLARE_GRAPHQL_API_URL, {
		body: JSON.stringify({
			query: lastOneMonthTrafficQuery,
			variables: {
				accountTag: site.accountTag,
				end: dateRange.end,
				endDate: dateRange.endDate,
				hostname: site.hostname,
				start: dateRange.start,
				startDate: dateRange.startDate,
				zoneTag: site.zoneTag,
			},
		}),
		headers: {
			'Authorization': `Bearer ${apiToken}`,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});

	if (!response.ok) {
		throw new Error(
			`Cloudflare GraphQL API request failed with ${response.status}: ${await response
				.text()}`,
		);
	}

	const payload = await response.json() as CloudflareGraphqlResponse;
	if (payload.errors?.length) {
		throw new Error(
			`Cloudflare GraphQL API returned errors: ${
				payload.errors.map((error) => error.message ?? 'Unknown error').join(
					', ',
				)
			}`,
		);
	}

	const account = payload.data?.viewer?.accounts?.[0];
	if (!account) {
		throw new Error(
			'Cloudflare GraphQL API did not return account traffic data.',
		);
	}

	const zone = payload.data?.viewer?.zones?.[0];
	if (!zone) {
		throw new Error(
			'Cloudflare GraphQL API did not return zone traffic data.',
		);
	}

	return {
		dataServed: account.traffic?.reduce(
			(total, group) => total + parseCountValue(group.sum?.edgeResponseBytes),
			0,
		) ?? 0,
		requests: account.traffic?.reduce(
			(total, group) => total + parseCountValue(group.count),
			0,
		) ?? 0,
		uniqueVisitors: zone.uniqueVisitors?.reduce(
			(total, group) => total + parseCountValue(group.uniq?.uniques),
			0,
		) ?? 0,
	};
};

const fetchLastOneMonthTraffic = async (
	{
		fetch: fetcher = globalThis.fetch,
		getEnv = (name) => Deno.env.get(name),
		now,
	}: FetchLastOneMonthTrafficOptions,
) => {
	const dateRange = getLastOneMonthDateRange(now());
	const site = getCloudflareSite(getEnv);
	const apiToken = getRequiredEnv(
		getEnv,
		'CLOUDFLARE_SI_API_TOKEN',
		'CLOUDFLARE_API_TOKEN',
	);
	const fetchedData = await fetchSiteTraffic({
		apiToken,
		dateRange,
		fetcher,
		site,
	});

	console.log(fetchedData);

	return fetchedData;
};

export const lastOneMonthTraffic = (
	options: LastOneMonthTrafficOptions = {},
): Promise<Traffic> => {
	const now = options.now ?? (() => new Date());
	if (cache && now().getTime() < cache.expiresAt) {
		return Promise.resolve(cache.traffic);
	}

	if (inFlightRequest) {
		return inFlightRequest;
	}

	const request = (async () => {
		try {
			const traffic = await fetchLastOneMonthTraffic({ ...options, now });
			cache = {
				expiresAt: now().getTime() + DAY_IN_MILLISECONDS,
				traffic,
			};
			return traffic;
		} finally {
			inFlightRequest = undefined;
		}
	})();

	inFlightRequest = request;
	return request;
};

export const lastOneMonthRequests = async (
	options: LastOneMonthTrafficOptions = {},
) => (await lastOneMonthTraffic(options)).requests;
