/** S 式 */
class SExpr {
    constructor(atom, list = [], operatorRef = undefined) {
        this.atom = atom;
        this.list = list;
        this.operatorRef = operatorRef;
    }
    toString() {
        if (this.list.length == 0)
            return this.atom;
        const tokens = this.list.map((e) => e.toString());
        return `(${this.atom} ${tokens.join(' ')})`;
    }
}
/** 演算子 */
class Operator {
    constructor(name, symbols) {
        this.name = name;
        this.symbols = symbols;
    }
}
/** 先行演算子 */
class LeadingOp extends Operator {
}
/** 前置演算子（マイナス記号などの単項演算子） */
class Prefix extends LeadingOp {
    constructor(name, symbols, rightBindingPower) {
        super(name, symbols);
        this.rightBindingPower = rightBindingPower;
    }
}
/** カッコ */
class Paren extends LeadingOp {
}
/** 後続演算子 */
class FollowingOp extends Operator {
    constructor(name, symbols, leftBindingPower) {
        super(name, symbols);
        this.leftBindingPower = leftBindingPower;
    }
}
/** 後置演算子（階乗記号などの単項演算子） */
class Postfix extends FollowingOp {
}
/** 中置演算子（加減乗除の二項演算子など，後続演算子の一種として扱う） */
class Infix extends FollowingOp {
    constructor(name, symbols, leftBindingPower, rightBindingPower) {
        super(name, symbols, leftBindingPower);
        this.rightBindingPower = rightBindingPower;
    }
}
/** 言語クラス */
class Language {
    /** コンストラクタ */
    constructor(leadingOperators, followingOperators, defaultInfix) {
        this.leadingOperators = leadingOperators;
        this.followingOperators = followingOperators;
        this.__counter = 0;
        this.defaultInfix = defaultInfix;
        this.parenCloseSymbols = new Set();
        leadingOperators.forEach((leadingOp) => {
            if (leadingOp instanceof Paren) {
                this.parenCloseSymbols.add(leadingOp.symbols[1]);
            }
        });
    }
    parseExprBindingPower(tokens, minBindingPower) {
        const token = tokens.shift();
        if (token === undefined) {
            throw new Error('トークンが空です');
        }
        let leadingExpr = undefined;
        // 前置
        for (let i = 0; i < this.leadingOperators.length; ++i) {
            const leadingOp = this.leadingOperators[i];
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
                    const innerExpr = this.parseExprBindingPower(tokens, 0);
                    leadingExpr.list.push(innerExpr);
                    const after = tokens.shift();
                    if (after === undefined) {
                        throw new Error(`Token not found: expected ${leadingOp.symbols[j]}`);
                    }
                    if (after !== leadingOp.symbols[j]) {
                        throw new Error(`Invalid token: ${after}, expected ${leadingOp.symbols[j]}, tokens=${tokens.join(',')}`);
                        // (123 x + 456) とかだと after に x が入ったりする
                    }
                }
                // prefix 演算子の場合は後ろに続く式をパース
                if (leadingOp instanceof Prefix) {
                    const followingExpr = this.parseExprBindingPower(tokens, leadingOp.rightBindingPower);
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
            if (tokens.length === 0)
                return leadingExpr;
            // 後置
            let isMatched = false;
            for (let i = 0; i < this.followingOperators.length; ++i) {
                const followingOp = this.followingOperators[i];
                const token_after = tokens[0];
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
                        const innerExpr = this.parseExprBindingPower(tokens, 0);
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
                        const followingExpr = this.parseExprBindingPower(tokens, followingOp.rightBindingPower);
                        leadingExpr.list.push(followingExpr);
                    }
                    break;
                }
            }
            // 後続演算子にマッチしなかった
            if (!isMatched) {
                const token_after = tokens[0];
                if (this.parenCloseSymbols.has(token_after)) {
                    return leadingExpr;
                }
                else {
                    if (this.defaultInfix.leftBindingPower <= minBindingPower) {
                        return leadingExpr;
                    }
                    const followingExpr = this.parseExprBindingPower(tokens, this.defaultInfix.rightBindingPower);
                    leadingExpr = new SExpr(this.defaultInfix.name, [leadingExpr, followingExpr], this.defaultInfix);
                }
            }
        }
    }
    parseExpr(tokens) {
        this.__counter = 0;
        const clonedTokens = Array.from(tokens);
        const expr = this.parseExprBindingPower(clonedTokens, 0);
        if (clonedTokens.length > 0) {
            throw new Error(`Some tokens left: [${clonedTokens.join(', ')}], original = [${tokens.join(', ')}]`);
        }
        return expr;
    }
}

class Tokenizer {
    static tokenize(text) {
        const tokens = text.split(Tokenizer.splitRegExp).filter((token) => {
            if (token.length === 0)
                return false;
            else if (Tokenizer.whiteSpaceExp.test(token))
                return false;
            return true;
        });
        return tokens;
    }
}
Tokenizer.splitRegExp = /('(?:.*?)(?<!\\)'|"(?:.*?)(?<!\\)"|[a-zA-Z][a-zA-Z0-9]*|\d+|\s|_|,|\^|\+|-|\*|\/|!|:|>=|<=|>|<|=|\(|\)|\[|\]|{|})/;
Tokenizer.whiteSpaceExp = /^\s$/;
class Parser {
    static parseTokens(tokens) {
        return Parser.language.parseExpr(tokens);
    }
    static parse(text) {
        const tokens = Tokenizer.tokenize(text);
        return Parser.parseTokens(tokens);
    }
}
Parser.language = new Language([
    new Prefix('-', ['-'], 51),
    new Prefix('+', ['+'], 51),
    new Paren('paren', ['(', ')']),
    new Paren('paren_sq', ['[', ']']),
    new Paren('paren_wv', ['{', '}']),
], [
    new Postfix('!', ['!'], 102),
    new Infix(',', [','], 10, 11),
    new Infix('=', ['='], 21, 20),
    new Infix('>', ['>'], 21, 20),
    new Infix('<', ['<'], 21, 20),
    new Infix('>=', ['>='], 21, 20),
    new Infix('<=', ['<='], 21, 20),
    new Infix('mod', ['mod'], 40, 41),
    new Infix(':', [':'], 40, 41),
    new Infix('+', ['+'], 50, 51),
    new Infix('-', ['-'], 50, 51),
    new Infix('*', ['*'], 80, 81),
    new Infix('/', ['/'], 80, 81),
    new Infix('^', ['^'], 101, 100),
    new Infix('_', ['_'], 111, 110),
], new Infix('prod', [], 80, 81));

function assertIsDefined(val, name) {
    if (val === undefined) {
        throw new Error(`Expected '${name}' to be defined, but received undefined`);
    }
    else if (val === null) {
        throw new Error(`Expected '${name}' to be defined, but received null`);
    }
}
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg ?? 'assertion failed');
    }
}

const PowerStyle = {
    /** a ^ b */
    Hat: 0,
    /** a ** b */
    Asterisk: 1,
    /** pow(a, b) */
    PowFunction: 2,
    /** a.pow(b) */
    PowMethod: 3,
};
class Serializer {
    constructor(powerStyle = PowerStyle.PowMethod, wrapLeftHandOperandLiteral = false) {
        this.powerStyle = powerStyle;
        this.wrapLeftHandOperandLiteral = wrapLeftHandOperandLiteral;
    }
    serialize(expr) {
        if (expr.operatorRef instanceof LeadingOp) {
            if (expr.operatorRef instanceof Paren) {
                return `${expr.list.map((value) => this.serialize(value)).join(' ')}`;
            }
            else if (expr.operatorRef instanceof Prefix) {
                return `(${expr.operatorRef.symbols[0]}${expr.list
                    .map((value) => this.serialize(value))
                    .join(' ')})`;
            }
        }
        else if (expr.operatorRef instanceof FollowingOp) {
            if (expr.operatorRef instanceof Postfix) {
                if (expr.atom === '!') {
                    return `fact(${expr.list.map((value) => this.serialize(value)).join(' ')})`;
                }
                else {
                    return `${expr.atom}(${expr.operatorRef.symbols[0]}(${expr.list
                        .map((value) => this.serialize(value))
                        .join(' ')})`;
                }
            }
            else if (expr.operatorRef instanceof Infix) {
                if (expr.atom === '^') {
                    if (this.wrapLeftHandOperandLiteral && Serializer.re.test(expr.list[0].atom)) {
                        if (this.powerStyle === PowerStyle.Hat) {
                            return `(mint(${expr.list[0].atom}) ^ ${this.serialize(expr.list[1])})`;
                        }
                        else if (this.powerStyle === PowerStyle.Asterisk) {
                            return `(mint(${expr.list[0].atom}) ** ${this.serialize(expr.list[1])})`;
                        }
                        else if (this.powerStyle === PowerStyle.PowFunction) {
                            return `pow(${expr.list.map((value) => this.serialize(value)).join(', ')})`;
                        }
                        else {
                            return `mint(${this.serialize(expr.list[0])}).pow(${this.serialize(expr.list[1])})`;
                        }
                    }
                    if (this.powerStyle === PowerStyle.Hat) {
                        return `(${expr.list.map((value) => this.serialize(value)).join(' ^ ')})`;
                    }
                    else if (this.powerStyle === PowerStyle.Asterisk) {
                        return `(${expr.list.map((value) => this.serialize(value)).join(' ** ')})`;
                    }
                    else if (this.powerStyle === PowerStyle.PowFunction) {
                        return `pow(${expr.list.map((value) => this.serialize(value)).join(', ')})`;
                    }
                    else {
                        return `${this.serialize(expr.list[0])}.pow(${this.serialize(expr.list[1])})`;
                    }
                }
                else if (expr.atom === '_') {
                    return `(${expr.list.map((value) => this.serialize(value)).join('_')})`;
                }
                else {
                    const separator = expr.atom === 'prod' ? ' * ' : ` ${expr.atom} `;
                    if (this.wrapLeftHandOperandLiteral && Serializer.re.test(expr.list[0].atom)) {
                        return `(mint(${expr.list[0].atom})${separator}${this.serialize(expr.list[1])})`;
                    }
                    return `(${expr.list.map((value) => this.serialize(value)).join(separator)})`;
                }
            }
        }
        return expr.atom;
        // throw new Error(`Unknown expression: ${expr.toString()}`);
    }
}
Serializer.re = /^\d+$/;

void (() => {
    const inputElement = document.getElementById('js-wolfram2cpp-input');
    assertIsDefined(inputElement, 'inputElement');
    assert(inputElement instanceof HTMLTextAreaElement);
    const outputElement = document.getElementById('js-wolfram2cpp-output');
    assertIsDefined(outputElement, 'outputElement');
    assert(outputElement instanceof HTMLTextAreaElement);
    const buttonElement = document.getElementById('js-wolfram2cpp-convert');
    assertIsDefined(buttonElement, 'buttonElement');
    assert(buttonElement instanceof HTMLButtonElement);
    const powerStyleSelectElement = document.getElementById('js-wolfram2cpp-power-style');
    assertIsDefined(powerStyleSelectElement, 'powerStyleSelectElement');
    assert(powerStyleSelectElement instanceof HTMLSelectElement);
    const leftHandOperandLiteralWrapCheckbox = document.getElementById('js-wolfram2cpp-left-hand-operand-literal-wrap');
    assertIsDefined(leftHandOperandLiteralWrapCheckbox, 'leftHandOperandLiteralWrapCheckbox');
    assert(leftHandOperandLiteralWrapCheckbox instanceof HTMLInputElement);
    const copyButtonElement = document.getElementById('js-leetcode2cpp-copy-output');
    assertIsDefined(copyButtonElement, 'copyButtonElement');
    assert(copyButtonElement instanceof HTMLButtonElement);
    buttonElement.addEventListener('click', () => {
        const wolframString = inputElement.value;
        const expr = Parser.parse(wolframString);
        // const result = expr.toString();
        const powerStyle = Number(powerStyleSelectElement.value);
        const wrapLeftHandOperandLiteral = leftHandOperandLiteralWrapCheckbox.checked;
        const serializer = new Serializer(powerStyle, wrapLeftHandOperandLiteral);
        const result = serializer.serialize(expr);
        console.log(expr);
        outputElement.value = result;
        // const a = new SExpr('2');
        // const b = new SExpr('3');
        // const c = new SExpr('+', [a, b]);
        // const d = new SExpr('1');
        // const e = new SExpr('+', [d, c]);
        // console.log(e.toString());
    });
    copyButtonElement.addEventListener('click', () => {
        void navigator.clipboard.writeText(outputElement.value);
    });
})();
