/** S 式 */
export class SExpr {
    atom: string;
    list: SExpr[];
    operatorRef: Operator | undefined;

    constructor(atom: string, list: SExpr[] = [], operatorRef: Operator | undefined = undefined) {
        this.atom = atom;
        this.list = list;
        this.operatorRef = operatorRef;
    }

    toString(): string {
        if (this.list.length == 0) return this.atom;
        const tokens = this.list.map((e: SExpr): string => e.toString());
        return `(${this.atom} ${tokens.join(' ')})`;
    }
}

/** 演算子 */
export class Operator {
    name: string;
    symbols: string[];
    constructor(name: string, symbols: string[]) {
        this.name = name;
        this.symbols = symbols;
    }
}

/** 先行演算子 */
export class LeadingOp extends Operator {}
/** 前置演算子（マイナス記号などの単項演算子） */
export class Prefix extends LeadingOp {
    public rightBindingPower: number;
    constructor(name: string, symbols: string[], rightBindingPower: number) {
        super(name, symbols);
        this.rightBindingPower = rightBindingPower;
    }
}
/** カッコ */
export class Paren extends LeadingOp {}

/** 後続演算子 */
export class FollowingOp extends Operator {
    leftBindingPower: number;
    constructor(name: string, symbols: string[], leftBindingPower: number) {
        super(name, symbols);
        this.leftBindingPower = leftBindingPower;
    }
}
/** 後置演算子（階乗記号などの単項演算子） */
export class Postfix extends FollowingOp {}
/** 中置演算子（加減乗除の二項演算子など，後続演算子の一種として扱う） */
export class Infix extends FollowingOp {
    rightBindingPower: number;
    constructor(name: string, symbols: string[], leftBindingPower: number, rightBindingPower: number) {
        super(name, symbols, leftBindingPower);
        this.rightBindingPower = rightBindingPower;
    }
}

/** 言語クラス */
export class Language {
    /** 先行演算子 */
    leadingOperators: LeadingOp[];
    /** 後続演算子 */
    followingOperators: FollowingOp[];
    /** counter */
    __counter: number;
    /** 項同士が隣接している場合に用いる中置演算子 */
    defaultInfix: Infix;
    /** カッコの閉じ記号の集合 */
    parenCloseSymbols: Set<string>;

    /** コンストラクタ */
    constructor(leadingOperators: LeadingOp[], followingOperators: FollowingOp[], defaultInfix: Infix) {
        this.leadingOperators = leadingOperators;
        this.followingOperators = followingOperators;
        this.__counter = 0;
        this.defaultInfix = defaultInfix;

        this.parenCloseSymbols = new Set<string>();
        leadingOperators.forEach((leadingOp: LeadingOp): void => {
            if (leadingOp instanceof Paren) {
                this.parenCloseSymbols.add(leadingOp.symbols[1]);
            }
        });
    }

    parseExprBindingPower(tokens: string[], minBindingPower: number): SExpr {
        const token = tokens.shift();
        if (token === undefined) {
            throw new Error('トークンが空です');
        }
        let leadingExpr: SExpr | undefined = undefined;

        // 前置
        for (let i = 0; i < this.leadingOperators.length; ++i) {
            const leadingOp: LeadingOp = this.leadingOperators[i];

            // 先行演算子にマッチ
            if (token === leadingOp.symbols[0]) {
                leadingExpr = new SExpr(leadingOp.name, [], leadingOp);
                // カッコの中身が空の場合の処理
                if (leadingOp instanceof Paren && tokens.length > 0 && tokens[0] === leadingOp.symbols[1]) {
                    tokens.shift();
                    break;
                }
                // 記号の内側部分
                for (let j = 1; j < leadingOp.symbols.length; ++j) {
                    const innerExpr: SExpr = this.parseExprBindingPower(tokens, 0);
                    leadingExpr.list.push(innerExpr);

                    const after = tokens.shift();
                    if (after === undefined) {
                        throw new Error(`Token not found: expected ${leadingOp.symbols[j]}`);
                    }
                    if (after !== leadingOp.symbols[j]) {
                        throw new Error(
                            `Invalid token: ${after}, expected ${leadingOp.symbols[j]}, tokens=${tokens.join(',')}`
                        );
                        // (123 x + 456) とかだと after に x が入ったりする
                    }
                }
                // prefix 演算子の場合は後ろに続く式をパース
                if (leadingOp instanceof Prefix) {
                    const followingExpr: SExpr = this.parseExprBindingPower(tokens, leadingOp.rightBindingPower);
                    leadingExpr.list.push(followingExpr);
                }
                break;
            }
        }
        if (leadingExpr === undefined) {
            leadingExpr = new SExpr(token);
        }

        for (;;) {
            this.__counter++;
            if (this.__counter >= 10000000) {
                console.log(tokens);
                throw new Error('無限ループしているようです．');
            }
            if (tokens.length === 0) return leadingExpr;

            // 後置
            let isMatched = false;
            for (let i = 0; i < this.followingOperators.length; ++i) {
                const followingOp: FollowingOp = this.followingOperators[i];
                const token_after: string = tokens[0];

                // 後続演算子にマッチ
                if (token_after === followingOp.symbols[0]) {
                    isMatched = true;
                    // 後続演算子の束縛力が小さいなら`return`
                    if (followingOp.leftBindingPower <= minBindingPower) {
                        return leadingExpr;
                    }

                    tokens.shift();
                    leadingExpr = new SExpr(followingOp.name, [leadingExpr], followingOp);

                    // 記号の内側部分
                    for (let j = 1; j < followingOp.symbols.length; ++j) {
                        const innerExpr: SExpr = this.parseExprBindingPower(tokens, 0);
                        leadingExpr.list.push(innerExpr);

                        const after = tokens.shift();
                        if (after === undefined) {
                            throw new Error(`Token not found: expected ${followingOp.symbols[j]}`);
                        }
                        if (after !== followingOp.symbols[j]) {
                            throw new Error(`Invalid token: ${after}, expected ${followingOp.symbols[j]}`);
                        }
                    }

                    // infix演算子の場合は後ろに続く式をパース
                    if (followingOp instanceof Infix) {
                        const followingExpr: SExpr = this.parseExprBindingPower(tokens, followingOp.rightBindingPower);
                        leadingExpr.list.push(followingExpr);
                    }

                    break;
                }
            }

            // 後続演算子にマッチしなかった
            if (!isMatched) {
                const token_after: string = tokens[0];
                if (this.parenCloseSymbols.has(token_after)) {
                    return leadingExpr;
                } else {
                    if (this.defaultInfix.leftBindingPower <= minBindingPower) {
                        return leadingExpr;
                    }
                    const followingExpr: SExpr = this.parseExprBindingPower(
                        tokens,
                        this.defaultInfix.rightBindingPower
                    );
                    leadingExpr = new SExpr(this.defaultInfix.name, [leadingExpr, followingExpr], this.defaultInfix);
                }
            }
        }
    }

    parseExpr(tokens: string[]): SExpr {
        this.__counter = 0;
        const clonedTokens = Array.from(tokens);
        const expr: SExpr = this.parseExprBindingPower(clonedTokens, 0);
        if (clonedTokens.length > 0) {
            throw new Error(`Some tokens left: [${clonedTokens.join(', ')}], original = [${tokens.join(', ')}]`);
        }
        return expr;
    }
}
