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

function assertIsIntVectorFormatType(val) {
    if (val !== 'normal' && val !== 'binary_tree' && val !== 'linked_list') {
        throw new Error(`Expected 'val' to be IntVectorFormatType, but received ${val}`);
    }
}
class Serializer {
    constructor(appendCallMethod, intVectorFormat) {
        this.appendCallMethod = appendCallMethod;
        this.intVectorFormat = intVectorFormat;
        this.variables = [];
    }
    serializeInner(expr, deleteSection, isVarDefinition = false) {
        if (isVarDefinition) {
            if (Serializer.regExpInt.test(expr.atom)) {
                const variableName = `num${this.variables.length}`;
                this.variables.push(variableName);
                return `int ${variableName} = ${expr.atom};\n`;
            }
            else if (Serializer.regExpString.test(expr.atom)) {
                const variableName = `str${this.variables.length}`;
                this.variables.push(variableName);
                return `string ${variableName} = ${expr.atom};\n`;
            }
            else if (expr.atom === 'paren_sq') {
                // dfs して深さを求める
                const [depth, valtype] = Serializer.dfsParen(expr, 0);
                // TODO
                if (depth == 1 && valtype == 'int') {
                    if (this.intVectorFormat === 'binary_tree') {
                        const variableName = `root_${this.variables.length}`;
                        this.variables.push(variableName);
                        return Serializer.generateBinaryTreeExpression(expr, deleteSection, variableName);
                    }
                    if (this.intVectorFormat === 'linked_list') {
                        const variableName = `head_${this.variables.length}`;
                        this.variables.push(variableName);
                        return Serializer.generateLinkedListExpression(expr, deleteSection, variableName);
                    }
                }
                const variableName = `vec${this.variables.length}`;
                this.variables.push(variableName);
                const vectorType = `${'vector<'.repeat(depth)}${valtype}${'>'.repeat(depth)}`;
                let rhs = this.serializeInner(expr, deleteSection, false);
                if (valtype === 'char')
                    rhs = rhs.replace(/"/g, "'");
                return `${vectorType} ${variableName} = ${rhs};\n`;
            }
            else {
                return this.serializeInner(expr, deleteSection, false);
            }
        }
        if (expr.operatorRef instanceof LeadingOp) {
            if (expr.operatorRef instanceof Paren) {
                return `{${expr.list
                    .map((value) => this.serializeInner(value, deleteSection))
                    .join(' ')}}`;
            }
            else if (expr.operatorRef instanceof Prefix) {
                return `${expr.operatorRef.symbols[0]}${expr.list
                    .map((value) => this.serializeInner(value, deleteSection))
                    .join(' ')}`;
            }
        }
        else if (expr.operatorRef instanceof FollowingOp) {
            if (expr.operatorRef instanceof Postfix) {
                return `${expr.atom}(${expr.operatorRef.symbols[0]}(${expr.list
                    .map((value) => this.serializeInner(value, deleteSection))
                    .join(' ')})`;
            }
            else if (expr.operatorRef instanceof Infix) {
                const separator = ` ${expr.atom} `;
                if (expr.atom === '=') {
                    this.variables.push(expr.list[0].atom);
                    // 右辺によって型を付与する
                    if (Serializer.regExpInt.test(expr.list[1].atom)) {
                        // num = 123
                        return `int ${expr.list[0].atom} = ${expr.list[1].atom};\n`;
                    }
                    else if (expr.list[1].operatorRef instanceof Prefix &&
                        Serializer.regExpInt.test(expr.list[1].list[0].atom)) {
                        // num = -123
                        return `int ${expr.list[0].atom} = ${expr.list[1].atom}${expr.list[1].list[0].atom};\n`;
                    }
                    else if (Serializer.regExpString.test(expr.list[1].atom)) {
                        // str = "abc"
                        return `string ${expr.list[0].atom} = ${expr.list[1].atom};\n`;
                    }
                    else if (expr.list[1].atom === 'paren_sq') {
                        // dfs して深さを求める
                        const [depth, valtype] = Serializer.dfsParen(expr.list[1], 0);
                        if (depth == 1 && valtype == 'int') {
                            if (this.intVectorFormat === 'binary_tree') {
                                return Serializer.generateBinaryTreeExpression(expr.list[1], deleteSection, expr.list[0].atom);
                            }
                            if (this.intVectorFormat === 'linked_list') {
                                return Serializer.generateLinkedListExpression(expr.list[1], deleteSection, expr.list[0].atom);
                            }
                        }
                        const vectorType = `${'vector<'.repeat(depth)}${valtype}${'>'.repeat(depth)}`;
                        let rhs = this.serializeInner(expr.list[1], deleteSection);
                        if (valtype === 'char')
                            rhs = rhs.replace(/"/g, "'");
                        return `${vectorType} ${expr.list[0].atom} = ${rhs};\n`;
                    }
                }
                else if (expr.atom === ',') {
                    if (expr.list[1].atom === '=') {
                        // 変数定義同士の間の「,」は変数定義側で「;\n」を付けるので今回は何も付けない
                        return expr.list
                            .map((value) => this.serializeInner(value, deleteSection))
                            .join('');
                    }
                    else {
                        return expr.list
                            .map((value) => this.serializeInner(value, deleteSection))
                            .join(', ');
                    }
                }
                else if (expr.atom === 'prod') {
                    // クラスを実装する問題への対応
                    if (expr.list[0].atom === 'prod') {
                        // 配列が 3 つ続いた
                        // 1つ目はメソッド名：["Bitset", "fix", "fix", "flip", "all", "unfix", ...]
                        // 2つ目は引数：[[5], [3], [1], [], [], [0], [], [], [0], [], []]
                        // 3つ目は戻り値：[null, null, null, null, false, null, null, true, null, 2, "01010"]
                        const [depth1, valtype1] = Serializer.dfsParen(expr.list[0].list[0], 0);
                        const [depth2] = Serializer.dfsParen(expr.list[0].list[1], 0);
                        const [depth3] = Serializer.dfsParen(expr.list[1], 0);
                        if (depth1 === 1 && depth2 === 2 && depth3 === 1 && valtype1 === 'string') {
                            const methodNames = Serializer.dfsCreateVector(expr.list[0].list[0]);
                            const methodArguments = Serializer.dfsCreateVector(expr.list[0].list[1]);
                            const methodReturnValues = Serializer.dfsCreateVector(expr.list[1]);
                            assert(methodNames.length === methodArguments.length);
                            assert(methodNames.length === methodReturnValues.length);
                            let ret = '';
                            for (let i = 0; i < methodNames.length; ++i) {
                                if (i === 0) {
                                    ret += `${Serializer.recursiveStringArrayToString(methodNames[0], true)} obj(${Serializer.recursiveStringArrayToString(methodArguments[0])});\n`;
                                }
                                else {
                                    if (methodReturnValues[i] === 'null') {
                                        // 戻り値なしの呼び出し
                                        ret += `obj.${Serializer.recursiveStringArrayToString(methodNames[i], true)}(${Serializer.recursiveStringArrayToString(methodArguments[i])});\n`;
                                    }
                                    else {
                                        // 戻り値ありの呼び出し
                                        ret += `assert(obj.${Serializer.recursiveStringArrayToString(methodNames[i], true)}(${Serializer.recursiveStringArrayToString(methodArguments[i])}) == ${Serializer.recursiveStringArrayToString(methodReturnValues[i])});\n`;
                                    }
                                }
                            }
                            return ret;
                        }
                    }
                    // 後ろのものはここで型を付与して，前のものは再帰的に処理する
                    let ret = this.serializeInner(expr.list[0], deleteSection, true);
                    if (Serializer.regExpInt.test(expr.list[1].atom)) {
                        const variableName = `num${this.variables.length}`;
                        this.variables.push(variableName);
                        ret += `int ${variableName} = ${expr.list[1].atom};\n`;
                    }
                    else if (Serializer.regExpString.test(expr.list[1].atom)) {
                        const variableName = `str${this.variables.length}`;
                        this.variables.push(variableName);
                        ret += `string ${variableName} = ${expr.list[1].atom};\n`;
                    }
                    else if (expr.list[1].atom === 'paren_sq') {
                        // dfs して深さを求める
                        const [depth, valtype] = Serializer.dfsParen(expr.list[1], 0);
                        if (depth == 1 && valtype == 'int') {
                            if (this.intVectorFormat === 'binary_tree') {
                                return Serializer.generateBinaryTreeExpression(expr, deleteSection);
                            }
                            if (this.intVectorFormat === 'linked_list') {
                                return Serializer.generateLinkedListExpression(expr, deleteSection);
                            }
                        }
                        const variableName = `vec${this.variables.length}`;
                        this.variables.push(variableName);
                        const vectorType = `${'vector<'.repeat(depth)}${valtype}${'>'.repeat(depth)}`;
                        let rhs = this.serializeInner(expr.list[1], deleteSection);
                        if (valtype === 'char')
                            rhs = rhs.replace(/"/g, "'");
                        ret += `${vectorType} ${variableName} = ${rhs};\n`;
                    }
                    else {
                        ret += `${this.serializeInner(expr.list[1], deleteSection)};\n`;
                    }
                    return ret;
                }
                return `${expr.list
                    .map((value) => this.serializeInner(value, deleteSection))
                    .join(separator)}`;
            }
        }
        return expr.atom;
    }
    serialize(expr) {
        this.variables = [];
        const deleteSection = [];
        let ret = this.serializeInner(expr, deleteSection, true);
        if (this.appendCallMethod) {
            ret += '\n'; // 空行
            ret += 'Solution sol;\n';
            ret += `auto ans = sol.HOGE(${this.variables.join(', ')});\n`;
            ret += 'dump(ans);';
        }
        if (deleteSection.length > 0) {
            ret += '\n';
            ret += deleteSection.join('');
        }
        return ret;
    }
    static dfsParen(expr, outerDepth) {
        if (expr.operatorRef === undefined) {
            if (Serializer.regExpInt.test(expr.atom)) {
                return [outerDepth, 'int'];
            }
            else if (Serializer.regExpString.test(expr.atom)) {
                if (expr.atom.length === 3) {
                    return [outerDepth, 'char'];
                }
                else {
                    return [outerDepth, 'string'];
                }
            }
            else {
                return [outerDepth, 'unknown'];
            }
        }
        const currDepth = expr.operatorRef instanceof Paren ? outerDepth + 1 : outerDepth;
        let maxDepth = currDepth;
        let valType = 'unknown';
        expr.list.forEach((childExpr) => {
            const [tmpDepth, tmpType] = Serializer.dfsParen(childExpr, currDepth);
            maxDepth = Math.max(maxDepth, tmpDepth);
            if (tmpType !== 'unknown') {
                if (valType === 'string' && tmpType === 'char') ;
                else {
                    valType = tmpType;
                }
            }
        });
        return [maxDepth, valType];
    }
    static dfsCreateVectorInner(expr, curArray, prefix = '') {
        if (expr.operatorRef === undefined) {
            curArray.push(`${prefix}${expr.atom}`);
        }
        if (expr.atom === '-') {
            Serializer.dfsCreateVectorInner(expr.list[0], curArray, expr.atom);
            return;
        }
        if (expr.atom === ',') {
            expr.list.forEach((childExpr) => {
                Serializer.dfsCreateVectorInner(childExpr, curArray);
            });
            return;
        }
        if (expr.atom === 'paren_sq') {
            if (expr.list.length === 0) {
                curArray.push([]);
                return;
            }
            const newArray = [];
            Serializer.dfsCreateVectorInner(expr.list[0], newArray);
            curArray.push(newArray);
            return;
        }
        return;
    }
    static dfsCreateVector(expr) {
        const ret = [];
        Serializer.dfsCreateVectorInner(expr, ret);
        return ret[0];
    }
    static recursiveStringArrayToStringInner(recursiveStringArray, ret, removeQuote) {
        recursiveStringArray.forEach((val) => {
            if (typeof val === 'string') {
                if (removeQuote)
                    ret.push(val.substring(1, val.length - 1));
                else
                    ret.push(val);
            }
            else {
                Serializer.recursiveStringArrayToStringInner(val, ret, removeQuote);
            }
        });
    }
    static recursiveStringArrayToString(recursiveStringArray, removeQuote = false) {
        if (typeof recursiveStringArray === 'string') {
            if (removeQuote)
                return recursiveStringArray.substring(1, recursiveStringArray.length - 1);
            return recursiveStringArray;
        }
        const ret = [];
        Serializer.recursiveStringArrayToStringInner(recursiveStringArray, ret, removeQuote);
        return ret.join(', ');
    }
    static dfsCollectValues(expr) {
        if (expr.operatorRef === undefined) {
            return [expr.atom];
        }
        if (expr.atom === '-') {
            return Serializer.dfsCollectValues(expr.list[0]).map((v) => `-${v}`);
        }
        if (expr.atom === ',') {
            const ret = expr.list.reduce((prevArr, childExpr) => {
                return prevArr.concat(Serializer.dfsCollectValues(childExpr));
            }, []);
            return ret;
        }
        if (expr.atom === 'paren_sq') {
            if (expr.list.length === 0)
                return [];
            return Serializer.dfsCollectValues(expr.list[0]);
        }
        return [];
    }
    static generateBinaryTreeExpression(expr, deleteSection, variableName = 'root') {
        const values = Serializer.dfsCollectValues(expr);
        const left = Array(values.length);
        const right = Array(values.length);
        values.forEach((val, index) => {
            if (val == 'null')
                return;
            if (index % 2 == 1) {
                left[(index - 1) / 2] = index;
            }
            else {
                right[(index - 2) / 2] = index;
            }
        });
        const declarations = [];
        values.forEach((val, index) => {
            if (val == 'null')
                return;
            const l = left[index];
            const r = right[index];
            const leftPtr = l == undefined ? 'nullptr' : `nodes_${variableName}[${l}]`;
            const rightPtr = r == undefined ? 'nullptr' : `nodes_${variableName}[${r}]`;
            declarations.push(`nodes_${variableName}[${index}] = new TreeNode(${val}, ${leftPtr}, ${rightPtr});\n`);
        });
        declarations.reverse();
        let ret = `vector<TreeNode *> nodes_${variableName}(${values.length}, nullptr);\n`;
        ret += declarations.join('');
        ret += `TreeNode *${variableName} = nodes_${variableName}[0];\n`;
        deleteSection.push('\n');
        deleteSection.push(`for (TreeNode *node : nodes_${variableName}) { // このブロックは最後に記述する\n`);
        deleteSection.push('    if (node != nullptr) delete node;\n');
        deleteSection.push('}\n');
        return ret;
    }
    static generateLinkedListExpression(expr, deleteSection, variableName = 'head') {
        const values = Serializer.dfsCollectValues(expr);
        const declarations = values.map((val, index) => {
            if (index === values.length - 1) {
                // last
                return `nodes_${variableName}[${index}] = new ListNode(${val});\n`;
            }
            else {
                return `nodes_${variableName}[${index}] = new ListNode(${val}, nodes_${variableName}[${index + 1}]);\n`;
            }
        });
        declarations.reverse();
        let ret = `vector<ListNode *> nodes_${variableName}(${values.length}, nullptr);\n`;
        ret += declarations.join('');
        ret += `ListNode *${variableName} = nodes_${variableName}[0];\n`;
        deleteSection.push('\n');
        deleteSection.push(`for (ListNode *node : nodes_${variableName}) { // このブロックは最後に記述する\n`);
        deleteSection.push('    if (node != nullptr) delete node;\n');
        deleteSection.push('}\n');
        return ret;
    }
}
Serializer.regExpInt = /^\d+$/;
Serializer.regExpString = /^('(?:.*)(?<!\\)'|"(?:.*)(?<!\\)")$/;

void (() => {
    const inputElement = document.getElementById('js-leetcode2cpp-input');
    assertIsDefined(inputElement, 'inputElement');
    assert(inputElement instanceof HTMLTextAreaElement);
    const outputElement = document.getElementById('js-leetcode2cpp-output');
    assertIsDefined(outputElement, 'outputElement');
    assert(outputElement instanceof HTMLTextAreaElement);
    const buttonElement = document.getElementById('js-leetcode2cpp-convert');
    assertIsDefined(buttonElement, 'buttonElement');
    assert(buttonElement instanceof HTMLButtonElement);
    const callMethodCheckbox = document.getElementById('js-leetcode2cpp-call-method');
    assertIsDefined(callMethodCheckbox, 'callMethodCheckbox');
    assert(callMethodCheckbox instanceof HTMLInputElement);
    const intVectorFormatSelect = document.getElementById('js-leetcode2cpp-int-vector-format');
    assertIsDefined(intVectorFormatSelect, 'intVectorFormatSelect');
    assert(intVectorFormatSelect instanceof HTMLSelectElement);
    const copyButtonElement = document.getElementById('js-leetcode2cpp-copy-output');
    assertIsDefined(copyButtonElement, 'copyButtonElement');
    assert(copyButtonElement instanceof HTMLButtonElement);
    buttonElement.addEventListener('click', () => {
        const sampleInputString = inputElement.value;
        const intVectorFormat = intVectorFormatSelect.value;
        assertIsIntVectorFormatType(intVectorFormat);
        const tokens = Tokenizer.tokenize(sampleInputString);
        console.log(tokens);
        const expr = Parser.parseTokens(tokens);
        const serializer = new Serializer(callMethodCheckbox.checked, intVectorFormat);
        const result = serializer.serialize(expr);
        console.log(expr);
        outputElement.value = result;
    });
    copyButtonElement.addEventListener('click', () => {
        void navigator.clipboard.writeText(outputElement.value);
    });
})();
