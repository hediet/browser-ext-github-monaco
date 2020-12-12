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

	private previews = new Map<string, string>();

	public async getPreview(
		tabContainer: HTMLElement,
		text: string
	): Promise<string> {
		if (this.previews.has(text)) {
			return this.previews.get(text)!;
		}

		function Cn(e: any) {
			var t, n, o, s, r, i, a, c, l;
			const u = e.querySelector(".js-comment-field").value,
				d =
					null === (t = e.querySelector(".js-path")) || void 0 === t
						? void 0
						: t.value,
				m =
					null === (n = e.querySelector(".js-line-number")) ||
					void 0 === n
						? void 0
						: n.value,
				f =
					null === (o = e.querySelector(".js-start-line-number")) ||
					void 0 === o
						? void 0
						: o.value,
				p =
					null === (s = e.querySelector(".js-side")) || void 0 === s
						? void 0
						: s.value,
				h =
					null === (r = e.querySelector(".js-start-side")) ||
					void 0 === r
						? void 0
						: r.value,
				g =
					null === (i = e.querySelector(".js-start-commit-oid")) ||
					void 0 === i
						? void 0
						: i.value,
				b =
					null === (a = e.querySelector(".js-end-commit-oid")) ||
					void 0 === a
						? void 0
						: a.value,
				y =
					null === (c = e.querySelector(".js-base-commit-oid")) ||
					void 0 === c
						? void 0
						: c.value,
				v =
					null === (l = e.querySelector(".js-comment-id")) ||
					void 0 === l
						? void 0
						: l.value,
				w = new FormData();
			return (
				w.append("text", u),
				w.append(
					"authenticity_token",
					(function (e) {
						const t = e.querySelector(".js-data-preview-url-csrf"),
							n = e
								.closest("form")
								.elements.namedItem("authenticity_token");
						if (t instanceof HTMLInputElement) return t.value;
						if (n instanceof HTMLInputElement) return n.value;
						throw new Error(
							"Comment preview authenticity token not found"
						);
					})(e)
				),
				d && w.append("path", d),
				m && w.append("line_number", m),
				f && w.append("start_line_number", f),
				p && w.append("side", p),
				h && w.append("start_side", h),
				g && w.append("start_commit_oid", g),
				b && w.append("end_commit_oid", b),
				y && w.append("base_commit_oid", y),
				v && w.append("comment_id", v),
				w
			);
		}

		const previewUrl = tabContainer.getAttribute(
			"data-preview-url"
		) as string;

		console.log("use", previewUrl);

		const r = await fetch(previewUrl, {
			method: "POST",
			body: Cn(tabContainer),
			headers: {
				"cache-control": "no-cache",
				pragma: "no-cache",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"x-requested-with": "XMLHttpRequest",
			},
		});

		const preview = await r.text();
		this.previews.set(text, preview);
		return preview;
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
