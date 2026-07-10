const CLOUDFLARE_GRAPHQL_API_URL =
	'https://api.cloudflare.com/client/v4/graphql';
const CLOUDFLARE_SI_HOSTNAME = 'cdn.simpleicons.org';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const LAST_ONE_MONTH_IN_DAYS = 30;
const README_FILE_URL = new URL('../README.md', import.meta.url);
const REQUESTS_BADGE_REGEX =
	/(https:\/\/img\.shields\.io\/badge\/requests-)([^"']+?)(-blue)/;

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

const getRequiredEnv = (...names: string[]) => {
	for (const name of names) {
		const value = Deno.env.get(name);
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

const formatCount = (value: number) => {
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

const updateReadmeBadge = async (formattedCount: string) => {
	const readme = await Deno.readTextFile(README_FILE_URL);
	const badgeValue = encodeURIComponent(`${formattedCount}/month`);
	const updatedReadme = readme.replace(
		REQUESTS_BADGE_REGEX,
		`$1${badgeValue}$3`,
	);

	if (updatedReadme === readme) {
		throw new Error('Could not find requests badge in README.md to update.');
	}

	await Deno.writeTextFile(README_FILE_URL, updatedReadme);
};

const getLastOneMonthDateRange = () => {
	const now = new Date();
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

const dateRange = getLastOneMonthDateRange();
const response = await fetch(CLOUDFLARE_GRAPHQL_API_URL, {
	body: JSON.stringify({
		query: lastOneMonthRequestsQuery,
		variables: {
			accountTag: getRequiredEnv(
				'CLOUDFLARE_SI_ACCOUNT_ID',
				'CLOUDFLARE_ACCOUNT_ID',
			),
			end: dateRange.end,
			hostname: CLOUDFLARE_SI_HOSTNAME,
			start: dateRange.start,
			zoneTag: getRequiredEnv('CLOUDFLARE_SI_ZONE_ID', 'CLOUDFLARE_ZONE_ID'),
		},
	}),
	headers: {
		'Authorization': `Bearer ${
			getRequiredEnv('CLOUDFLARE_SI_API_TOKEN', 'CLOUDFLARE_API_TOKEN')
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

const count = account.requests?.reduce(
	(total, request) => total + parseCountValue(request.count),
	0,
) ?? 0;

const formattedCount = formatCount(count);
await updateReadmeBadge(formattedCount);
console.log(formattedCount);
