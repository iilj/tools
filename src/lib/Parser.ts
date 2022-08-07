import { SExpr, Language, Prefix, Paren, Postfix, Infix, LeadingOp, FollowingOp } from './Language';

export class Tokenizer {
    static splitRegExp =
        /('(?:.*?)(?<!\\)'|"(?:.*?)(?<!\\)"|[a-zA-Z][a-zA-Z0-9]*|\d+|\s|_|,|\^|\+|-|\*|\/|!|:|>=|<=|>|<|=|\(|\)|\[|\]|{|})/;
    static whiteSpaceExp = /^\s$/;
    static tokenize(text: string): string[] {
        const tokens: string[] = text.split(Tokenizer.splitRegExp).filter((token: string): boolean => {
            if (token.length === 0) return false;
            else if (Tokenizer.whiteSpaceExp.test(token)) return false;
            return true;
        });
        return tokens;
    }
}

export class Parser {
    private static language = new Language(
        [
            new Prefix('-', ['-'], 51),
            new Prefix('+', ['+'], 51),
            new Paren('paren', ['(', ')']),
            new Paren('paren_sq', ['[', ']']),
            new Paren('paren_wv', ['{', '}']),
        ] as LeadingOp[],
        [
            new Postfix('!', ['!'], 102),
            new Infix(',', [','], 10, 11),
            new Infix('=', ['='], 21, 20),
            new Infix('>', ['>'], 21, 20),
            new Infix('<', ['<'], 21, 20),
            new Infix('>=', ['>='], 21, 20),
            new Infix('<=', ['<='], 21, 20),
            new Infix('mod', ['mod'], 40, 41),
            new Infix(':', [':'], 40, 41),
            new Infix('+', ['+'], 50, 51), // 左結合にしたいので 50 < 51
            new Infix('-', ['-'], 50, 51), // 左結合にしたいので 50 < 51
            new Infix('*', ['*'], 80, 81),
            new Infix('/', ['/'], 80, 81),
            new Infix('^', ['^'], 101, 100), // 右結合にしたいので 101 > 100
            new Infix('_', ['_'], 111, 110),
        ] as FollowingOp[],
        new Infix('prod', [], 80, 81)
    );

    static parseTokens(tokens: string[]): SExpr {
        return Parser.language.parseExpr(tokens);
    }

    static parse(text: string): SExpr {
        const tokens: string[] = Tokenizer.tokenize(text);
        return Parser.parseTokens(tokens);
    }
}
