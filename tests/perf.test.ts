import { describe, expect, it } from 'vitest';
import { MAX_ALIAS, parseAlias, planLine } from '../src/markup';
import { GROWTH_LIMIT, growth, pairedRatio } from './growth';

// Wall-clock limits (1,000 ms and 2,000 ms) depend on the speed of the runner; a CI runner can be 9 times slower than
// the agent Mac. Each guard divides two times that this test measures on the same machine, lowest time of each side
// over 5 rounds (s1103b ASSERT-B, Procedure AC).

/** One line with n pairs of aliased links: one code alias and one bold and italic alias in each pair. */
const linkLine = (n: number): string => Array.from({ length: n }, (_, i) => `[[Note ${i}|\`code ${i}\`]] and [[B|**bold** *it*]] and text. `).join('');
/** A hostile alias: n openers that never close, then a run of n underscores. */
const hostile = (n: number): string => '*a '.repeat(n) + '_'.repeat(n);
/**
 * Limit for big over small in the hostile alias guard. Agent Mac 2026-11-03: 0.03 with the size limit, 10.4 without it
 * (plant wam-no-cap). 2 is 60 times the measured value and 5 times below the value without the limit.
 */
const BOUND_LIMIT = 2;

describe('A10 large inputs', () => {
	it('plans 5,000 lines with links', () => {
		const lines = Array.from({ length: 5000 }, (_, i) => `Line ${i} with [[Note ${i}|\`code ${i}\`]] and [[B|**bold** *it*]] and text.`);
		let n = 0;
		for (const l of lines) n += planLine(l).length;
		expect(n).toBe(10000);
	});

	it('plans one line with 10,000 aliased links in linear time', () => {
		// 5,000 link pairs against 500 link pairs in one line. Linear work gives about 10, a scan of the line for each
		// link gives about 100.
		expect(planLine(linkLine(5000))).toHaveLength(10000);
		const g = growth((n) => {
			const line = linkLine(n);
			return () => planLine(line);
		}, 5000);
		expect(g.ratio, g.text).toBeLessThan(GROWTH_LIMIT);
	});

	it('parses a hostile alias of many delimiters in bounded time', () => {
		// Small: a hostile alias just under MAX_ALIAS, which the parser reads. Big: the same pattern at 12,000
		// characters, which the size limit keeps as text. A parser without the limit reads all of it, about 12 times
		// the small time or more. With the limit, the big alias costs less than the small one.
		const small = hostile(Math.floor(MAX_ALIAS / 4));
		const big = hostile(3000);
		expect(small.length).toBeLessThanOrEqual(MAX_ALIAS);
		expect(parseAlias(big)).toEqual([{ type: 'text', from: 0, to: big.length, text: big }]);
		const r = pairedRatio(
			() => parseAlias(small),
			() => parseAlias(big),
		);
		expect(r.ratio, r.text).toBeLessThan(BOUND_LIMIT);
	});

	it('keeps an alias over the size limit as text', () => {
		const alias = '**x** '.repeat(400);
		expect(parseAlias(alias)).toEqual([{ type: 'text', from: 0, to: alias.length, text: alias }]);
	});
});
