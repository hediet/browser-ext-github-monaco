type StatePredicate<TState> =
	| (TState extends string ? TState : never)
	| ((state: TState) => string);

export abstract class RulesBuilder<TTokenInfo extends {}, TState> {
	protected readonly rules = new Array<Rule<TTokenInfo, TState>>();
	protected sealed = false;

	addRule(rule: Rule<TTokenInfo, TState>): void;
	addRule(
		matcher: RegExp,
		tokenInfo: TTokenInfo | (TTokenInfo | null)[]
	): void;
	addRule(
		...args:
			| [matcher: RegExp, tokenInfo: TTokenInfo | (TTokenInfo | null)[]]
			| [rule: Rule<TTokenInfo, TState>]
	): void {
		this.ensureNotSealed();
		if (args.length === 1) {
			this.rules.push(args[0]);
		} else {
			const tokenInfo = args[1];
			const x: RegExpRule<
				TTokenInfo,
				TState
			>["getTokens"] = Array.isArray(tokenInfo)
				? (match, state) => {
						if (match.length - 1 !== tokenInfo.length) {
							throw new Error(
								"Number of groups does not match number of provided tokens!"
							);
						}
						const result = new Array<Token<TTokenInfo, TState>>();
						let offset = 0;
						for (let i = 0; i < match.length - 1; i++) {
							const groupMatch = match[i + 1];
							if (groupMatch === undefined) {
								continue;
							}
							const info = tokenInfo[i];
							if (info) {
								result.push({
									offset: match.index + offset,
									length: groupMatch.length,
									text: groupMatch,
									state,
									...info,
								});
							}
							offset += groupMatch.length;
						}

						if (offset !== match[0].length) {
							throw new Error(
								"Groups must partionize the matched string!"
							);
						}
						return result;
				  }
				: (match, state) => [
						{
							offset: match.index,
							length: match[0].length,
							text: match[0],
							state,
							...tokenInfo,
						},
				  ];

			this.rules.push(new RegExpRule(args[0], x));
		}
	}

	conditional(
		condition: StatePredicate<TState>,
		fn: (b: RulesBuilder<TTokenInfo, TState>) => void
	): void {
		this.ensureNotSealed();
		const b = new InnerRulesBuilder<TTokenInfo, TState>();
		this.addRule(new ConditionalRule(condition, new ComposedRule(b.rules)));
		fn(b);
		b.sealed = true;
	}

	protected ensureNotSealed() {
		if (this.sealed) {
			throw new Error(
				"Tokenizer Builder is sealed and cannot be modified anymore!"
			);
		}
	}
}

class InnerRulesBuilder<TTokenInfo extends {}, TState> extends RulesBuilder<
	TTokenInfo,
	TState
> {
	public get allRules() {
		return this.rules;
	}
}

export class TokenizerBuilder<
	TTokenInfo extends {},
	TState = undefined
> extends RulesBuilder<TTokenInfo, TState> {
	constructor(private readonly startingState: TState) {
		super();
	}

	build(): Tokenizer<TTokenInfo, TState> {
		return new Tokenizer(new ComposedRule(this.rules), this.startingState);
	}
}

export type Token<TTokenInfo extends {}, TState> = TTokenInfo & {
	offset: number;
	length: number;
	state: TState;
	text: string;
};

type MatchResult<TTokenInfo, TState> =
	| {
			matches: true;
			nextState: TState;
			newOffset: number;
			tokens: Token<TTokenInfo, TState>[];
	  }
	| {
			matches: false;
			/**
			 * Must be at least `offset + 1`.
			 */
			offsetOfNextPossibleMatch: number;
	  };

abstract class Rule<TTokenInfo, TState> {
	abstract match(
		state: TState,
		text: string,
		offset: number
	): MatchResult<TTokenInfo, TState>;
}

class RegExpRule<TTokenInfo extends {}, TState> extends Rule<
	TTokenInfo,
	TState
> {
	private readonly regexp: RegExp;

	constructor(
		regexp: RegExp,
		private readonly getTokens: (
			match: RegExpExecArray,
			state: TState
		) => Token<TTokenInfo, TState>[]
	) {
		super();
		this.regexp = new RegExp(regexp.source, "g");
	}

	match(
		state: any,
		text: string,
		offset: number
	): MatchResult<TTokenInfo, TState> {
		this.regexp.lastIndex = offset;
		const result = this.regexp.exec(text);

		if (result && result.index === offset) {
			return {
				matches: true,
				nextState: state,
				tokens: this.getTokens(result, state),
				newOffset: this.regexp.lastIndex,
			};
		} else {
			return {
				matches: false,
				offsetOfNextPossibleMatch: result ? result.index : text.length,
			};
		}
	}
}

class ConditionalRule<TTokenInfo extends {}, TState> extends Rule<
	TTokenInfo,
	TState
> {
	constructor(
		private readonly condition: StatePredicate<TState>,
		private readonly rule: Rule<TTokenInfo, TState>
	) {
		super();
	}

	/*
    TODO caching
	private lastText: string = "";
	private lastOffset: number = 0;
	private lastOffsetOfNextPossibleMatch: number = 0;
    */

	match(
		state: any,
		text: string,
		offset: number
	): MatchResult<TTokenInfo, TState> {
		if (
			typeof this.condition === "function"
				? this.condition(state)
				: state === this.condition
		) {
			return this.rule.match(state, text, offset);
		} else {
			return {
				matches: false,
				offsetOfNextPossibleMatch: offset + 1,
			};
		}
	}
}

class ComposedRule<TTokenInfo extends {}, TState> extends Rule<
	TTokenInfo,
	TState
> {
	constructor(private readonly rules: Rule<TTokenInfo, TState>[]) {
		super();
	}

	match(
		state: TState,
		text: string,
		offset: number
	): MatchResult<TTokenInfo, TState> {
		let smallestOffsetOfNextPossibleMatch = text.length;

		for (const r of this.rules) {
			const m = r.match(state, text, offset);
			if (m.matches) {
				return m;
			} else {
				if (
					m.offsetOfNextPossibleMatch <
					smallestOffsetOfNextPossibleMatch
				) {
					smallestOffsetOfNextPossibleMatch =
						m.offsetOfNextPossibleMatch;
				}
			}
		}

		return {
			matches: false,
			offsetOfNextPossibleMatch: smallestOffsetOfNextPossibleMatch,
		};
	}
}

export class Tokenizer<TTokenInfo extends {}, TState> {
	constructor(
		private readonly rule: Rule<TTokenInfo, TState>,
		private readonly startingState: TState
	) {}

	findFirstTokenAt(
		text: string,
		position: number,
		endInclusive = false
	): Token<TTokenInfo, TState> | undefined {
		const tokens = this.getAllTokens(text);
		const o = endInclusive ? 1 : 0;
		for (const t of tokens) {
			if (t.offset <= position && position < t.offset + t.length + o) {
				return t;
			}
		}
		return undefined;
	}

	getAllTokens(text: string): Token<TTokenInfo, TState>[] {
		let state = this.startingState;
		let offset = 0;

		const result = Array<Token<TTokenInfo, TState>>();
		while (offset < text.length) {
			const m = this.rule.match(state, text, offset);
			if (m.matches) {
				if (m.newOffset < offset + 1) {
					throw new Error("Offsets must increase!");
				}
				offset = m.newOffset;
				state = m.nextState;
				result.push(...m.tokens);
			} else {
				if (m.offsetOfNextPossibleMatch < offset + 1) {
					throw new Error("Offsets must increase!");
				}
				offset = m.offsetOfNextPossibleMatch;
			}
		}
		return result;
	}
}

function createTextTokenizer() {
	const b = new TokenizerBuilder<{
		kind: "reference" | "mention" | "smiley";
	}>(undefined);
	b.addRule(/(#)([a-zA-Z0-9]*)/, [null, { kind: "reference" }]);
	b.addRule(/(@)([a-zA-Z0-9]*)/, [null, { kind: "mention" }]);
	b.addRule(/(:)([a-zA-Z0-9]*)(:?)/, [null, { kind: "smiley" }, null]);

	return b.build();
}
