export class GithubApi {
	private cache = new Map<string, any>();

	public async getMentionSuggestions(
		mentionUrl: string
	): Promise<
		{
			type: "user";
			id: number;
			login: string;
			name: string;
		}[]
	> {
		if (this.cache.has(mentionUrl)) {
			return this.cache.get(mentionUrl);
		}

		const r = await fetch(mentionUrl, {
			method: "GET",
			headers: {
				accept: "application/json",
				"cache-control": "no-cache",
				pragma: "no-cache",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"x-requested-with": "XMLHttpRequest",
			},
		});

		const data = await r.json();
		this.cache.set(mentionUrl, data);
		return data;
	}

	public async getIssueSuggestions(
		issueUrl: string
	): Promise<{
		suggestions: {
			type: "issue" | "pr";
			id: number;
			number: number;
			title: string;
		}[];
	}> {
		if (this.cache.has(issueUrl)) {
			return this.cache.get(issueUrl);
		}

		const r = await fetch(issueUrl, {
			method: "GET",
			headers: {
				accept: "application/json",
				"cache-control": "no-cache",
				pragma: "no-cache",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"x-requested-with": "XMLHttpRequest",
			},
		});

		const data = await r.json();
		this.cache.set(issueUrl, data);
		return data;
	}
}
