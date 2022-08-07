import { SExpr } from '../lib/Language';
import { Parser } from '../lib/Parser';
import { Serializer, PowerStyle } from './Serializer';

describe('serialize', (): void => {
    test('should parse basic expression conrrectly.', (): void => {
        const sampleInputString = '(-123! + 456 - 789 + 111 ^ 222 ^ 333 * 444) / 555';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(PowerStyle.PowFunction, false);
        const result: string = serializer.serialize(expr);
        expect(result).toBe('(((((-fact(123)) + 456) - 789) + (pow(111, pow(222, 333)) * 444)) / 555)');
    });

    test('should parse expression with variables conrrectly.', (): void => {
        const sampleInputString = '(-123 a ! + 456 b c ^ e ^ f * g) / 789 d >= 0';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(PowerStyle.PowMethod, false);
        const result: string = serializer.serialize(expr);
        expect(result).toBe('(((((-(123 * fact(a))) + (((456 * b) * c.pow(e.pow(f))) * g)) / 789) * d) >= 0)');
    });

    test('should parse expression with implicit product conrrectly.', (): void => {
        const sampleInputString = '-1/2 (a - b - 1) (a + b)';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(PowerStyle.PowMethod, false);
        const result: string = serializer.serialize(expr);
        expect(result).toBe('(-(((1 / 2) * ((a - b) - 1)) * (a + b)))');
    });
});
