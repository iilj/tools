import { FollowingOp, Infix, LeadingOp, Paren, Postfix, Prefix, SExpr } from '../lib/Language';
import { assert } from '../lib/utils';

const intVectorFormatTypes = ['normal', 'binary_tree', 'linked_list'] as const;
type IntVectorFormatType = typeof intVectorFormatTypes[number];

export function assertIsIntVectorFormatType(val: string): asserts val is IntVectorFormatType {
    if (val !== 'normal' && val !== 'binary_tree' && val !== 'linked_list') {
        throw new Error(`Expected 'val' to be IntVectorFormatType, but received ${val}`);
    }
}

type RecursiveStringArray = Array<RecursiveStringArray | string>;

export class Serializer {
    appendCallMethod: boolean;
    intVectorFormat: IntVectorFormatType;
    variables: string[];
    private static regExpInt = /^\d+$/;
    private static regExpString = /^('(?:.*)(?<!\\)'|"(?:.*)(?<!\\)")$/;

    constructor(appendCallMethod: boolean, intVectorFormat: IntVectorFormatType) {
        this.appendCallMethod = appendCallMethod;
        this.intVectorFormat = intVectorFormat;
        this.variables = [];
    }

    private serializeInner(expr: SExpr, deleteSection: string[], isVarDefinition = false): string {
        if (isVarDefinition) {
            if (Serializer.regExpInt.test(expr.atom)) {
                const variableName = `num${this.variables.length}`;
                this.variables.push(variableName);
                return `int ${variableName} = ${expr.atom};\n`;
            } else if (Serializer.regExpString.test(expr.atom)) {
                const variableName = `str${this.variables.length}`;
                this.variables.push(variableName);
                return `string ${variableName} = ${expr.atom};\n`;
            } else if (expr.atom === 'paren_sq') {
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
                let rhs: string = this.serializeInner(expr, deleteSection, false);
                if (valtype === 'char') rhs = rhs.replace(/"/g, "'");
                return `${vectorType} ${variableName} = ${rhs};\n`;
            } else {
                return this.serializeInner(expr, deleteSection, false);
            }
        }
        if (expr.operatorRef instanceof LeadingOp) {
            if (expr.operatorRef instanceof Paren) {
                return `{${expr.list
                    .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                    .join(' ')}}`;
            } else if (expr.operatorRef instanceof Prefix) {
                return `${expr.operatorRef.symbols[0]}${expr.list
                    .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                    .join(' ')}`;
            }
        } else if (expr.operatorRef instanceof FollowingOp) {
            if (expr.operatorRef instanceof Postfix) {
                return `${expr.atom}(${expr.operatorRef.symbols[0]}(${expr.list
                    .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                    .join(' ')})`;
            } else if (expr.operatorRef instanceof Infix) {
                const separator = ` ${expr.atom} `;
                if (expr.atom === '=') {
                    this.variables.push(expr.list[0].atom);
                    // 右辺によって型を付与する
                    if (Serializer.regExpInt.test(expr.list[1].atom)) {
                        // num = 123
                        return `int ${expr.list[0].atom} = ${expr.list[1].atom};\n`;
                    } else if (
                        expr.list[1].operatorRef instanceof Prefix &&
                        Serializer.regExpInt.test(expr.list[1].list[0].atom)
                    ) {
                        // num = -123
                        return `int ${expr.list[0].atom} = ${expr.list[1].atom}${expr.list[1].list[0].atom};\n`;
                    } else if (Serializer.regExpString.test(expr.list[1].atom)) {
                        // str = "abc"
                        return `string ${expr.list[0].atom} = ${expr.list[1].atom};\n`;
                    } else if (expr.list[1].atom === 'paren_sq') {
                        // dfs して深さを求める
                        const [depth, valtype] = Serializer.dfsParen(expr.list[1], 0);
                        if (depth == 1 && valtype == 'int') {
                            if (this.intVectorFormat === 'binary_tree') {
                                return Serializer.generateBinaryTreeExpression(
                                    expr.list[1],
                                    deleteSection,
                                    expr.list[0].atom
                                );
                            }
                            if (this.intVectorFormat === 'linked_list') {
                                return Serializer.generateLinkedListExpression(
                                    expr.list[1],
                                    deleteSection,
                                    expr.list[0].atom
                                );
                            }
                        }
                        const vectorType = `${'vector<'.repeat(depth)}${valtype}${'>'.repeat(depth)}`;
                        let rhs: string = this.serializeInner(expr.list[1], deleteSection);
                        if (valtype === 'char') rhs = rhs.replace(/"/g, "'");
                        return `${vectorType} ${expr.list[0].atom} = ${rhs};\n`;
                    }
                } else if (expr.atom === ',') {
                    if (expr.list[1].atom === '=') {
                        // 変数定義同士の間の「,」は変数定義側で「;\n」を付けるので今回は何も付けない
                        return expr.list
                            .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                            .join('');
                    } else {
                        return expr.list
                            .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                            .join(', ');
                    }
                } else if (expr.atom === 'prod') {
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
                            const methodNames: RecursiveStringArray = Serializer.dfsCreateVector(expr.list[0].list[0]);
                            const methodArguments: RecursiveStringArray = Serializer.dfsCreateVector(
                                expr.list[0].list[1]
                            );
                            const methodReturnValues: RecursiveStringArray = Serializer.dfsCreateVector(expr.list[1]);
                            assert(methodNames.length === methodArguments.length);
                            assert(methodNames.length === methodReturnValues.length);

                            let ret = '';
                            for (let i = 0; i < methodNames.length; ++i) {
                                if (i === 0) {
                                    ret += `${Serializer.recursiveStringArrayToString(
                                        methodNames[0],
                                        true
                                    )} obj(${Serializer.recursiveStringArrayToString(methodArguments[0])});\n`;
                                } else {
                                    if (methodReturnValues[i] === 'null') {
                                        // 戻り値なしの呼び出し
                                        ret += `obj.${Serializer.recursiveStringArrayToString(
                                            methodNames[i],
                                            true
                                        )}(${Serializer.recursiveStringArrayToString(methodArguments[i])});\n`;
                                    } else {
                                        // 戻り値ありの呼び出し
                                        ret += `assert(obj.${Serializer.recursiveStringArrayToString(
                                            methodNames[i],
                                            true
                                        )}(${Serializer.recursiveStringArrayToString(
                                            methodArguments[i]
                                        )}) == ${Serializer.recursiveStringArrayToString(methodReturnValues[i])});\n`;
                                    }
                                }
                            }
                            return ret;
                        }
                    }

                    // 後ろのものはここで型を付与して，前のものは再帰的に処理する
                    let ret: string = this.serializeInner(expr.list[0], deleteSection, true);
                    if (Serializer.regExpInt.test(expr.list[1].atom)) {
                        const variableName = `num${this.variables.length}`;
                        this.variables.push(variableName);
                        ret += `int ${variableName} = ${expr.list[1].atom};\n`;
                    } else if (Serializer.regExpString.test(expr.list[1].atom)) {
                        const variableName = `str${this.variables.length}`;
                        this.variables.push(variableName);
                        ret += `string ${variableName} = ${expr.list[1].atom};\n`;
                    } else if (expr.list[1].atom === 'paren_sq') {
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
                        let rhs: string = this.serializeInner(expr.list[1], deleteSection);
                        if (valtype === 'char') rhs = rhs.replace(/"/g, "'");
                        ret += `${vectorType} ${variableName} = ${rhs};\n`;
                    } else {
                        ret += `${this.serializeInner(expr.list[1], deleteSection)};\n`;
                    }
                    return ret;
                }
                return `${expr.list
                    .map((value: SExpr): string => this.serializeInner(value, deleteSection))
                    .join(separator)}`;
            }
        }
        return expr.atom;
    }

    serialize(expr: SExpr): string {
        this.variables = [];
        const deleteSection: string[] = [];
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

    private static dfsParen(expr: SExpr, outerDepth: number): [number, 'char' | 'string' | 'int' | 'unknown'] {
        if (expr.operatorRef === undefined) {
            if (Serializer.regExpInt.test(expr.atom)) {
                return [outerDepth, 'int'];
            } else if (Serializer.regExpString.test(expr.atom)) {
                if (expr.atom.length === 3) {
                    return [outerDepth, 'char'];
                } else {
                    return [outerDepth, 'string'];
                }
            } else {
                return [outerDepth, 'unknown'];
            }
        }
        const currDepth = expr.operatorRef instanceof Paren ? outerDepth + 1 : outerDepth;
        let maxDepth: number = currDepth;
        let valType: 'char' | 'string' | 'int' | 'unknown' = 'unknown';
        expr.list.forEach((childExpr: SExpr) => {
            const [tmpDepth, tmpType] = Serializer.dfsParen(childExpr, currDepth);
            maxDepth = Math.max(maxDepth, tmpDepth);
            if (tmpType !== 'unknown') {
                if (valType === 'string' && tmpType === 'char') {
                    valType === 'string'; // 無視
                } else {
                    valType = tmpType;
                }
            }
        });
        return [maxDepth, valType];
    }

    private static dfsCreateVectorInner(expr: SExpr, curArray: RecursiveStringArray, prefix = ''): void {
        if (expr.operatorRef === undefined) {
            curArray.push(`${prefix}${expr.atom}`);
        }
        if (expr.atom === '-') {
            Serializer.dfsCreateVectorInner(expr.list[0], curArray, expr.atom);
            return;
        }
        if (expr.atom === ',') {
            expr.list.forEach((childExpr: SExpr): void => {
                Serializer.dfsCreateVectorInner(childExpr, curArray);
            });
            return;
        }
        if (expr.atom === 'paren_sq') {
            if (expr.list.length === 0) {
                curArray.push([]);
                return;
            }
            const newArray: RecursiveStringArray = [];
            Serializer.dfsCreateVectorInner(expr.list[0], newArray);
            curArray.push(newArray);
            return;
        }
        return;
    }
    private static dfsCreateVector(expr: SExpr): RecursiveStringArray {
        const ret: RecursiveStringArray = [];
        Serializer.dfsCreateVectorInner(expr, ret);
        return ret[0] as RecursiveStringArray;
    }

    private static recursiveStringArrayToStringInner(
        recursiveStringArray: RecursiveStringArray,
        ret: string[],
        removeQuote: boolean
    ): void {
        recursiveStringArray.forEach((val: string | RecursiveStringArray) => {
            if (typeof val === 'string') {
                if (removeQuote) ret.push(val.substring(1, val.length - 1));
                else ret.push(val);
            } else {
                Serializer.recursiveStringArrayToStringInner(val, ret, removeQuote);
            }
        });
    }
    private static recursiveStringArrayToString(
        recursiveStringArray: string | RecursiveStringArray,
        removeQuote = false
    ): string {
        if (typeof recursiveStringArray === 'string') {
            if (removeQuote) return recursiveStringArray.substring(1, recursiveStringArray.length - 1);
            return recursiveStringArray;
        }
        const ret: string[] = [];
        Serializer.recursiveStringArrayToStringInner(recursiveStringArray, ret, removeQuote);
        return ret.join(', ');
    }

    private static dfsCollectValues(expr: SExpr): string[] {
        if (expr.operatorRef === undefined) {
            return [expr.atom];
        }
        if (expr.atom === '-') {
            return Serializer.dfsCollectValues(expr.list[0]).map((v) => `-${v}`);
        }
        if (expr.atom === ',') {
            const ret: string[] = expr.list.reduce((prevArr: string[], childExpr: SExpr): string[] => {
                return prevArr.concat(Serializer.dfsCollectValues(childExpr));
            }, [] as string[]);
            return ret;
        }
        if (expr.atom === 'paren_sq') {
            if (expr.list.length === 0) return [];
            return Serializer.dfsCollectValues(expr.list[0]);
        }
        return [];
    }

    private static generateBinaryTreeExpression(expr: SExpr, deleteSection: string[], variableName = 'root'): string {
        const values: string[] = Serializer.dfsCollectValues(expr);
        const left: (number | undefined)[] = Array(values.length) as (number | undefined)[];
        const right: (number | undefined)[] = Array(values.length) as (number | undefined)[];
        values.forEach((val: string, index: number): void => {
            if (val == 'null') return;
            if (index % 2 == 1) {
                left[(index - 1) / 2] = index;
            } else {
                right[(index - 2) / 2] = index;
            }
        });
        const declarations: string[] = [];
        values.forEach((val: string, index: number): void => {
            if (val == 'null') return;
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

    private static generateLinkedListExpression(expr: SExpr, deleteSection: string[], variableName = 'head'): string {
        const values: string[] = Serializer.dfsCollectValues(expr);
        const declarations: string[] = values.map((val: string, index: number): string => {
            if (index === values.length - 1) {
                // last
                return `nodes_${variableName}[${index}] = new ListNode(${val});\n`;
            } else {
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
