import { Tokenizer, Parser } from './/Parser';
import { SExpr } from './Language';

describe('tokenizer', (): void => {
    test('should tokenize basic expression conrrectly.', (): void => {
        const sampleInputString = '1 * 2 + 3 * 4 - 5 / 6';
        const tokens: string[] = Tokenizer.tokenize(sampleInputString);
        expect(tokens).toEqual(['1', '*', '2', '+', '3', '*', '4', '-', '5', '/', '6']);
    });
});

describe('parser', (): void => {
    test('should parse basic expression conrrectly.', (): void => {
        const sampleInputString = '1 * 2 + 3 * 4 - 5 / 6';
        const expr: SExpr = Parser.parse(sampleInputString);
        expect(expr.toString()).toBe('(- (+ (* 1 2) (* 3 4)) (/ 5 6))');
    });
});
