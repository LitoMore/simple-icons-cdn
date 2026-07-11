const CLOUDFLARE_GRAPHQL_API_URL =
	'https://api.cloudflare.com/client/v4/graphql';
const CLOUDFLARE_SI_HOSTNAME = 'cdn.simpleicons.org';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const LAST_ONE_MONTH_IN_DAYS = 30;

let cache: { count: number; expiresAt: number } | undefined;
let inFlightRequest: Promise<number> | undefined;

type CloudflareGraphqlResponse = {
	data?: {
		viewer?: {
			accounts?: Array<{
				requests?: Array<{
					count?: number | string | null;
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

type LastOneMonthRequestsOptions = {
	fetch?: Fetch;
	getEnv?: (name: string) => string | undefined;
	now?: () => Date;
};

type FetchLastOneMonthRequestsOptions =
	& Omit<LastOneMonthRequestsOptions, 'now'>
	& { now: () => Date };

const lastOneMonthRequestsQuery = `
	query LastOneMonthRequests(
		$accountTag: string
		$zoneTag: string
		$hostname: string
		$start: Time
		$end: Time
	) {
		viewer {
			accounts(filter: { accountTag: $accountTag }) {
				requests: httpRequestsAdaptiveGroups(
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
		return formatWithSuffix(1_000_000_000, 'B');
	}

	if (absoluteValue >= 1_000_000) {
		return formatWithSuffix(1_000_000, 'M');
	}

	if (absoluteValue >= 1_000) {
		return formatWithSuffix(1_000, 'K');
	}

	return String(value);
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
		start: toCloudflareTime(start),
	};
};

const fetchLastOneMonthRequests = async (
	{
		fetch: fetcher = globalThis.fetch,
		getEnv = (name) => Deno.env.get(name),
		now,
	}: FetchLastOneMonthRequestsOptions,
) => {
	const dateRange = getLastOneMonthDateRange(now());
	const response = await fetcher(CLOUDFLARE_GRAPHQL_API_URL, {
		body: JSON.stringify({
			query: lastOneMonthRequestsQuery,
			variables: {
				accountTag: getRequiredEnv(
					getEnv,
					'CLOUDFLARE_SI_ACCOUNT_ID',
					'CLOUDFLARE_ACCOUNT_ID',
				),
				end: dateRange.end,
				hostname: CLOUDFLARE_SI_HOSTNAME,
				start: dateRange.start,
				zoneTag: getRequiredEnv(
					getEnv,
					'CLOUDFLARE_SI_ZONE_ID',
					'CLOUDFLARE_ZONE_ID',
				),
			},
		}),
		headers: {
			'Authorization': `Bearer ${
				getRequiredEnv(
					getEnv,
					'CLOUDFLARE_SI_API_TOKEN',
					'CLOUDFLARE_API_TOKEN',
				)
			}`,
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

	return account.requests?.reduce(
		(total, request) => total + parseCountValue(request.count),
		0,
	) ?? 0;
};

export const lastOneMonthRequests = (
	options: LastOneMonthRequestsOptions = {},
): Promise<number> => {
	const now = options.now ?? (() => new Date());
	if (cache && now().getTime() < cache.expiresAt) {
		console.log('cache hit');
		return Promise.resolve(cache.count);
	}

	if (inFlightRequest) {
		return inFlightRequest;
	}

	const request = (async () => {
		try {
			const count = await fetchLastOneMonthRequests({ ...options, now });
			cache = {
				count,
				expiresAt: now().getTime() + DAY_IN_MILLISECONDS,
			};
			return count;
		} finally {
			inFlightRequest = undefined;
		}
	})();

	inFlightRequest = request;
	return request;
};
